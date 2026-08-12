---
title: Decisiones de producto y tech
---

# Decisiones

## Neon + Nest en lugar de Supabase client

La nube es Postgres en Neon y una API Nest propia: SQL y esquema controlados, secretos solo en servidor, mismo patrón que el resto del portfolio. Se dejó el acoplamiento a Supabase Auth/Realtime porque el producto solo necesita PIN, sesiones y tareas.

## Turborepo monorepo + un deploy

Web y API comparten lockfile, turbo cache y un solo pipeline Vercel. Evita dos proyectos desincronizados y simplifica same-origin `/api`.

## Offline primero, sync opcional

Las features core de tareas no requieren API; la nube es continuidad multi-dispositivo, no el camino crítico de cada tap.

## PIN en vez de email/password

Onboarding en segundos para uso personal, sin buzones ni flujos de reset, manteniendo hash + pepper + rate-limit.

## Angular 22 con Zone (no zoneless) por Ionic

La skill Angular 22 pide zoneless, `[formField]` en todos los controles y View Transitions del router. **Ionic 8.8 no lo permite:** sigue pidiendo `zone.js`, sus `ion-*` no implementan `FormValueControl` y la navegación va por `ion-router-outlet`. Se adoptan Signal Forms + `httpResource` donde el DOM es nativo/Material; se documenta el techo en `11-angular-skill.md`.
