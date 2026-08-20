# Task Manager Cloud — MCP Server

Python [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Task Manager Cloud](../README.MD). It lets AI assistants (Cursor, Claude Desktop, and other MCP hosts) search, create, edit, and delete tasks, manage users, and read task context — all against the same Neon Postgres database as the Ionic/Angular PWA.

Built with the [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) (`FastMCP`) and managed with [uv](https://docs.astral.sh/uv/).

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Authentication](#authentication)
- [Tools reference](#tools-reference)
- [Resources reference](#resources-reference)
- [Prompts reference](#prompts-reference)
- [Data model](#data-model)
- [IDE integration](#ide-integration)
- [Development & debugging](#development--debugging)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

---

## Overview

Task Manager Cloud is an Ionic/Angular app that stores tasks in Neon Postgres via a NestJS API. This MCP server connects to the same Neon database through three MCP primitives:

| Primitive | Purpose | Who invokes it |
|-----------|---------|----------------|
| **Tools** | Actions with side effects (CRUD, user creation) | The model, with user approval |
| **Resources** | Read-only context (full task list) | The host application |
| **Prompts** | Reusable templates (`/read [nombre-tarea]`) | The user, from a menu |

### Capabilities at a glance

| Type | Name | Description |
|------|------|-------------|
| Tool | `search_tasks` | Search/filter tasks by text, status, priority, tag |
| Tool | `create_task` | Create a new task |
| Tool | `edit_task` | Partially update an existing task |
| Tool | `delete_task` | Permanently delete a task by ID |
| Tool | `create_user` | Register a new user (returns a one-time 8-digit PIN + JWT) |
| Tool | `login` | Exchange a PIN for a Nest-compatible JWT session |
| Tool | `logout` | Revoke the current JWT session |
| Tool | `whoami` | Show the authenticated user id and which method succeeded |
| Resource | `tasks://list` | JSON list of all tasks for the authenticated user |
| Prompt | `read` | `/read [nombre-tarea]` — look up a task by title |

---

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────┐     psycopg      ┌──────────────┐
│  MCP Host       │ ◄────────────► │  server.py       │ ◄──────────────► │  Neon        │
│  (Cursor, etc.) │   JSON-RPC     │  (FastMCP)       │                  │  PostgreSQL  │
└─────────────────┘                └────────┬─────────┘                  └──────────────┘
                                            │
                                   ┌────────┴─────────┐
                                   │  database.py     │  Neon SQL queries
                                   │  auth.py         │  PIN + JWT + API keys
                                   └──────────────────┘
```

The server runs as a **stdio** process. The host spawns it, communicates over stdin/stdout, and the server talks to Neon using `DATABASE_URL` and the same tables as the Angular app (`users`, `tasks`, `sessions`).

Search is performed **client-side** after fetching the user's tasks — the same approach as the Angular `tab-list` component. This keeps filter behavior consistent between the app and the MCP server.

---

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| Python | 3.10+ (project uses 3.14 via uv) |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | Package manager and virtualenv |
| Neon project | Same `DATABASE_URL` configured for the Angular/Netlify API |
| Task Manager credentials | 8-digit PIN, Nest JWT, or MCP API key |

Install uv (if needed):

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

## Quick start

### 1. Install dependencies

```bash
cd mcp-server
uv sync
```

This creates a `.venv` and installs `mcp[cli]`, `psycopg`, `psycopg-pool`, `pyjwt`, `bcrypt`, and `python-dotenv`. Dev extras (`pytest`) are included with `uv sync --group dev`.

### 2. Configure environment

The server loads env vars from **two locations** (in order):

1. `mcp-server/.env`
2. Project root `.env` (shared with the Angular app)

```bash
cp .env.example .env
```

Fill in your Neon `DATABASE_URL`. You can copy it from the app root `.env` or from **Neon Console → Connection Details**.

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
PIN_PEPPER=replace-with-another-long-random-secret
JWT_SECRET=replace-with-long-random-secret
TASK_MANAGER_PIN=12345678
```

> Credentials are optional at first. Call `create_user` to obtain a PIN (and a JWT when `JWT_SECRET` is set), or reuse the PIN / token from the PWA.

### 3. Verify the server starts

```bash
uv run server.py
```

The process blocks waiting for stdio input — that is expected. Press `Ctrl+C` to stop.

### 4. Test with MCP Inspector

```bash
uv run mcp dev server.py
```

Opens a browser UI where you can list tools, call `create_user`, and inspect responses interactively.

### 5. Typical first-run flow

1. Call **`create_user`** → receive `user_id`, an 8-digit PIN, and (if `JWT_SECRET` is set) a JWT.
2. Add `TASK_MANAGER_PIN=<pin>` and/or `TASK_MANAGER_TOKEN=<jwt>` to `.env` (or pass `pin` / `token` / `api_key` on each tool call).
3. Call **`create_task`** to add a task.
4. Use **`search_tasks`** or the **`tasks://list`** resource to verify.
5. Use the **`read`** prompt with the task title.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | Neon Postgres connection string |
| `PIN_PEPPER` | For PIN auth | — | HMAC pepper shared with the Nest API |
| `JWT_SECRET` | For JWT auth | — | HS256 secret shared with the Nest API |
| `SESSION_TTL_SECONDS` | No | `86400` | JWT session lifetime |
| `TASK_MANAGER_PIN` | One of PIN / JWT / API key | — | 8-digit PIN for the authenticated user |
| `TASK_MANAGER_TOKEN` | One of PIN / JWT / API key | — | Nest-compatible JWT (`sub` + `sid`) |
| `MCP_API_KEY` | One of PIN / JWT / API key | — | Static API key |
| `MCP_API_KEY_USER_ID` | With `MCP_API_KEY` | — | User id bound to `MCP_API_KEY` |
| `MCP_API_KEYS` | No | — | JSON object or `key:user_id,...` list |
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `streamable-http` (remote HTTP clients) |
| `MCP_HOST` | No | `127.0.0.1` | Bind address for HTTP |
| `MCP_PORT` | No | `8000` | Listen port for HTTP (`/mcp`) |

**Where to set them:**

| Context | How |
|---------|-----|
| Local dev | `mcp-server/.env` or project root `.env` |
| Cursor | `.env` files (loaded automatically) or Cursor **Settings → MCP → Env** |
| Claude Desktop | `env` block inside `claude_desktop_config.json` |

---

## Authentication

Every login method stays available. The server never turns one on by disabling another. It tries credentials in order and uses the first that verifies:

| Method | How the client sends it | Who it is for |
|--------|-------------------------|---------------|
| **PIN** | Tool arg `pin` or `TASK_MANAGER_PIN` | Original stdio / Cursor setup; assistant clients |
| **JWT** | Tool arg `token`, `TASK_MANAGER_TOKEN`, or `Authorization: Bearer` | Nest/PWA sessions; `login` tool result |
| **API key** | Tool arg `api_key`, `MCP_API_KEY`, or Bearer | Machine / CI clients |
| **OAuth + PIN page** | Client Method → OAuth; user types PIN at `/login` | Connect-only HTTP clients (no assistant) |
| **No HTTP auth** | Client Method → No authentication | Clients that will call `login` or pass `pin` on tools |

```
token / api_key / pin          (tool args)
Authorization: Bearer …        (JWT or API key)
TASK_MANAGER_TOKEN / MCP_API_KEY / TASK_MANAGER_PIN
        │
        ▼ first match
user_id  ──►  tasks filtered by user_id
```

`create_user` and `login` do not require prior credentials. `create_user` returns a PIN and, when `JWT_SECRET` is set, a session token. `login` is the MCP equivalent of `POST /api/auth/login`.

`/mcp` is **not** locked behind OAuth. OAuth routes (`/authorize`, `/token`, `/login`, well-known metadata) are extra endpoints. Pick the method that matches the client.

### HTTP client: OAuth (no assistant)

1. Server URL: `https://your-host/mcp`
2. Method: **OAuth (recommended)**
3. Allow local HTTP: off
4. **Save & Connect** — the client opens `/login`
5. Enter your 8-digit PIN and tap **Sign in**

### HTTP client: Bearer token

1. Method: **Bearer token**
2. Paste a JWT from `login`, the PWA, or `POST /api/auth/login` — or an API key
3. Do not include the word `Bearer`

### HTTP client: No authentication + `login` tool

1. Method: **No authentication**
2. Call `login` with the PIN (assistant or any tool runner)
3. Optionally switch to Bearer and paste the JWT

Hosted process (all of the above work together):

```env
MCP_TRANSPORT=streamable-http
MCP_PUBLIC_URL=https://your-host
MCP_HOST=0.0.0.0
PORT=8000
DATABASE_URL=...
PIN_PEPPER=...
JWT_SECRET=...
```

`MCP_PUBLIC_URL` is the public origin (no `/mcp`). It must be `https://` except on localhost. Omit it to skip OAuth endpoints; PIN, JWT, and API key still work.

### Using an existing app account

Reuse the PWA PIN as `TASK_MANAGER_PIN`, or paste the app's JWT as `TASK_MANAGER_TOKEN`. Both resolve to the same `user_id` and the same tasks.

### API keys

For machine-to-machine access without embedding a PIN or JWT:

```env
MCP_API_KEY=replace-with-long-random-api-key
MCP_API_KEY_USER_ID=42
```

Multiple keys:

```env
MCP_API_KEYS=alice-secret:1,bob-secret:2
# or JSON:
MCP_API_KEYS={"alice-secret": 1, "bob-secret": 2}
```

---

## Tools reference

### `search_tasks`

Read-only search across the authenticated user's tasks. All filters are combined with **AND** logic.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | No | Free-text search in title, description, and tags (case-insensitive) |
| `done` | `boolean` | No | `true` = completed, `false` = pending |
| `priority` | `"low"` \| `"medium"` \| `"high"` | No | Filter by priority |
| `tag` | `string` | No | Filter tasks containing this tag (case-insensitive) |
| `pin` | `string` | No | 8-digit PIN; falls back to `TASK_MANAGER_PIN` |
| `token` | `string` | No | JWT; falls back to `TASK_MANAGER_TOKEN` |
| `api_key` | `string` | No | Static key; falls back to `MCP_API_KEY` |

**Returns:** JSON array of matching tasks, or a message if none match.

**Example prompts to the model:**

> "Search my pending high-priority tasks"
> → `search_tasks(done=false, priority="high")`

> "Find tasks about groceries"
> → `search_tasks(query="groceries")`

---

### `create_task`

Create a new task for the authenticated user.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | `string` | **Yes** | — | Task title |
| `description` | `string` | No | `""` | Task description |
| `done` | `boolean` | No | `false` | Completion status |
| `priority` | `"low"` \| `"medium"` \| `"high"` | No | `"medium"` | Priority level |
| `tags` | `string[]` | No | `[]` | List of tag strings |
| `pin` | `string` | No | — | 8-digit PIN / JWT `token` / `api_key` |

**Returns:** The created task as JSON (includes auto-generated `id` and `created_at`).

**Example:**

```json
{
  "title": "Buy milk",
  "description": "From the corner store",
  "priority": "low",
  "tags": ["shopping", "errands"]
}
```

---

### `edit_task`

Partially update an existing task. Only fields you pass are changed; omitted fields stay as-is.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | `integer` | **Yes** | ID of the task to update |
| `title` | `string` | No | New title |
| `description` | `string` | No | New description |
| `done` | `boolean` | No | New completion status |
| `priority` | `"low"` \| `"medium"` \| `"high"` | No | New priority |
| `tags` | `string[]` | No | **Replaces** the entire tag list |
| `pin` / `token` / `api_key` | `string` | No | Optional credentials; see [Authentication](#authentication) |

**Returns:** The updated task as JSON.

**Example prompts:**

> "Mark task 7 as done"
> → `edit_task(task_id=7, done=true)`

> "Change task 3 priority to high and add tag 'urgent'"
> → `edit_task(task_id=3, priority="high", tags=["urgent"])`

---

### `delete_task`

Permanently delete a task. This cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | `integer` | **Yes** | ID of the task to delete |
| `pin` / `token` / `api_key` | `string` | No | Optional credentials; see [Authentication](#authentication) |

**Returns:** Confirmation message.

> Annotated with `destructiveHint: true` so MCP clients can show a warning before execution.

---

### `create_user`

Create a new Task Manager Cloud account. No prior credentials required.

**Parameters:** none

**Returns:**

```
User created successfully.
  user_id: 42
  pin: 73918264
  token: eyJhbGciOiJIUzI1NiJ9...
  expires_at: 2026-08-20T00:00:00+00:00

Save the PIN (shown only once). Authenticate later with pin, token, or an API key mapped to this user_id.
```

If `JWT_SECRET` is unset, the PIN is still returned and you can call `login` after configuring the secret.

> The PIN is shown **only once**. Store it immediately — there is no recovery mechanism.

---

### `login`

Exchange a PIN for a JWT session token. **Does not require prior authentication.** Compatible with `POST /api/auth/login` (same `sessions` row and HS256 claims).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | `string` | **Yes** | 8-digit user PIN |

**Returns:** `user_id`, `token`, `expires_at`, `expires_in`, plus instructions to paste the token as the HTTP client's **Bearer token**.

---

### `logout`

Revoke the current JWT session. PIN and API-key identities have no session to revoke.

---

### `whoami`

Return `{ user_id, method, session_id }` for the credential that succeeded (`jwt`, `api_key`, or `pin`).

---

## Resources reference

Resources provide read-only context that MCP hosts can load into the model's window.

### `tasks://list`

Returns the complete task list for the authenticated user as a JSON array, ordered by `created_at` descending (newest first).

**Requires:** one of `TASK_MANAGER_PIN`, `TASK_MANAGER_TOKEN`, or `MCP_API_KEY` in the environment (resources cannot take tool arguments).

**Example output:**

```json
[
  {
    "id": 12,
    "user_id": 42,
    "title": "Buy milk",
    "description": "From the corner store",
    "done": false,
    "priority": "low",
    "tags": ["shopping"],
    "created_at": "2026-07-13T10:30:00+00:00",
    "updated_at": "2026-07-13T10:30:00+00:00"
  }
]
```

Use this resource when the model needs full task context without making individual search calls.

---

## Prompts reference

Prompts are user-invoked templates that produce a structured message for the model.

### `read` — `/read [nombre-tarea]`

Look up a task by its **exact title** (case-insensitive match) and return a summary prompt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nombre_tarea` | `string` | **Yes** | Task title to look up |

**Behavior:**

1. Resolves the user via env credentials (PIN, JWT, or API key).
2. Finds the first task whose title matches `nombre_tarea` (case-insensitive).
3. Returns task JSON plus an instruction to summarize and suggest next steps.

**If not found:** Returns a helpful message pointing to `search_tasks` or `tasks://list`.

**Example usage in an MCP host:**

Select the `read` prompt and pass `nombre_tarea = "Buy milk"`.

Equivalent to the slash command: `/read Buy milk`

---

## Data model

The MCP server reads and writes the same Neon tables as the Angular app.

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` | Auto-increment primary key |
| `pin_hash` | `text` | bcrypt (or legacy SHA-256) of the 8-digit PIN |
| `pin_lookup` | `text` | HMAC-SHA256 lookup key (`PIN_PEPPER`) |
| `created_at` | `timestamptz` | Account creation timestamp |

### `tasks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` | Auto-increment primary key |
| `user_id` | `bigint` | FK → `users.id` (cascade delete) |
| `title` | `text` | Task title (required) |
| `description` | `text` | Optional description |
| `done` | `boolean` | Completion status (default `false`) |
| `priority` | `text` | `low`, `medium`, or `high` (default `medium`) |
| `tags` | `text[]` | Array of tag strings (default `[]`) |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp (auto-set by trigger) |

Schema source: [`neon-migration.sql`](../neon-migration.sql), [`neon-auth-migration.sql`](../neon-auth-migration.sql)

### `sessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Session id (`sid` JWT claim) |
| `user_id` | `bigint` | FK → `users.id` |
| `expires_at` | `timestamptz` | Token expiry |
| `revoked_at` | `timestamptz` | Set on logout |

---

## IDE integration

### Cursor

The repo ships a ready-made config at [`.cursor/mcp.json`](../.cursor/mcp.json):

```json
{
  "mcpServers": {
    "task-manager-cloud": {
      "command": "uv",
      "args": [
        "--directory",
        "${workspaceFolder}/mcp-server",
        "run",
        "server.py"
      ]
    }
  }
}
```

**Steps:**

1. Ensure `uv` is on your PATH.
2. Configure `.env` with `DATABASE_URL` plus at least one auth method (`TASK_MANAGER_PIN`, `TASK_MANAGER_TOKEN`, or `MCP_API_KEY`).
3. Restart Cursor (or reload MCP servers from **Settings → MCP**).
4. The `task-manager-cloud` server should appear with 8 tools, 1 resource, and 1 prompt.

### Claude Desktop

Add to `claude_desktop_config.json` (path varies by OS):

```json
{
  "mcpServers": {
    "task-manager-cloud": {
      "command": "uv",
      "args": [
        "--directory",
        "C:/Users/YOU/Documents/task-manager-cloud/mcp-server",
        "run",
        "server.py"
      ],
      "env": {
        "DATABASE_URL": "postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require",
        "PIN_PEPPER": "replace-with-another-long-random-secret",
        "JWT_SECRET": "replace-with-long-random-secret",
        "TASK_MANAGER_PIN": "12345678"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---



## Railway deploy

The HTTP MCP service is `mcp-server/` (`Dockerfile` + `railway.toml`).

1. Create a Railway service from this GitHub repo.
2. Set **Root Directory** to `mcp-server`.
3. Variables: `DATABASE_URL`, `PIN_PEPPER`, `JWT_SECRET`.
4. Railway sets `PORT` and `RAILWAY_PUBLIC_DOMAIN`. The server listens on `PORT` and uses that domain as `MCP_PUBLIC_URL` unless you override it.
5. Health check: `GET /health`. MCP endpoint: `/mcp`.

Optional: set `MCP_PUBLIC_URL` to a custom domain origin (no `/mcp` suffix).

## Development & debugging

### Run the server directly

```bash
uv run server.py
```

Logs are written to **stderr** (stdio transports JSON-RPC on stdout — never log to stdout).

### MCP Inspector

```bash
uv run mcp dev server.py
```

Use this to:

- List and invoke all tools interactively
- Browse resources and prompts
- Inspect request/response payloads

### Verify auth hashing

```bash
uv run python -c "from auth import hash_pin; print(hash_pin('12345678'))"
```

The bcrypt hash is compatible with the Nest API `pin.util` helper (same `PIN_PEPPER` lookup).

### Run unit tests

```bash
uv sync --group dev
uv run pytest
```

### Sync dependencies after changes

```bash
uv sync
```

### Add a new dependency

```bash
uv add <package-name>
```

---

## Project structure

```
mcp-server/
├── server.py          # FastMCP server — tools, resources, prompts
├── database.py        # Neon queries, sessions, identity resolution
├── auth.py            # PIN, JWT, API keys, multi-method resolver
├── tests/             # pytest coverage for auth and tool wiring
├── pyproject.toml     # uv project manifest
├── uv.lock            # Locked dependency versions
├── .env.example       # Environment variable template
├── .gitignore
└── README.md          # This file
```

| File | Responsibility |
|------|----------------|
| `server.py` | MCP protocol surface — decorators register tools/resources/prompts |
| `database.py` | All Neon/Postgres I/O; loads `.env` from `mcp-server/` and project root |
| `auth.py` | PIN / JWT / API-key helpers and first-match credential resolution |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `DATABASE_URL must be set` | Missing env vars | Create `.env` with a valid Neon connection string |
| `No credentials provided` | No PIN, JWT, or API key | Call `create_user` / `login`, or set `TASK_MANAGER_PIN`, `TASK_MANAGER_TOKEN`, or `MCP_API_KEY` |
| `Invalid PIN — no matching user found` | Wrong PIN | Verify the 8-digit PIN from account creation |
| `Invalid or expired token` / `Session expired or revoked` | Bad JWT | Call `login` again; confirm `JWT_SECRET` matches the Nest API |
| `Invalid API key` | Unknown key or missing user | Check `MCP_API_KEY` / `MCP_API_KEYS` and that the user id exists |
| `Task N not found for this user` | Wrong `task_id` or different user | Use `search_tasks` or `tasks://list` to find the correct ID |
| Server not appearing in Cursor | `uv` not on PATH or MCP not reloaded | Install uv, restart Cursor, check **Settings → MCP** logs |
| `uv: command not found` | uv not installed | Follow the [uv install guide](https://docs.astral.sh/uv/getting-started/installation/) |
| Empty task list | New user with no tasks | Call `create_task` or create tasks in the PWA first |
| Changes not visible in PWA | Different user/PIN | Ensure both app and MCP use the same PIN |

### Checking MCP server logs in Cursor

Open **Cursor Settings → MCP**, select `task-manager-cloud`, and inspect the server output panel for stderr log lines prefixed with `task-manager-mcp`.

---

## Security notes

- **Treat every credential as a secret.** PIN, JWT, and API keys are equivalent to passwords. Do not commit them to git.
- **JWT sessions are revocable.** `logout` sets `sessions.revoked_at`. Stolen tokens stop working after expiry or revoke.
- **API keys are env-configured.** They are not stored in the database; rotate by changing env vars.
- **Database URL secrecy.** Keep `DATABASE_URL` server-side only (Vercel / MCP env). The browser never receives it.
- **`.env` is gitignored.** Both `mcp-server/.env` and the project root `.env` are excluded from version control.
- **`create_user` PIN is one-time.** The server returns the plaintext PIN once. If lost, create a new user or use the PWA to manage tasks under a new account.
- **Delete is permanent.** `delete_task` removes the row from Neon with no soft-delete or undo.

---

## Related documentation

- [Task Manager Cloud README](../README.MD) — Angular/Ionic app overview
- [Neon setup guide](../NEON_SETUP.md) — Database provisioning
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — Framework reference
- [uv documentation](https://docs.astral.sh/uv/) — Package manager
