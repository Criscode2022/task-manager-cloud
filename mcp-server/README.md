# Task Manager Cloud — MCP Server

Python [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Task Manager Cloud](../README.MD). It lets AI assistants (Cursor, Claude Desktop, and other MCP hosts) search, create, edit, and delete tasks, manage users, and read task context — all against the same Supabase database as the Ionic/Angular PWA.

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

Task Manager Cloud is a frontend-only Ionic/Angular app that stores tasks in Supabase. This MCP server exposes that data and functionality to LLM clients through three MCP primitives:

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
| Tool | `create_user` | Register a new user (returns a one-time 4-digit PIN) |
| Resource | `tasks://list` | JSON list of all tasks for the authenticated user |
| Prompt | `read` | `/read [nombre-tarea]` — look up a task by title |

---

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────┐     PostgREST    ┌──────────────┐
│  MCP Host       │ ◄────────────► │  server.py       │ ◄──────────────► │  Supabase    │
│  (Cursor, etc.) │   JSON-RPC     │  (FastMCP)       │   supabase-py    │  PostgreSQL  │
└─────────────────┘                └────────┬─────────┘                  └──────────────┘
                                            │
                                   ┌────────┴─────────┐
                                   │  database.py     │  Supabase queries
                                   │  auth.py         │  SHA-256 PIN hashing
                                   └──────────────────┘
```

The server runs as a **stdio** process. The host spawns it, communicates over stdin/stdout, and the server talks to Supabase using the same anon key and tables as the Angular app (`users`, `tasks`).

Search is performed **client-side** after fetching the user's tasks — the same approach as the Angular `tab-list` component. This keeps filter behavior consistent between the app and the MCP server.

---

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| Python | 3.10+ (project uses 3.14 via uv) |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | Package manager and virtualenv |
| Supabase project | Same project configured in the Angular app |
| Task Manager PIN | 4-digit PIN from the app or `create_user` tool |

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

This creates a `.venv` and installs `mcp[cli]`, `supabase`, and `python-dotenv`.

### 2. Configure environment

The server loads env vars from **two locations** (in order):

1. `mcp-server/.env`
2. Project root `.env` (shared with the Angular app)

```bash
cp .env.example .env
```

Fill in your Supabase credentials. You can copy them from the app root `.env` or from **Supabase Dashboard → Settings → API**.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
TASK_MANAGER_PIN=1234
```

> `TASK_MANAGER_PIN` is optional at first. You can obtain it by calling `create_user` or by logging into the PWA (Options tab → the PIN shown when you create an account).

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

1. Call **`create_user`** → receive `user_id` and a 4-digit PIN.
2. Add `TASK_MANAGER_PIN=<pin>` to `.env` (or pass `pin` on each tool call).
3. Call **`create_task`** to add a task.
4. Use **`search_tasks`** or the **`tasks://list`** resource to verify.
5. Use the **`read`** prompt with the task title.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | **Yes** | — | Supabase project URL, e.g. `https://abc.supabase.co` |
| `SUPABASE_ANON_KEY` | **Yes** | — | Supabase anon/public JWT key (starts with `eyJ`) |
| `TASK_MANAGER_PIN` | For task ops | — | 4-digit PIN for the authenticated user |

**Where to set them:**

| Context | How |
|---------|-----|
| Local dev | `mcp-server/.env` or project root `.env` |
| Cursor | `.env` files (loaded automatically) or Cursor **Settings → MCP → Env** |
| Claude Desktop | `env` block inside `claude_desktop_config.json` |

---

## Authentication

The Angular app does **not** use Supabase Auth. Instead, each user gets a random 4-digit PIN that is hashed with SHA-256 and stored in the `users.pin_hash` column. The MCP server uses the same scheme (`auth.py`).

```
User PIN "4821"
    │
    ▼ SHA-256
pin_hash "a3f2..."  ──►  users table
    │
    ▼ lookup
user_id 42  ──►  tasks filtered by user_id
```

### Resolving identity

Every task tool and the `tasks://list` resource need a user identity. The server resolves it in this order:

1. `pin` argument passed to the tool (if provided)
2. `TASK_MANAGER_PIN` environment variable
3. Error if neither is set

`create_user` is the only tool that does **not** require a PIN — it creates a new account.

### Using an existing app account

If you already have a user in the PWA, enter the same 4-digit PIN as `TASK_MANAGER_PIN`. The MCP server will resolve the same `user_id` and operate on the same tasks visible in the app.

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
| `pin` | `string` | No | 4-digit PIN; falls back to `TASK_MANAGER_PIN` |

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
| `pin` | `string` | No | — | 4-digit PIN |

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
| `pin` | `string` | No | 4-digit PIN |

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
| `pin` | `string` | No | 4-digit PIN |

**Returns:** Confirmation message.

> Annotated with `destructiveHint: true` so MCP clients can show a warning before execution.

---

### `create_user`

Create a new Task Manager Cloud account. No PIN required.

**Parameters:** none

**Returns:**

```
User created successfully.
  user_id: 42
  pin: 7391

Save this PIN and set TASK_MANAGER_PIN=7391 in your MCP server config.
```

> The PIN is shown **only once**. Store it immediately — there is no recovery mechanism.

After creation, set `TASK_MANAGER_PIN` in your `.env` or pass the PIN on subsequent tool calls.

---

## Resources reference

Resources provide read-only context that MCP hosts can load into the model's window.

### `tasks://list`

Returns the complete task list for the authenticated user as a JSON array, ordered by `created_at` descending (newest first).

**Requires:** `TASK_MANAGER_PIN` set in the environment (no `pin` parameter on resources).

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

1. Resolves the user via `TASK_MANAGER_PIN`.
2. Finds the first task whose title matches `nombre_tarea` (case-insensitive).
3. Returns task JSON plus an instruction to summarize and suggest next steps.

**If not found:** Returns a helpful message pointing to `search_tasks` or `tasks://list`.

**Example usage in an MCP host:**

Select the `read` prompt and pass `nombre_tarea = "Buy milk"`.

Equivalent to the slash command: `/read Buy milk`

---

## Data model

The MCP server reads and writes the same Supabase tables as the Angular app.

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` | Auto-increment primary key |
| `pin_hash` | `text` | SHA-256 hex digest of the 4-digit PIN |
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

Schema source: [`supabase-migration-clean.sql`](../supabase-migration-clean.sql)

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
2. Configure `.env` with Supabase credentials and `TASK_MANAGER_PIN`.
3. Restart Cursor (or reload MCP servers from **Settings → MCP**).
4. The `task-manager-cloud` server should appear with 5 tools, 1 resource, and 1 prompt.

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
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "eyJ...",
        "TASK_MANAGER_PIN": "1234"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

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
uv run python -c "from auth import hash_pin; print(hash_pin('1234'))"
```

The output must match what the Angular `PinHashService` produces for the same PIN.

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
├── database.py        # Supabase client, queries, search logic
├── auth.py            # PIN generation and SHA-256 hashing
├── pyproject.toml     # uv project manifest
├── uv.lock            # Locked dependency versions
├── .env.example       # Environment variable template
├── .gitignore
└── README.md          # This file
```

| File | Responsibility |
|------|----------------|
| `server.py` | MCP protocol surface — decorators register tools/resources/prompts |
| `database.py` | All Supabase I/O; loads `.env` from `mcp-server/` and project root |
| `auth.py` | Cryptographic PIN handling, compatible with the Angular app |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `SUPABASE_URL and SUPABASE_ANON_KEY must be set` | Missing env vars | Create `.env` with valid Supabase credentials |
| `No PIN provided` | `TASK_MANAGER_PIN` not set | Call `create_user` or set the PIN in `.env` |
| `Invalid PIN — no matching user found` | Wrong PIN | Verify the 4-digit PIN from account creation |
| `Task N not found for this user` | Wrong `task_id` or different user | Use `search_tasks` or `tasks://list` to find the correct ID |
| Server not appearing in Cursor | `uv` not on PATH or MCP not reloaded | Install uv, restart Cursor, check **Settings → MCP** logs |
| `uv: command not found` | uv not installed | Follow the [uv install guide](https://docs.astral.sh/uv/getting-started/installation/) |
| Empty task list | New user with no tasks | Call `create_task` or create tasks in the PWA first |
| Changes not visible in PWA | Different user/PIN | Ensure both app and MCP use the same PIN |

### Checking MCP server logs in Cursor

Open **Cursor Settings → MCP**, select `task-manager-cloud`, and inspect the server output panel for stderr log lines prefixed with `task-manager-mcp`.

---

## Security notes

- **PIN is the only credential.** Treat `TASK_MANAGER_PIN` like a password. Do not commit it to git.
- **Anon key exposure.** The Supabase anon key is designed for client-side use, but RLS policies in this project are permissive (`USING (true)`). Anyone with the anon key can read/write all rows. PIN verification happens in application code, not at the database level.
- **`.env` is gitignored.** Both `mcp-server/.env` and the project root `.env` are excluded from version control.
- **`create_user` PIN is one-time.** The server returns the plaintext PIN once. If lost, create a new user or use the PWA to manage tasks under a new account.
- **Delete is permanent.** `delete_task` removes the row from Supabase with no soft-delete or undo.

---

## Related documentation

- [Task Manager Cloud README](../README.MD) — Angular/Ionic app overview
- [Supabase setup guide](../SUPABASE_SETUP.md) — Database provisioning
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — Framework reference
- [uv documentation](https://docs.astral.sh/uv/) — Package manager
