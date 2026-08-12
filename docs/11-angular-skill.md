---
title: Skill Angular
---

# Skill Angular

La guía de estilo Angular de Task Cloud está en `.claude/skills/angular/`.

| Archivo | Contenido |
|---------|-----------|
| `SKILL.md` | Defaults Angular 22 + house style |
| `style-standards.md` | Signals first, visibilidad, `const`, spread, early returns |
| `signals.md` | `computed`, `effect`, `resource`/`httpResource`, zoneless |
| `signal-forms.md` | Signal Forms (estable en v22) |
| `components.md` | Standalone, `@if/@for`, SSR, Vitest |
| `animations.md` | `animate.enter` / View Transitions |

La skill pide **mirar el major del repo y no mezclar eras**. Task Cloud está en **Angular 22.1 + Ionic 8.8.18 + TypeScript 6.0**. v22 hace zoneless el default en apps *nuevas*; esta app declara `provideZoneChangeDetection()` porque Ionic 8 sigue apoyándose en Zone.js.

## Revisión 2026-08-13 (Angular 22)

Hallazgos aplicados:

1. **Upgrade a Angular 22.1.1** + Material/CDK 22.1 + CLI 22.1. TypeScript **6.0.3**. Ionic **8.8.18** (peer `>=16`).
2. **Signal Forms** en crear y editar tarea: `form()` + `FormField` + `required`/`maxLength` + `submit()`. El modelo es un `signal` plano (`taskModel` / `editModel`). `ion-select` y `mat-select` escriben el modelo (no tienen CVA de Signal Forms).
3. **`httpResource`** para lecturas GET: `cloudTasks` (`GET /tasks`) y `meResource` (`GET /auth/me`), disparados por `session`. Mutaciones (POST/PUT/DELETE) siguen en `HttpClient`; tras mutar se llama `cloudTasks.reload()`.
4. HTTP Fetch, `@if`, OnPush y Zone explícito se mantienen.

Queda fuera a propósito:

- Zoneless real (Ionic + Zone)
- Vitest (Karma en este builder webpack)
- Migración completa del shell `NgModule` de Ionic
- `TaskHttpService` legado (no está en el flujo Neon)

## House style (extracto)

- Estado y derivación en `signal` / `computed` / `linkedSignal` / `httpResource`. RxJS solo para streams reales; al entrar, `toSignal()`.
- `private readonly` por defecto; `protected` solo si la plantilla lo lee.
- `const` para locales; nunca `var`.
- Arrays/objetos por spread; nunca `push`/`splice` sobre estado compartido.
- Guards arriba, happy path plano.
- En código **nuevo**: standalone, `inject()`, `input()`/`output()`, Signal Forms, `httpResource` para lecturas.

## Referencia en el repo de la app

Los agentes que lean `.claude/skills/angular/SKILL.md` aplican estas reglas al tocar `apps/web`.
