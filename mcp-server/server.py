"""
Task Manager Cloud MCP server.

Exposes tools for task CRUD, user creation, a tasks list resource,
and a /read [nombre-tarea] prompt template.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Literal

from mcp.server.fastmcp import FastMCP

from auth import generate_pin, hash_pin
from database import format_tasks, get_db

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("task-manager-mcp")

mcp = FastMCP(
    "task-manager-cloud",
    instructions=(
        "MCP server for Task Manager Cloud (Ionic/Angular + Neon Postgres). "
        "Use tools to search, create, edit, and delete tasks. "
        "Use create_user to register a new account (returns a one-time PIN). "
        "Set TASK_MANAGER_PIN in the environment for authenticated task operations, "
        "or pass pin on each tool call."
    ),
)

TaskPriority = Literal["low", "medium", "high"]


def _resolve_user(pin: str | None) -> int:
    return get_db().resolve_user_id(pin)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool(
    name="search_tasks",
    annotations={
        "title": "Search tasks",
        "readOnlyHint": True,
        "openWorldHint": True,
    },
)
def search_tasks(
    query: str | None = None,
    done: bool | None = None,
    priority: TaskPriority | None = None,
    tag: str | None = None,
    pin: str | None = None,
) -> str:
    """Search tasks for the authenticated user.

    Filters match the Angular app: text search on title/description/tags,
    plus optional done, priority, and tag filters. All filters are combined (AND).

    Args:
        query: Free-text search across title, description, and tags.
        done: Filter by completion status (true = done, false = pending).
        priority: Filter by priority (low, medium, high).
        tag: Filter tasks that contain this tag (case-insensitive).
        pin: 4-digit user PIN. Falls back to TASK_MANAGER_PIN env var.
    """
    user_id = _resolve_user(pin)
    tasks = get_db().search_tasks(
        user_id=user_id,
        query=query,
        done=done,
        priority=priority,
        tag=tag,
    )
    if not tasks:
        return "No tasks matched your search criteria."
    return format_tasks(tasks)


@mcp.tool(
    name="create_task",
    annotations={
        "title": "Create task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "openWorldHint": True,
    },
)
def create_task(
    title: str,
    description: str = "",
    done: bool = False,
    priority: TaskPriority = "medium",
    tags: list[str] | None = None,
    pin: str | None = None,
) -> str:
    """Create a new task for the authenticated user.

    Args:
        title: Task title (required).
        description: Optional task description.
        done: Whether the task is already completed.
        priority: Task priority — low, medium, or high.
        tags: Optional list of tag strings.
        pin: 4-digit user PIN. Falls back to TASK_MANAGER_PIN env var.
    """
    user_id = _resolve_user(pin)
    task = get_db().create_task(
        user_id=user_id,
        title=title,
        description=description,
        done=done,
        priority=priority,
        tags=tags,
    )
    return f"Task created successfully:\n{json.dumps(task, indent=2, default=str)}"


@mcp.tool(
    name="edit_task",
    annotations={
        "title": "Edit task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "openWorldHint": True,
    },
)
def edit_task(
    task_id: int,
    title: str | None = None,
    description: str | None = None,
    done: bool | None = None,
    priority: TaskPriority | None = None,
    tags: list[str] | None = None,
    pin: str | None = None,
) -> str:
    """Update an existing task. Only provided fields are changed.

    Args:
        task_id: ID of the task to update.
        title: New title.
        description: New description.
        done: New completion status.
        priority: New priority (low, medium, high).
        tags: Replacement tag list.
        pin: 4-digit user PIN. Falls back to TASK_MANAGER_PIN env var.
    """
    user_id = _resolve_user(pin)
    updates: dict = {}
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if done is not None:
        updates["done"] = done
    if priority is not None:
        updates["priority"] = priority
    if tags is not None:
        updates["tags"] = tags

    task = get_db().update_task(user_id, task_id, updates)
    return f"Task updated successfully:\n{json.dumps(task, indent=2, default=str)}"


@mcp.tool(
    name="delete_task",
    annotations={
        "title": "Delete task",
        "readOnlyHint": False,
        "destructiveHint": True,
        "openWorldHint": True,
    },
)
def delete_task(task_id: int, pin: str | None = None) -> str:
    """Permanently delete a task by ID.

    Args:
        task_id: ID of the task to delete.
        pin: 4-digit user PIN. Falls back to TASK_MANAGER_PIN env var.
    """
    user_id = _resolve_user(pin)
    get_db().delete_task(user_id, task_id)
    return f"Task {task_id} deleted successfully."


@mcp.tool(
    name="create_user",
    annotations={
        "title": "Create user",
        "readOnlyHint": False,
        "destructiveHint": False,
        "openWorldHint": True,
    },
)
def create_user() -> str:
    """Create a new Task Manager Cloud user with a random 4-digit PIN.

    Returns the user ID and PIN. Save the PIN — it is shown only once and
    is required for all subsequent task operations.
    """
    pin = generate_pin()
    pin_hash = hash_pin(pin)
    user = get_db().create_user(pin_hash)
    return (
        f"User created successfully.\n"
        f"  user_id: {user['id']}\n"
        f"  pin: {pin}\n\n"
        f"Save this PIN and set TASK_MANAGER_PIN={pin} in your MCP server config."
    )


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------


@mcp.resource("tasks://list")
def tasks_list_resource() -> str:
    """Full task list for the authenticated user (requires TASK_MANAGER_PIN)."""
    user_id = _resolve_user(None)
    tasks = get_db().list_tasks(user_id)
    return format_tasks(tasks)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------


@mcp.prompt(name="read")
def read_task_prompt(nombre_tarea: str) -> str:
    """Read a task by name — equivalent to /read [nombre-tarea].

    Args:
        nombre_tarea: Exact task title to look up (case-insensitive).
    """
    user_id = _resolve_user(None)
    task = get_db().get_task_by_title(user_id, nombre_tarea)
    if not task:
        return (
            f"No task found with title '{nombre_tarea}'. "
            f"Use search_tasks or the tasks://list resource to browse available tasks."
        )
    return (
        f"Task details for '{task['title']}':\n"
        f"{json.dumps(task, indent=2, default=str)}\n\n"
        f"Summarize this task and suggest next steps if it is still pending."
    )


def main() -> None:
    logger.info("Starting Task Manager Cloud MCP server (stdio)")
    mcp.run()


if __name__ == "__main__":
    main()
