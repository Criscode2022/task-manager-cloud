"""Supabase data access for Task Manager Cloud."""

from __future__ import annotations

import json
import os
from typing import Any, Literal

from dotenv import load_dotenv
from supabase import Client, create_client

from auth import hash_pin, verify_pin

TaskPriority = Literal["low", "medium", "high"]

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class TaskManagerDB:
    """Thin wrapper around Supabase PostgREST for tasks and users."""

    def __init__(self) -> None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment."
            )
        self._client: Client = create_client(url, key)

    def resolve_user_id(self, pin: str | None = None) -> int:
        """Resolve user id from an explicit PIN or TASK_MANAGER_PIN env var."""
        effective_pin = pin or os.environ.get("TASK_MANAGER_PIN")
        if not effective_pin:
            raise ValueError(
                "No PIN provided. Set TASK_MANAGER_PIN in the environment or pass pin to the tool."
            )
        pin_hash = hash_pin(effective_pin)
        response = (
            self._client.table("users")
            .select("id")
            .eq("pin_hash", pin_hash)
            .single()
            .execute()
        )
        if not response.data:
            raise ValueError("Invalid PIN — no matching user found.")
        return int(response.data["id"])

    def verify_user_pin(self, user_id: int, pin: str) -> bool:
        response = (
            self._client.table("users")
            .select("pin_hash")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not response.data:
            return False
        return verify_pin(pin, response.data["pin_hash"])

    def list_tasks(self, user_id: int) -> list[dict[str, Any]]:
        response = (
            self._client.table("tasks")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

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
        response = (
            self._client.table("tasks")
            .select("*")
            .eq("id", task_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return response.data

    def create_task(
        self,
        user_id: int,
        title: str,
        description: str = "",
        done: bool = False,
        priority: TaskPriority = "medium",
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "title": title,
            "description": description,
            "done": done,
            "priority": priority,
            "tags": tags or [],
        }
        response = self._client.table("tasks").insert(payload).select().single().execute()
        if not response.data:
            raise RuntimeError("Failed to create task.")
        return response.data

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

        response = (
            self._client.table("tasks")
            .update(payload)
            .eq("id", task_id)
            .eq("user_id", user_id)
            .select()
            .single()
            .execute()
        )
        if not response.data:
            raise RuntimeError(f"Task {task_id} not found for this user.")
        return response.data

    def delete_task(self, user_id: int, task_id: int) -> None:
        response = (
            self._client.table("tasks")
            .delete()
            .eq("id", task_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise RuntimeError(f"Task {task_id} not found for this user.")

    def create_user(self, pin_hash: str) -> dict[str, Any]:
        response = (
            self._client.table("users")
            .insert({"pin_hash": pin_hash})
            .select()
            .single()
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to create user.")
        return response.data


_db: TaskManagerDB | None = None


def get_db() -> TaskManagerDB:
    global _db
    if _db is None:
        _db = TaskManagerDB()
    return _db


def format_tasks(tasks: list[dict[str, Any]]) -> str:
    return json.dumps(tasks, indent=2, default=str)
