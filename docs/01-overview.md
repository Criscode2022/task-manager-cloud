---
title: Visión general
---

# Visión general · Task Cloud

**Task Cloud** es una Progressive Web App de gestión de tareas personales con soporte offline real y sincronización en la nube.

El repositorio es un **monorepo npm workspaces + Turborepo**:

- `apps/web` — Angular 19 + Ionic 8 (PWA)
- `apps/api` — NestJS 11 sobre **Neon Postgres**

En producción se despliega como **un único proyecto Vercel**: el front se sirve como estáticos y Nest se envuelve en una función serverless (`api/index.js`) detrás de `/api/*` (same-origin, sin CORS).

## Enlaces

- **Web:** [https://task-manager-cristiancode.vercel.app](https://task-manager-cristiancode.vercel.app/)
- **GitHub:** [Criscode2022/task-manager-cloud](https://github.com/Criscode2022/task-manager-cloud)
- **Health:** `GET /api/health` → `{ "ok": true, "service": "task-cloud-nest-api" }`

## Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | Turborepo + npm workspaces |
| Web | Angular 19, Ionic 8, Tailwind, service worker |
| API | NestJS 11, jose, bcryptjs |
| Datos | Neon Postgres (`@neondatabase/serverless`) |
| Deploy | Vercel (static + serverless function) |
