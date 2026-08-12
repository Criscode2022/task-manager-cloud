---
title: Arquitectura
---

# Arquitectura

## Diagrama lógico

```
Browser (PWA Ionic/Angular)
    │  offline: Ionic Storage
    │  online + sesión: HTTP /api/*
    ▼
NestJS (apps/api)  ──@neondatabase/serverless──►  Neon Postgres
    ▲
api/index.js (Vercel serverless, warm cache)

mcp-server/ (opcional, Python FastMCP) ──► Neon
```

## Capas

1. **Cliente** — Angular 22 + Ionic 8 + Tailwind. Servicios de dominio: `TaskService`, `TaskNeonService`, `NeonApiService`. Techo v22×Ionic: `11-angular-skill.md`.
2. **API** — NestJS 11: módulos `auth`, `users`, `tasks`, `health`, rate-limit y exception filter.
3. **Datos** — Neon Postgres: `users`, `tasks`, `sessions`.
4. **Deploy** — Un proyecto Vercel: turbo build web+api; output `apps/web/www`; rewrites `/api/*` → función.
5. **Local** — API `:3001`, web `:4200` con proxy `/api`; `npm run start:full`.

## Principios

- Offline primero; sync opcional.
- Secretos solo en servidor (`DATABASE_URL`, `JWT_SECRET`, `PIN_PEPPER`).
- Same-origin en producción (`API_BASE_URL=/api`).
