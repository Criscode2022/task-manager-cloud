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

1. **Cliente** — Angular 22 + Ionic 8. Estilos en SCSS con los tokens de «Ballpoint Ink» (`apps/web/src/theme/variables.scss`); Angular Material solo aporta `MatDialog` y `MatSnackBar`.
   - Lista: `TabListPage` con `TaskComposerComponent` (captura) y `TaskEditorComponent` (edición en línea), ambos con Signal Forms.
   - Controles compartidos en `core/components/`: control segmentado, campo de etiquetas, diálogo del PIN y guía de instalación.
   - Servicios: `TaskService` (lista y almacenamiento), `TaskNeonService` y `NeonApiService` (sync), `UserService` (PIN y sesión), `InstallService` (instalación), `ThemeService` y `LanguageService`.
   - Techo v22×Ionic: `11-angular-skill.md`.
2. **PWA** — `apps/web/public/` aporta el manifest y los iconos, que el build copia a la raíz; el service worker se registra solo en producción.
3. **API** — NestJS 11: módulos `auth`, `users`, `tasks`, `health`, rate-limit y exception filter.
4. **Datos** — Neon Postgres: `users`, `tasks`, `sessions`.
5. **Deploy** — Un proyecto Vercel: turbo build web+api; output `apps/web/www`; rewrites `/api/*` → función.
6. **Local** — API `:3001`, web `:4200` con proxy `/api`; `pnpm start:full`.

## Principios

- Offline primero; sync opcional.
- Secretos solo en servidor (`DATABASE_URL`, `JWT_SECRET`, `PIN_PEPPER`).
- Same-origin en producción (`API_BASE_URL=/api`).
