"""
Task Manager Cloud MCP server.

Exposes tools for task CRUD, user creation, multi-method auth
(PIN, JWT, API key), a tasks list resource, and a /read prompt.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Literal

from mcp.server.auth.routes import create_auth_routes, create_protected_resource_routes
from mcp.server.auth.settings import ClientRegistrationOptions, RevocationOptions
from mcp.server.fastmcp import Context, FastMCP
from pydantic import AnyHttpUrl
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from auth import AuthError, AuthIdentity, generate_pin
from database import format_tasks, get_db
from oauth import MCP_SCOPE, PinOAuthProvider, oauth_enabled, os_public_url, os_transport

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("task-manager-mcp")

_public_url = os_public_url()
oauth_provider = PinOAuthProvider(_public_url) if oauth_enabled() and _public_url else None

_http_transport = os_transport() in {"http", "streamable-http", "streamable_http"}
mcp = FastMCP(
    "task-manager-cloud",
    instructions=(
        "MCP server for Task Manager Cloud (Ionic/Angular + Neon Postgres). "
        "Use tools to search, create, edit, and delete tasks. "
        "All login methods stay available: PIN, JWT, API key, HTTP Bearer, "
        "and OAuth PIN page. Never require one method if another is valid. "
        "create_user registers a new account. login(pin) issues a JWT."
    ),
    host=os.environ.get("MCP_HOST", "0.0.0.0" if _http_transport else "127.0.0.1"),
    port=int(os.environ.get("MCP_PORT", "8000")),
    stateless_http=os.environ.get("MCP_STATELESS_HTTP", "true").lower()
    in {"1", "true", "yes"},
)


def attach_optional_oauth_routes(
    server: FastMCP,
    provider: PinOAuthProvider,
    public_url: str,
) -> None:
    """Publish OAuth endpoints without locking /mcp to a single auth method.

    FastMCP's auth= / auth_server_provider= wrap /mcp in RequireAuthMiddleware,
    which would drop No-authentication and the login tool. Routes are added as
    public extras instead so OAuth, Bearer, and PIN all remain usable.
    """
    issuer = AnyHttpUrl(public_url)
    server._custom_starlette_routes.extend(
        create_auth_routes(
            provider=provider,
            issuer_url=issuer,
            client_registration_options=ClientRegistrationOptions(
                enabled=True,
                valid_scopes=[MCP_SCOPE],
                default_scopes=[MCP_SCOPE],
            ),
            revocation_options=RevocationOptions(enabled=True),
        )
    )
    server._custom_starlette_routes.extend(
        create_protected_resource_routes(
            resource_url=AnyHttpUrl(f"{public_url}/mcp"),
            authorization_servers=[issuer],
            scopes_supported=[MCP_SCOPE],
        )
    )


if oauth_provider is not None and _public_url is not None:
    attach_optional_oauth_routes(mcp, oauth_provider, _public_url)

TaskPriority = Literal["low", "medium", "high"]


def _authorization_from_context(ctx: Context | None) -> str | None:
    if ctx is None:
        return None
    try:
        request = ctx.request_context.request
    except ValueError:
        return None
    if request is None:
        return None
    headers = getattr(request, "headers", None)
    if headers is None:
        return None
    getter = getattr(headers, "get", None)
    if callable(getter):
        return getter("authorization") or getter("Authorization")
    if isinstance(headers, dict):
        return headers.get("authorization") or headers.get("Authorization")
    return None


def _resolve_identity(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
    ctx: Context | None = None,
) -> AuthIdentity:
    return get_db().resolve_identity(
        pin=pin,
        token=token,
        api_key=api_key,
        authorization=_authorization_from_context(ctx),
    )


def _resolve_user(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
    ctx: Context | None = None,
) -> int:
    return _resolve_identity(pin=pin, token=token, api_key=api_key, ctx=ctx).user_id


def _format_session(session: dict) -> str:
    return (
        f"Authenticated successfully.\n"
        f"  user_id: {session['id']}\n"
        f"  token: {session['token']}\n"
        f"  expires_at: {session['expires_at']}\n"
        f"  expires_in: {session['expires_in']}\n\n"
        f"Paste this JWT in your MCP client as Method → Bearer token "
        f"(do not include the word Bearer). Then Save & Connect.\n"
        f"The same token works as Authorization: Bearer on the Nest API, "
        f"or as TASK_MANAGER_TOKEN / the token tool argument."
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
    ctx: Context | None = None,
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
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
    ctx: Context | None = None,
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
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
    ctx: Context | None = None,
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
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
    ctx: Context | None = None,
) -> str:
    """Permanently delete a task by ID.

    Args:
        task_id: ID of the task to delete.
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    user_id = _resolve_user(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
    """Exchange a PIN for a JWT. Does not require prior authentication.

    Use this first on HTTP MCP clients: connect with Method → No authentication,
    call login, then paste the returned token as Method → Bearer token.

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
    ctx: Context | None = None,
) -> str:
    """Revoke the current JWT session. PIN and API-key identities have no session to revoke.

    Args:
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    identity = _resolve_identity(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
    ctx: Context | None = None,
) -> str:
    """Return the authenticated user id and which credential method succeeded.

    Args:
        pin: 8-digit user PIN. Falls back to TASK_MANAGER_PIN.
        token: JWT access token. Falls back to TASK_MANAGER_TOKEN.
        api_key: Static MCP API key. Falls back to MCP_API_KEY.
    """
    identity = _resolve_identity(pin=pin, token=token, api_key=api_key, ctx=ctx)
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
def tasks_list_resource(ctx: Context | None = None) -> str:
    """Full task list for the authenticated user (env or Bearer credentials)."""
    user_id = _resolve_user(ctx=ctx)
    tasks = get_db().list_tasks(user_id)
    return format_tasks(tasks)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------


@mcp.prompt(name="read")
def read_task_prompt(nombre_tarea: str, ctx: Context | None = None) -> str:
    """Read a task by name — equivalent to /read [nombre-tarea].

    Args:
        nombre_tarea: Exact task title to look up (case-insensitive).
    """
    user_id = _resolve_user(ctx=ctx)
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


@mcp.custom_route("/health", methods=["GET"])
async def health(_request: Request) -> Response:
    return JSONResponse({"ok": True, "oauth": oauth_provider is not None})


if oauth_provider is not None:

    @mcp.custom_route("/login", methods=["GET", "POST"])
    async def oauth_login(request: Request) -> Response:
        assert oauth_provider is not None
        if request.method == "GET":
            state = request.query_params.get("state") or ""
            return await oauth_provider.get_login_page(state)
        return await oauth_provider.handle_login_callback(request)


def main() -> None:
    transport = os.environ.get("MCP_TRANSPORT", "stdio").strip().lower()
    if transport in {"http", "streamable-http", "streamable_http"}:
        if oauth_provider is None:
            logger.info(
                "HTTP MCP is up without OAuth routes. PIN, JWT, and API key "
                "still work. Set MCP_PUBLIC_URL to also offer the PIN login page."
            )
        logger.info(
            "Starting Task Manager Cloud MCP server (streamable-http) on %s:%s/mcp",
            mcp.settings.host,
            mcp.settings.port,
        )
        mcp.run(transport="streamable-http")
        return
    logger.info("Starting Task Manager Cloud MCP server (stdio)")
    mcp.run()


if __name__ == "__main__":
    main()
