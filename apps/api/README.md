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

From repo root (loads root `.env`):

```bash
npm run api
# or
npm run start:dev -w @task-cloud/api
```

Smoke test (API must be running with real `DATABASE_URL` + secrets):

```bash
npm run test:api
```
