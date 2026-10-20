---
title: Visión general
---

# Visión general · Task Cloud

**Task Cloud** es una Progressive Web App de gestión de tareas personales con soporte offline real, instalable en la pantalla de inicio y con sincronización opcional en la nube mediante un PIN de 8 dígitos.

El repositorio es un **monorepo pnpm workspaces + Turborepo**:

- `apps/web` — Angular 22 + Ionic 8 (PWA)
- `apps/api` — NestJS 11 sobre **Neon Postgres**

En producción se despliega como **un único proyecto Vercel**: el front se sirve como estáticos y Nest se envuelve en una función serverless (`api/index.js`) detrás de `/api/*` (same-origin, sin CORS).

## Enlaces

- **Web:** [https://task-manager-cristiancode.vercel.app](https://task-manager-cristiancode.vercel.app/)
- **GitHub:** [Criscode2022/task-manager-cloud](https://github.com/Criscode2022/task-manager-cloud)
- **Health:** `GET /api/health` → `{ "ok": true, "service": "task-cloud-nest-api" }`

## Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Angular 22 (Signal Forms, signals), Ionic 8, service worker + manifest, tokens SCSS («Ballpoint Ink») |
| API | NestJS 11, jose, bcryptjs |
| Datos | Neon Postgres (`@neondatabase/serverless`) |
| Deploy | Vercel (static + serverless function) |
