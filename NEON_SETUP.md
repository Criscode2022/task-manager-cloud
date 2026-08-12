# Neon Integration Setup Guide

This guide sets up Neon Postgres as the database backend for Task Cloud.

## Architecture

```
Angular PWA ──HTTP──► Netlify Functions (/api/*) ──► Neon Postgres
MCP server  ──────────────────psycopg────────────────► Neon Postgres
```

`DATABASE_URL` stays server-side only. The browser talks to `/api`, never to Postgres directly.

Protected `/api` routes require an `X-Pin-Hash` header that matches the user. Public routes: `GET /api/health`, `POST /api/users`, `GET /api/users/by-pin/:hash`.

## Prerequisites

- A [Neon](https://console.neon.tech) account (free tier is enough)
- Node.js 18+
- For the MCP server: Python 3.10+ and [uv](https://docs.astral.sh/uv/)

## Step 1: Create a Neon project

1. Open [Neon Console](https://console.neon.tech)
2. Create a project (e.g. `task-cloud`)
3. Copy the connection string (`DATABASE_URL`)

Or use Neon MCP from Cursor after authenticating the Neon server.

## Step 2: Apply the schema

Run `neon-migration.sql` in the Neon SQL Editor, via `neonctl`, or with Neon MCP `run_sql` / `run_sql_transaction`.

You should end up with `public.users` and `public.tasks`.

## Step 3: Configure the app

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
API_BASE_URL=/api
API_PORT=3001
TASK_MANAGER_PIN=
```

Generate Angular env files:

```bash
npm run config
```

## Step 4: Local development

Terminal A — Neon API:

```bash
npm run api
```

Terminal B — Angular (proxies `/api` → `localhost:3001`):

```bash
npm start
```

Or both:

```bash
npm run start:full
```

## Step 5: Netlify deploy

Set `DATABASE_URL` in **Netlify → Site settings → Environment variables** (all contexts that need the API).

`API_BASE_URL` defaults to `/api` via `netlify.toml`.

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
3. Reload — session should restore via stored PIN hash
4. Optional: `curl http://localhost:3001/api/health`

## Migrating away from Supabase

Old Supabase SQL files remain for reference (`supabase-migration*.sql`, `SUPABASE_SETUP.md`). New installs should use `neon-migration.sql` only.

If you still have data in Supabase, export `users` / `tasks` and import into Neon (same column shapes).
