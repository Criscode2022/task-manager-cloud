"""Neon Postgres data access for Task Manager Cloud."""

from __future__ import annotations

import json
import os
from typing import Any, Literal

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from auth import hash_pin, pin_lookup_key, verify_pin

TaskPriority = Literal["low", "medium", "high"]

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class TaskManagerDB:
    """Thin wrapper around Neon/Postgres for tasks and users."""

    def __init__(self) -> None:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL must be set in the environment.")
        self._pool = ConnectionPool(
            conninfo=database_url,
            kwargs={"row_factory": dict_row},
            min_size=1,
            max_size=5,
            open=True,
        )

    def resolve_user_id(self, pin: str | None = None) -> int:
        """Resolve user id from an explicit PIN or TASK_MANAGER_PIN env var."""
        effective_pin = pin or os.environ.get("TASK_MANAGER_PIN")
        if not effective_pin:
            raise ValueError(
                "No PIN provided. Set TASK_MANAGER_PIN in the environment or pass pin to the tool."
            )
        lookup = pin_lookup_key(effective_pin)
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT id, pin_hash
                FROM public.users
                WHERE pin_lookup = %s
                LIMIT 1
                """,
                (lookup,),
            ).fetchone()
            if not row:
                # Legacy SHA-256 accounts without pin_lookup
                import hashlib

                legacy = hashlib.sha256(effective_pin.encode("utf-8")).hexdigest()
                row = conn.execute(
                    """
                    SELECT id, pin_hash
                    FROM public.users
                    WHERE pin_hash = %s AND pin_lookup IS NULL
                    LIMIT 1
                    """,
                    (legacy,),
                ).fetchone()
        if not row or not verify_pin(effective_pin, row["pin_hash"]):
            raise ValueError("Invalid PIN — no matching user found.")
        return int(row["id"])

    def verify_user_pin(self, user_id: int, pin: str) -> bool:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT pin_hash FROM public.users WHERE id = %s LIMIT 1",
                (user_id,),
            ).fetchone()
        if not row:
            return False
        return verify_pin(pin, row["pin_hash"])

    def list_tasks(self, user_id: int) -> list[dict[str, Any]]:
        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM public.tasks
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
        return [self._normalize_task(row) for row in rows]

    def search_tasks(
        self,
        user_id: int,
        query: str | None = None,
        done: bool | None = None,
        priority: TaskPriority | None = None,
        tag: str | None = None,
    ) -> list[dict[str, Any]]:
        tasks = self.list_tasks(user_id)
        results = tasks

        if query:
            needle = query.casefold()
            results = [
                task
                for task in results
                if needle in (task.get("title") or "").casefold()
                or needle in (task.get("description") or "").casefold()
                or any(needle in (t or "").casefold() for t in task.get("tags") or [])
            ]

        if done is not None:
            results = [task for task in results if bool(task.get("done")) is done]

        if priority is not None:
            results = [task for task in results if task.get("priority") == priority]

        if tag:
            tag_needle = tag.casefold()
            results = [
                task
                for task in results
                if any(tag_needle in (t or "").casefold() for t in task.get("tags") or [])
            ]

        return results

    def get_task_by_title(self, user_id: int, title: str) -> dict[str, Any] | None:
        needle = title.casefold()
        for task in self.list_tasks(user_id):
            if (task.get("title") or "").casefold() == needle:
                return task
        return None

    def get_task_by_id(self, user_id: int, task_id: int) -> dict[str, Any] | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM public.tasks
                WHERE id = %s AND user_id = %s
                LIMIT 1
                """,
                (task_id, user_id),
            ).fetchone()
        return self._normalize_task(row) if row else None

    def create_task(
        self,
        user_id: int,
        title: str,
        description: str = "",
        done: bool = False,
        priority: TaskPriority = "medium",
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO public.tasks (
                    user_id, title, description, done, priority, tags, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (user_id, title, description, done, priority, tags or []),
            ).fetchone()
            conn.commit()
        if not row:
            raise RuntimeError("Failed to create task.")
        return self._normalize_task(row)

    def update_task(
        self,
        user_id: int,
        task_id: int,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        allowed = {"title", "description", "done", "priority", "tags"}
        payload = {k: v for k, v in updates.items() if k in allowed and v is not None}
        if not payload:
            raise ValueError("No valid fields to update.")

        current = self.get_task_by_id(user_id, task_id)
        if not current:
            raise RuntimeError(f"Task {task_id} not found for this user.")

        merged = {
            "title": payload.get("title", current["title"]),
            "description": payload.get("description", current["description"]),
            "done": payload.get("done", current["done"]),
            "priority": payload.get("priority", current["priority"]),
            "tags": payload.get("tags", current["tags"]),
        }

        with self._pool.connection() as conn:
            row = conn.execute(
                """
                UPDATE public.tasks
                SET
                    title = %s,
                    description = %s,
                    done = %s,
                    priority = %s,
                    tags = %s,
                    updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                (
                    merged["title"],
                    merged["description"],
                    merged["done"],
                    merged["priority"],
                    merged["tags"],
                    task_id,
                    user_id,
                ),
            ).fetchone()
            conn.commit()
        if not row:
            raise RuntimeError(f"Task {task_id} not found for this user.")
        return self._normalize_task(row)

    def delete_task(self, user_id: int, task_id: int) -> None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                DELETE FROM public.tasks
                WHERE id = %s AND user_id = %s
                RETURNING id
                """,
                (task_id, user_id),
            ).fetchone()
            conn.commit()
        if not row:
            raise RuntimeError(f"Task {task_id} not found for this user.")

    def create_user(self, pin: str) -> dict[str, Any]:
        pin_hash = hash_pin(pin)
        lookup = pin_lookup_key(pin)
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO public.users (pin_hash, pin_lookup)
                VALUES (%s, %s)
                RETURNING id, created_at
                """,
                (pin_hash, lookup),
            ).fetchone()
            conn.commit()
        if not row:
            raise RuntimeError("Failed to create user.")
        return {
            "id": int(row["id"]),
            "created_at": row["created_at"],
        }

    @staticmethod
    def _normalize_task(row: dict[str, Any] | None) -> dict[str, Any]:
        if not row:
            return {}
        return {
            "id": int(row["id"]),
            "user_id": int(row["user_id"]),
            "title": row["title"],
            "description": row.get("description") or "",
            "done": bool(row.get("done")),
            "priority": row.get("priority") or "medium",
            "tags": list(row.get("tags") or []),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }


_db: TaskManagerDB | None = None


def get_db() -> TaskManagerDB:
    global _db
    if _db is None:
        _db = TaskManagerDB()
    return _db


def format_tasks(tasks: list[dict[str, Any]]) -> str:
    return json.dumps(tasks, indent=2, default=str)
