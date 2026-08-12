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

## Qué Angular 22 no se puede (o no se debe) aplicar por Ionic 8

Ionic **8.8** declara `zone.js` como peer y sus web components (`ion-select`, overlays, `ion-router-outlet`, tabs) no implementan las APIs signal-first de v22. Esto **no** es deuda de la skill: es un techo del runtime Ionic. No forzar estas APIs hasta que Ionic las soporte.

| API Angular 22 | Por qué Ionic la bloquea | Qué hacemos aquí |
|----------------|--------------------------|------------------|
| **Zoneless** (`provideZonelessChangeDetection()`, quitar `zone.js`) | Peer oficial `zone.js >= 0.13`. Eventos, overlays y navegación de Ionic siguen notificando la vista vía Zone. Sin Zone, taps y modales se quedan mudos. | `provideZoneChangeDetection()` + `zone.js` |
| **`[formField]` en controles Ionic** | `ion-select`, `ion-checkbox`, `ion-toggle`, `ion-input` no implementan `FormValueControl`. Signal Forms solo enlaza nativos / Material. | `form()` + `[formField]` en `matInput`; `ion-select` / `mat-select` escriben el `signal` del modelo |
| **View Transitions del router Angular** | La navegación real pasa por `ion-router-outlet` + `IonicRouteStrategy`, no por las transiciones del `Router` de Angular. | Transiciones de Ionic; no `withViewTransitions()` |
| **Angular ARIA en overlays** | Alertas, popovers y action sheets son de Ionic. Sustituirlos por Angular ARIA rompe el look y el focus trap nativo. | Overlays Ionic; ARIA solo si se añade un control *nuevo* no-Ionic |
| **SSR / hidratación** | PWA + Capacitor + `IonicStorage` son cliente. No hay servidor de render para `ion-*`. | SPA + service worker |

**No atribuir a Ionic** (queda fuera por el builder/legado, no por el peer):

- Vitest — el builder webpack/Karma de esta app
- Shell `NgModule` (`IonicModule.forRoot()`, `TabsModule`) — Ionic 8 *sí* tiene `provideIonicAngular()`; no se ha migrado el andamiaje de tabs
- `TaskHttpService` — API vieja, fuera del flujo Neon

Revisar esta tabla al subir de major de Ionic. Si el peer deja de pedir `zone.js` y los `ion-*` implementan `FormValueControl`, se puede zoneless + `[formField]` en selects.

## House style (extracto)

- Estado y derivación en `signal` / `computed` / `linkedSignal` / `httpResource`. RxJS solo para streams reales; al entrar, `toSignal()`.
- `private readonly` por defecto; `protected` solo si la plantilla lo lee.
- `const` para locales; nunca `var`.
- Arrays/objetos por spread; nunca `push`/`splice` sobre estado compartido.
- Guards arriba, happy path plano.
- En código **nuevo**: standalone, `inject()`, `input()`/`output()`, Signal Forms, `httpResource` para lecturas.

## Referencia en el repo de la app

Los agentes que lean `.claude/skills/angular/SKILL.md` aplican estas reglas al tocar `apps/web`.
