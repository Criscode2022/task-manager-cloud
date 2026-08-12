---
title: Skill Angular (claude-workflow)
---

# Skill Angular · claude-workflow

Task Cloud adopta la skill **angular** del repo interno [claude-workflow](https://github.com/Criscode2022/claude-workflow) (`.claude/skills/angular`). Vive en el monorepo en:

`.claude/skills/angular/`

| Archivo | Contenido |
|---------|-----------|
| `SKILL.md` | Defaults Angular 22 + house style |
| `style-standards.md` | Signals first, visibilidad, `const`, spread, early returns |
| `signals.md` | `computed`, `effect`, `resource`/`httpResource`, zoneless |
| `signal-forms.md` | Signal Forms (estable en v22) |
| `components.md` | Standalone, `@if/@for`, SSR, Vitest |
| `animations.md` | `animate.enter` / View Transitions |

La skill pide **mirar el major del repo y no mezclar eras**. Task Cloud está en **Angular 21.2 + Ionic 8.8**. v21 hace zoneless el default en apps *nuevas*; esta app declara `provideZoneChangeDetection()` porque Ionic 8 sigue apoyándose en Zone.js.

## Qué se aplicó en `apps/web`

1. **Upgrade a Angular 21.2** y Material/CDK 21. TypeScript 5.9. Ionic 8.8.17 (compilado contra el runtime de v21).
2. **HTTP Fetch.** `provideHttpClient(withFetch(), withInterceptors(...))` — sin `HttpClientModule`.
3. **Control flow nativo** (`@if`) y **OnPush** en lista, opciones y diálogos.
4. **Zone explícito.** `provideZoneChangeDetection()` para no heredar el default zoneless de v21.
5. **Assets v21.** El CLI ya no copia rutas fuera del workspace; ionicons se copian a `src/ionicons-svg` en el `set-env`.
6. **Signals first** y Reactive Forms. Signal Forms siguen experimentales en v21 (estables en v22).

## Qué queda fuera a propósito

- Signal Forms / `formField` (estable en Angular 22)
- Zoneless real (Ionic + Zone)
- Vitest (Karma en este builder)
- Migración completa del shell `NgModule` de Ionic

## House style (extracto)

- Estado y derivación en `signal` / `computed` / `linkedSignal`. RxJS solo para streams reales (debounce, websockets, races); al entrar, `toSignal()`.
- `private readonly` por defecto; `protected` solo si la plantilla lo lee; público es la excepción.
- `const` para locales; nunca `var`.
- Arrays/objetos por spread (`[...xs, x]`, `{ ...o, k }`, `toSorted()`), nunca `push`/`splice` sobre estado compartido.
- Guards arriba, happy path plano.
- En código **nuevo**: standalone, `inject()`, `input()`/`output()`, `@if/@for`, no NgModules ni `@Input()`.

## Referencia en el repo de la app

Tras clonar `task-manager-cloud`, los agentes que lean `.claude/skills/angular/SKILL.md` aplican estas reglas al tocar `apps/web`.
