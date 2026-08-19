"""Neon Postgres data access for Task Manager Cloud."""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from auth import (
    AuthError,
    AuthIdentity,
    collect_auth_attempts,
    create_access_token,
    hash_pin,
    jwt_secret,
    lookup_api_key_user_id,
    pin_lookup_key,
    run_auth_attempts,
    session_ttl_seconds,
    verify_access_token,
    verify_pin,
    session_is_active,
)

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

    def resolve_identity(
        self,
        pin: str | None = None,
        token: str | None = None,
        api_key: str | None = None,
    ) -> AuthIdentity:
        """Resolve the caller using JWT, API key, or PIN (first match wins)."""
        return run_auth_attempts(
            collect_auth_attempts(pin=pin, token=token, api_key=api_key),
            verify_jwt=self._identity_from_jwt,
            verify_api_key=self._identity_from_api_key,
            verify_pin=self._identity_from_pin,
        )

    def resolve_user_id(
        self,
        pin: str | None = None,
        token: str | None = None,
        api_key: str | None = None,
    ) -> int:
        """Resolve user id from PIN, JWT, or API key (and matching env vars)."""
        return self.resolve_identity(pin=pin, token=token, api_key=api_key).user_id

    def _identity_from_pin(self, pin: str) -> AuthIdentity:
        return AuthIdentity(user_id=self._lookup_user_id_by_pin(pin), method="pin")

    def _identity_from_jwt(self, token: str) -> AuthIdentity:
        claims = verify_access_token(token)
        self.require_valid_session(claims.user_id, claims.session_id)
        return AuthIdentity(
            user_id=claims.user_id,
            method="jwt",
            session_id=claims.session_id,
        )

    def _identity_from_api_key(self, api_key: str) -> AuthIdentity:
        user_id = lookup_api_key_user_id(api_key)
        if not self.user_exists(user_id):
            raise AuthError("Invalid API key")
        return AuthIdentity(user_id=user_id, method="api_key")

    def _lookup_user_id_by_pin(self, pin: str) -> int:
        lookup = pin_lookup_key(pin)
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
                legacy = hashlib.sha256(pin.encode("utf-8")).hexdigest()
                row = conn.execute(
                    """
                    SELECT id, pin_hash
                    FROM public.users
                    WHERE pin_hash = %s AND pin_lookup IS NULL
                    LIMIT 1
                    """,
                    (legacy,),
                ).fetchone()
        if not row or not verify_pin(pin, row["pin_hash"]):
            raise AuthError("Invalid PIN — no matching user found.")
        return int(row["id"])

    def user_exists(self, user_id: int) -> bool:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT id FROM public.users WHERE id = %s LIMIT 1",
                (user_id,),
            ).fetchone()
        return bool(row)

    def require_valid_session(self, user_id: int, session_id: str) -> dict[str, Any]:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT id, user_id, expires_at, revoked_at
                FROM public.sessions
                WHERE id = %s AND user_id = %s
                LIMIT 1
                """,
                (session_id, user_id),
            ).fetchone()
        if not session_is_active(row):
            raise AuthError("Session expired or revoked")
        return dict(row)

    def issue_session(self, user_id: int) -> dict[str, Any]:
        """Create a sessions row and sign a Nest-compatible JWT."""
        jwt_secret()
        ttl = session_ttl_seconds()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        session_id = str(uuid.uuid4())
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO public.sessions (id, user_id, expires_at)
                VALUES (%s, %s, %s)
                RETURNING id, user_id, expires_at
                """,
                (session_id, user_id, expires_at),
            ).fetchone()
            conn.commit()
        if not row:
            raise RuntimeError("Failed to create session.")
        token = create_access_token(
            user_id=user_id,
            session_id=str(row["id"]),
            expires_at=expires_at,
        )
        return {
            "id": user_id,
            "token": token,
            "expires_at": expires_at.isoformat(),
            "expires_in": ttl,
            "session_id": str(row["id"]),
        }

    def revoke_session(self, user_id: int, session_id: str) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE public.sessions
                SET revoked_at = NOW()
                WHERE id = %s AND user_id = %s AND revoked_at IS NULL
                """,
                (session_id, user_id),
            )
            conn.commit()

    def login_with_pin(self, pin: str) -> dict[str, Any]:
        user_id = self._lookup_user_id_by_pin(pin)
        return self.issue_session(user_id)

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
