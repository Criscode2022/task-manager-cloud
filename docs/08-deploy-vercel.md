---
title: Deploy Vercel (Turborepo)
---

# Deploy en Vercel (un solo proyecto)

## Idea

- `apps/web` → estáticos en CDN (`apps/web/www`)
- `apps/api` → función serverless vía `api/index.js` (incluye `apps/api/dist/**`)
- `/api/*` reescrito a la función; el resto a la SPA

## Config (`vercel.json`)

- `buildCommand`: `npx turbo run build --filter=@task-cloud/web --filter=@task-cloud/api`
- `outputDirectory`: `apps/web/www`
- `functions.api/index.js.maxDuration`: 30
- Rewrites: `/api/:path*` → `/api/index`; resto → `/index.html`

## Variables de entorno

| Nombre | Requerido | Notas |
|--------|-----------|--------|
| `DATABASE_URL` | sí | Connection string Neon |
| `JWT_SECRET` | sí | `openssl rand -hex 32` |
| `PIN_PEPPER` | sí | `openssl rand -hex 32` |
| `SESSION_TTL_SECONDS` | no | default 86400 |
| `API_BASE_URL` | no | default `/api` (same origin) |

## Smoke

1. `GET https://task-manager-cristiancode.vercel.app/api/health`
2. Abrir la web → Options → registrar PIN → crear/sync tareas

## Local

```bash
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, PIN_PEPPER
npm run api            # :3001
npm start              # :4200 con proxy /api
```
