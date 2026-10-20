---
title: Deploy Vercel (Turborepo)
---

# Deploy en Vercel (un solo proyecto)

## Idea

- `apps/web` → estáticos en CDN (`apps/web/www`)
- `apps/api` → función serverless vía `api/index.js` (incluye `apps/api/dist/**`)
- `/api/*` reescrito a la función; el resto a la SPA

## Config (`vercel.json`)

- `buildCommand`: `pnpm exec turbo run build --filter=@task-cloud/web --filter=@task-cloud/api`
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
| `ALLOWED_ORIGINS` | no | Solo si otro origen debe llamar a la API |
| `ALLOW_VERCEL_PREVIEWS` | no | default `true`: acepta `https://*.vercel.app` |

`AUTH_RATE_LIMIT` y `AUTH_RATE_WINDOW_MS` se validan pero hoy no se leen: el límite de auth está fijado en 10 cada 15 minutos.

## Smoke

1. `GET https://task-manager-cristiancode.vercel.app/api/health`
2. `GET /manifest.webmanifest` devuelve el JSON del manifest, no el `index.html`. Si devuelve HTML, el build no copió `apps/web/public/` y el navegador no ofrecerá instalar la app.
3. Abrir la web → Ajustes → «Subir tareas y obtener un PIN» → crear/sync tareas
4. En Chrome, el botón de instalar de la cabecera abre el diálogo de instalación

## Local

```bash
pnpm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, PIN_PEPPER
pnpm api               # :3001
pnpm start             # :4200 con proxy /api
```
