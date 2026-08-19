"""
Task Manager Cloud MCP server.

Exposes tools for task CRUD, user creation, multi-method auth
(PIN, JWT, API key), a tasks list resource, and a /read prompt.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Literal

from mcp.server.fastmcp import FastMCP

from auth import AuthError, AuthIdentity, generate_pin
from database import format_tasks, get_db

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("task-manager-mcp")

mcp = FastMCP(
    "task-manager-cloud",
    instructions=(
        "MCP server for Task Manager Cloud (Ionic/Angular + Neon Postgres). "
        "Use tools to search, create, edit, and delete tasks. "
        "Use create_user to register a new account (returns a one-time PIN). "
        "Use login to exchange a PIN for a JWT session token. "
        "Authenticate with any of: pin (or TASK_MANAGER_PIN), "
        "token (or TASK_MANAGER_TOKEN), or api_key (or MCP_API_KEY). "
        "JWT tokens are the same HS256 sessions issued by the Nest API."
    ),
)

TaskPriority = Literal["low", "medium", "high"]


def _resolve_identity(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
) -> AuthIdentity:
    return get_db().resolve_identity(pin=pin, token=token, api_key=api_key)


def _resolve_user(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
) -> int:
    return _resolve_identity(pin=pin, token=token, api_key=api_key).user_id


def _format_session(session: dict) -> str:
    return (
        f"Authenticated successfully.\n"
        f"  user_id: {session['id']}\n"
        f"  token: {session['token']}\n"
        f"  expires_at: {session['expires_at']}\n"
        f"  expires_in: {session['expires_in']}\n\n"
        f"Set TASK_MANAGER_TOKEN to this JWT, or pass token on later tool calls. "
        f"The same token works as Authorization: Bearer on the Nest API."
    )


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
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Search tasks for the authenticated user.

    Filters match the Angular app: text search on title/description/tags,
    plus optional done, priority, and tag filters. All filters are combined (AND).

    Args:
        query: Free-text search across title, description, and tags.
        done: Filter by completion status (true = done, false = pending).
        priority: Filter by priority (low, medium, high).
        tag: Filter tasks that contain this tag (case-insensitive).
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key)
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
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Create a new task for the authenticated user.

    Args:
        title: Task title (required).
        description: Optional task description.
        done: Whether the task is already completed.
        priority: Task priority — low, medium, or high.
        tags: Optional list of tag strings.
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key)
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
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Update an existing task. Only provided fields are changed.

    Args:
        task_id: ID of the task to update.
        title: New title.
        description: New description.
        done: New completion status.
        priority: New priority (low, medium, high).
        tags: Replacement tag list.
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key)
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
def delete_task(
    task_id: int,
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Permanently delete a task by ID.

    Args:
        task_id: ID of the task to delete.
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key)
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
    """Create a new Task Manager Cloud user with a random 8-digit PIN.

    Returns the user ID, PIN, and a JWT session token. Save the PIN — it is
    shown only once. The token is the same format as POST /api/auth/login.
    """
    pin = generate_pin()
    db = get_db()
    user = db.create_user(pin)
    try:
        session = db.issue_session(int(user["id"]))
    except AuthError as exc:
        logger.warning("Created user %s but could not issue JWT: %s", user["id"], exc)
        return (
            f"User created successfully.\n"
            f"  user_id: {user['id']}\n"
            f"  pin: {pin}\n\n"
            f"Save this PIN. Set TASK_MANAGER_PIN={pin} or call login(pin) after "
            f"configuring JWT_SECRET to obtain a session token."
        )
    return (
        f"User created successfully.\n"
        f"  user_id: {user['id']}\n"
        f"  pin: {pin}\n"
        f"  token: {session['token']}\n"
        f"  expires_at: {session['expires_at']}\n\n"
        f"Save the PIN (shown only once). Authenticate later with pin, "
        f"token, or an API key mapped to this user_id."
    )


@mcp.tool(
    name="login",
    annotations={
        "title": "Login with PIN",
        "readOnlyHint": False,
        "destructiveHint": False,
        "openWorldHint": True,
    },
)
def login(pin: str) -> str:
    """Exchange a PIN for a JWT session token (same as POST /api/auth/login).

    Args:
        pin: 8-digit user PIN.
    """
    session = get_db().login_with_pin(pin)
    return _format_session(session)


@mcp.tool(
    name="logout",
    annotations={
        "title": "Logout",
        "readOnlyHint": False,
        "destructiveHint": False,
        "openWorldHint": True,
    },
)
def logout(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Revoke the current JWT session. PIN and API-key identities have no session to revoke.

    Args:
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    identity = _resolve_identity(pin=pin, token=token, api_key=api_key)
    if identity.method != "jwt" or not identity.session_id:
        return (
            f"Authenticated via {identity.method}; nothing to revoke. "
            "Logout only revokes JWT sessions."
        )
    get_db().revoke_session(identity.user_id, identity.session_id)
    return f"Session revoked for user {identity.user_id}."


@mcp.tool(
    name="whoami",
    annotations={
        "title": "Who am I",
        "readOnlyHint": True,
        "openWorldHint": True,
    },
)
def whoami(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
) -> str:
    """Return the authenticated user id and which credential method succeeded.

    Args:
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    identity = _resolve_identity(pin=pin, token=token, api_key=api_key)
    payload = {
        "user_id": identity.user_id,
        "method": identity.method,
        "session_id": identity.session_id,
    }
    return json.dumps(payload, indent=2)


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------


@mcp.resource("tasks://list")
def tasks_list_resource() -> str:
    """Full task list for the authenticated user (env credentials)."""
    user_id = _resolve_user()
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
    user_id = _resolve_user()
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
