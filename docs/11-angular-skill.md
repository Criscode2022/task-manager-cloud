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

La skill pide **mirar el major del repo y no mezclar eras**. Task Cloud está en **Angular 20 + Ionic 8** (Ionic 8 soporta hasta Angular 20.x). Se aplicó el house style y las novedades de v20 que encajan con Ionic; se dejaron las APIs estables solo en v21/v22.

## Qué se aplicó en `apps/web`

1. **`ng update` a Angular 20.3** y Material/CDK 20. TypeScript `moduleResolution: bundler`.
2. **Control flow nativo.** Migración de `*ngIf` restantes a `@if` (lista, PIN dialog).
3. **HTTP moderno.** Se quitó el deprecado `HttpClientModule`; `provideHttpClient(withFetch(), withInterceptors(...))` usa el backend Fetch de Angular 20.
4. **OnPush** en `TabListPage`, `TabOptionsPage`, diálogo de edición y PIN dialog (alineado con el default implícito de majors posteriores).
5. **Signals first.** PIN dialog: `copied`/`confirmed` como signals. `TaskService.storageReady` en vez de `BehaviorSubject`. Diálogo de edición con `firstValueFrom`.
6. **Formularios.** Sigue `ReactiveFormsModule`: Signal Forms aún no son el default estable de v20 (lo son en v22). Ionic sigue usando `NgModule` en el shell.

## Qué queda fuera a propósito (Ionic + v20)

- Signal Forms / `formField` (estable en Angular 22)
- `httpResource()` / `resource()` siguen experimentales en 20.3
- Zoneless (`provideExperimentalZonelessChangeDetection`) — Ionic 8 + zone.js es el camino soportado
- Vitest (Karma sigue en este builder)
- `ng update` a 21+ no cabe: Ionic 8 declara máximo Angular 20.x

## House style (extracto)

- Estado y derivación en `signal` / `computed` / `linkedSignal`. RxJS solo para streams reales (debounce, websockets, races); al entrar, `toSignal()`.
- `private readonly` por defecto; `protected` solo si la plantilla lo lee; público es la excepción.
- `const` para locales; nunca `var`.
- Arrays/objetos por spread (`[...xs, x]`, `{ ...o, k }`, `toSorted()`), nunca `push`/`splice` sobre estado compartido.
- Guards arriba, happy path plano.
- En código **nuevo**: standalone, `inject()`, `input()`/`output()`, `@if/@for`, no NgModules ni `@Input()`.

## Referencia en el repo de la app

Tras clonar `task-manager-cloud`, los agentes que lean `.claude/skills/angular/SKILL.md` aplican estas reglas al tocar `apps/web`.
