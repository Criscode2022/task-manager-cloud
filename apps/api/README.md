# @task-cloud/api

NestJS backend for Task Cloud. Replaces the former Netlify Functions + `server/*.mjs` HTTP handler.

## Routes (global prefix `/api`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api`, `/api/health` | — | Health check |
| POST | `/api/users` | — | Register with `{ pin }` |
| POST | `/api/auth/login` | — | Login with `{ pin }` |
| GET | `/api/users/by-pin/:hash` | — | Retired: answers 410 Gone, pointing to `POST /api/auth/login` |
| POST | `/api/auth/logout` | Bearer | Revoke session |
| GET | `/api/auth/me` | Bearer | Current user |
| GET/DELETE | `/api/users/:id` | Bearer | Self only |
| GET/POST/DELETE | `/api/tasks` | Bearer | List / create / delete all |
| POST | `/api/tasks/bulk` | Bearer | Bulk upload |
| PUT/DELETE | `/api/tasks/:id` | Bearer | Update / delete one |

## Dev

Boot fails if `DATABASE_URL`, `JWT_SECRET` (32+ chars) or `PIN_PEPPER` (32+ chars) are missing. Task payloads only accept `title`, `description`, `done`, `priority`, `tags`.

Auth is a global guard; public routes use `@Public()`. Rate limits are in memory per instance: 100 requests per minute overall, and 10 per IP every 15 minutes on register and login.

From repo root (loads root `.env`):

```bash
pnpm api
# or
pnpm --filter @task-cloud/api start:dev
```

## Tests

From the repo root:

```bash
pnpm test:api           # unit tests (Vitest): PIN, JWT, guard, ownership
pnpm test:integration   # HTTP integration (Supertest), database faked
```

Smoke test against real Neon (the API must be running with a real `DATABASE_URL` and secrets):

```bash
pnpm --filter @task-cloud/api test:api
```

## Vercel

Deployed as part of the single-project monorepo deploy: the root `api/index.js`
serverless entry wraps this app's compiled `dist` output. Shared configuration
lives in `src/app.setup.ts` (`configureApp`). See `/VERCEL.md` at the repo root.
