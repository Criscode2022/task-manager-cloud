# AGENTS.md

## Cursor Cloud specific instructions

Task Cloud is a **Turborepo monorepo**:

- `apps/web` — Angular 19 + Ionic 8 PWA for personal task management. Tasks work
  fully offline via Ionic Storage (create / edit / complete / delete / filter).
- `apps/api` — NestJS backend on Neon Postgres for optional cloud sync
  (PIN-based user + JWT sessions + upload/download of tasks).
- `mcp-server/` — optional auxiliary Python MCP server (FastMCP + `uv`) that talks
  to the same Neon database. Not part of the frontend/API npm workspaces.

Core task features do not need the API; only cloud sync does.

### Environment config (important, non-obvious)

- Root `.env` (from `.env.example`) holds `DATABASE_URL`, auth secrets, and
  `API_BASE_URL`. Both the Nest API and the web `set-env` script read this file.
- `npm start` / web `build` run `apps/web/scripts/set-env.js`, which generates the
  gitignored `apps/web/src/environments/environment.local.ts` and
  `environment.prod.local.ts`. Angular `fileReplacements` swaps `environment.ts`
  for these generated files.
- A root `.env` is **required** for local web config generation. If it is missing,
  `set-env.js` copies `.env.example` to `.env` and then exits with code 1 — run
  `npm run config` (or `npm start`) again once `.env` exists.
- Locally, `API_BASE_URL=/api` and `apps/web/proxy.conf.json` proxies to Nest on
  `API_PORT` (default `3001`). In production, set `API_BASE_URL` to the full Nest
  API URL (e.g. `https://your-api.example.com/api`).

### Running / testing / linting

From the **repo root** (npm workspaces + Turborepo):

- Install: `npm install` (prefer over `npm ci` if the lockfile drifts).
- Nest API: `npm run api` (http://localhost:3001/api/health).
- Web dev server: `npm start` (http://localhost:4200, proxies `/api`).
- Both: `npm run start:full` (turbo).
- Unit tests (web): `CHROME_BIN=/usr/local/bin/google-chrome npm run test:ci`
  Headless Chrome works without a `--no-sandbox` flag in this environment.
- Lint (web): `npm run lint:ci`.
- API smoke test (needs running API + real DB secrets): `npm run test:api`.

### Dependencies

- Use `npm install` at the repo root. Workspaces: `apps/web`, `apps/api`.
- If `package-lock.json` drifts, prefer `npm install` over `npm ci`.
