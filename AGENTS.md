# AGENTS.md

## Cursor Cloud specific instructions

Task Cloud is a **Turborepo monorepo**:

- `apps/web` — Angular 22 + Ionic 8 PWA for personal task management. Tasks work
  fully offline via Ionic Storage (create / edit / complete / delete / filter).
- `apps/api` — NestJS backend on Neon Postgres for optional cloud sync
  (PIN-based user + JWT sessions + upload/download of tasks).
- `mcp-server/` — optional auxiliary Python MCP server (FastMCP + `uv`) that talks
  to the same Neon database. Not part of the frontend/API pnpm workspaces.

Core task features do not need the API; only cloud sync does.

### Environment config (important, non-obvious)

- Root `.env` (from `.env.example`) holds `DATABASE_URL`, auth secrets, and
  `API_BASE_URL`. Both the Nest API and the web `set-env` script read this file.
- `pnpm start` / web `build` run `apps/web/scripts/set-env.js`, which generates the
  gitignored `apps/web/src/environments/environment.local.ts` and
  `environment.prod.local.ts`. Angular `fileReplacements` swaps `environment.ts`
  for these generated files.
- A root `.env` is **required** for local web config generation. If it is missing,
  `set-env.js` copies `.env.example` to `.env` and then exits with code 1 — run
  `pnpm run config` (or `pnpm start`) again once `.env` exists.
- Locally, `API_BASE_URL=/api` and `apps/web/proxy.conf.json` proxies to Nest on
  `API_PORT` (default `3001`). On Vercel the app deploys as a **single project**
  (root `vercel.json`): static web + `/api/*` serverless function from
  `api/index.js` wrapping the compiled `apps/api/dist`. Same origin, so
  `API_BASE_URL` stays `/api`. See `VERCEL.md`.

### Running / testing / linting

From the **repo root** (pnpm workspaces + Turborepo):

- Install: `pnpm install` (prefer over `pnpm install --frozen-lockfile` if the lockfile drifts).
- Nest API: `pnpm api` (http://localhost:3001/api/health).
- Web dev server: `pnpm start` (http://localhost:4200, proxies `/api`).
- Both: `pnpm start:full` (turbo).
- Unit tests (web): `CHROME_BIN=/usr/local/bin/google-chrome pnpm test:ci`
  Headless Chrome works without a `--no-sandbox` flag in this environment.
- Lint (web): `pnpm lint:ci`.
- API smoke test (needs running API + real DB secrets): `pnpm test:api`.

### Dependencies

- Use `pnpm install` at the repo root. Workspaces: `apps/web`, `apps/api`.
- If `pnpm-lock.yaml` drifts, prefer `pnpm install` over `--frozen-lockfile`.

### Agent skills

- Angular: `.claude/skills/angular/`
- NestJS: `.claude/skills/nestjs/` — modules, DI, DTO/validation, guards, testing. Apply when changing `apps/api`.
