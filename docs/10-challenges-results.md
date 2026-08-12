---
title: Retos y resultados
---

# Retos y aprendizajes

## Serverless Nest en Vercel

Adapter Express, cold start, `maxDuration` y reutilizar la app entre invocaciones warm (`api/index.js`).

## Convergencia local ↔ nube

Mapear ids locales tras upload, bulk sync y no pisar ownership entre usuarios.

## Env dual (web + api)

`set-env.js` genera `environment.*.local.ts` desde el `.env` raíz; secretos nunca van al bundle del browser.

# Resultados

- Monorepo operativo con CI (lint, tests web, build API) en GitHub Actions.
- PWA en producción en Vercel (estáticos + API Nest en `/api`) sobre Neon.
- API con health, auth PIN/JWT, CRUD/bulk de tareas y esquema Neon versionado en SQL.
- Código abierto como referencia Angular/Ionic + Nest + Neon + Turborepo + Vercel.
