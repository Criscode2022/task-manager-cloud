# @task-cloud/api

NestJS backend for Task Cloud. Replaces the former Netlify Functions + `server/*.mjs` HTTP handler.

## Routes (global prefix `/api`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api`, `/api/health` | — | Health check |
| POST | `/api/users` | — | Register with `{ pin }` |
| POST | `/api/auth/login` | — | Login with `{ pin }` |
| POST | `/api/auth/logout` | Bearer | Revoke session |
| GET | `/api/auth/me` | Bearer | Current user |
| GET/DELETE | `/api/users/:id` | Bearer | Self only |
| GET/POST/DELETE | `/api/tasks` | Bearer | List / create / delete all |
| POST | `/api/tasks/bulk` | Bearer | Bulk upload |
| PUT/DELETE | `/api/tasks/:id` | Bearer | Update / delete one |

## Dev

Boot fails if `DATABASE_URL`, `JWT_SECRET` (32+ chars) or `PIN_PEPPER` (32+ chars) are missing. Task payloads only accept `title`, `description`, `done`, `priority`, `tags`.

From repo root (loads root `.env`):

```bash
pnpm api
# or
pnpm --filter @task-cloud/api start:dev
```

Smoke test (API must be running with real `DATABASE_URL` + secrets):

```bash
pnpm test:api
```

## Vercel

Deployed as part of the single-project monorepo deploy: the root `api/index.js`
serverless entry wraps this app's compiled `dist` output. Shared configuration
lives in `src/app.setup.ts` (`configureApp`). See `/VERCEL.md` at the repo root.
