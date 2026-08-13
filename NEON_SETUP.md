# Neon + Nest API Setup Guide

This guide sets up Neon Postgres and the NestJS API for Task Cloud.

## Architecture

```
Angular PWA (apps/web) ──HTTP──► NestJS (apps/api) ──► Neon Postgres
MCP server  ────────────────────psycopg────────────────► Neon Postgres
```

`DATABASE_URL` stays server-side only. The browser talks to `/api` (or a full API
URL in production), never to Postgres directly.

Protected `/api` routes require `Authorization: Bearer <jwt>`. Public routes:
`GET /api/health`, `POST /api/users`, `POST /api/auth/login`.

## Prerequisites

- A [Neon](https://console.neon.tech) account (free tier is enough)
- Node.js 20+
- For the MCP server: Python 3.10+ and [uv](https://docs.astral.sh/uv/)

## Step 1: Create a Neon project

1. Open [Neon Console](https://console.neon.tech)
2. Create a project (e.g. `task-cloud`)
3. Copy the connection string (`DATABASE_URL`)

Or use Neon MCP from Cursor after authenticating the Neon server.

## Step 2: Apply the schema

Run `neon-migration.sql` in the Neon SQL Editor, via `neonctl`, or with Neon MCP
`run_sql` / `run_sql_transaction`.

You should end up with `public.users` and `public.tasks`. Auth sessions /
`pin_lookup` are ensured at Nest API startup (see also `neon-auth-migration.sql`).

## Step 3: Configure the monorepo

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
API_BASE_URL=/api
API_PORT=3001
JWT_SECRET= # openssl rand -hex 32
PIN_PEPPER= # openssl rand -hex 32
ALLOWED_ORIGINS=https://task-cloud.netlify.app,http://localhost:4200
SESSION_TTL_SECONDS=86400
TASK_MANAGER_PIN=
```

Generate Angular env files:

```bash
pnpm run config
```

## Step 4: Local development

Terminal A — Nest API:

```bash
pnpm api
```

Terminal B — Angular (proxies `/api` → `localhost:3001`):

```bash
pnpm start
```

Or both:

```bash
pnpm start:full
```

## Step 5: Deploy (Vercel, single project)

See **[VERCEL.md](./VERCEL.md)**. Import the repo as one Vercel project (Root
Directory = repo root) and set these env vars:

- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `PIN_PEPPER` (required)

Optional: `SESSION_TTL_SECONDS`, `AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW_MS`.
`API_BASE_URL` defaults to `/api` (same origin), so leave it unset.

## Step 6: MCP server

```bash
cd mcp-server
cp .env.example .env   # or reuse root .env DATABASE_URL
uv sync
uv run server.py
```

## Verify

1. Open the app → Options → create account (save the PIN)
2. Add / edit / delete tasks
3. Reload — session should restore via stored token
4. Optional: `pnpm test:api` against a running API
