# Deploy Task Cloud on Vercel (single project)

The whole Turborepo deploys as **one Vercel project**:

- `apps/web` builds to static files (`apps/web/www`) served by Vercel's CDN
- `apps/api` (NestJS) compiles to `apps/api/dist` and runs as **one serverless
  function** via the root `api/index.js` entry
- `/api/*` is rewritten to the function; everything else falls back to the SPA
- Frontend and API share the same origin, so no CORS configuration is needed in
  production and the web `API_BASE_URL` can stay at its default `/api`

Everything is wired in the root `vercel.json`.

## 1. Import the repo

1. Open [vercel.com/new](https://vercel.com/new) and import this Git repository.
2. Leave **Root Directory** at the repository root (do not select a subfolder).
3. Framework preset: **Other** (the root `vercel.json` provides build/output
   settings — build command `turbo run build` for both apps, output
   `apps/web/www`).

## 2. Set environment variables

Project → Settings → Environment Variables (Production + Preview):

| Name | Required | Notes |
|------|----------|-------|
| `DATABASE_URL` | yes | Neon connection string |
| `JWT_SECRET` | yes | `openssl rand -hex 32` |
| `PIN_PEPPER` | yes | `openssl rand -hex 32` |
| `SESSION_TTL_SECONDS` | no | default `86400` |
| `AUTH_RATE_LIMIT` / `AUTH_RATE_WINDOW_MS` | no | default `10` / `900000` |
| `API_BASE_URL` | no | defaults to `/api` (same origin) — leave unset |
| `ALLOWED_ORIGINS` | no | only needed if another origin must call the API |

## 3. Deploy

Push to the connected branch (or click **Deploy**). Vercel runs:

```
npm install
npx turbo run build --filter=@task-cloud/web --filter=@task-cloud/api
```

and publishes the static PWA plus the `/api/*` function.

## 4. Smoke checks

- `GET https://<project>.vercel.app/api/health` → `{ "ok": true, "service": "task-cloud-nest-api" }`
- Open `https://<project>.vercel.app` → Options → register (8-digit PIN) → sync tasks

## How the API function works

`api/index.js` boots the compiled Nest app (`apps/api/dist`) with an Express
adapter, caches it across warm invocations, and serves every `/api/*` request.
`apps/api/src/app.setup.ts` (`configureApp`) holds the shared pipes / filters /
prefix so the serverless entry and the standalone server (`main.ts`) behave
identically.

Notes:

- Rate limiting is in-memory per function instance (best-effort, as before).
- The function has `maxDuration: 30` and includes `apps/api/dist/**` via
  `vercel.json` → `functions`.
- Turborepo Remote Caching is enabled automatically for Vercel-linked repos.

## Local development (unchanged)

```bash
npm run api    # Nest on :3001
npm start      # Angular on :4200, proxies /api
```
