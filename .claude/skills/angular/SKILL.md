---
name: angular
description: >-
  Modern Angular (v17–v22, defaulting to Angular 22 idioms) — signals,
  zoneless change detection, signal forms, standalone components, control
  flow, SSR/hydration, plus this repo's binding house style (signals over
  RxJS, restrictive visibility, const, spread, early returns). Use when
  writing or reviewing any Angular code, upgrading Angular versions, or
  choosing between legacy and signal-era APIs — including animations
  (animate.enter/animate.leave, View Transitions).
---

# Angular (signal-first, v22 baseline)

References:

- [style-standards.md](style-standards.md) — **binding house style**: signals over RxJS, restrictive visibility, `const`, spread, early returns, modern-API checklist
- [signals.md](signals.md) — signals, computed, effects, `resource()`/`httpResource()`, zoneless
- [signal-forms.md](signal-forms.md) — the stable Signal Forms API (v22) and when reactive forms remain
- [components.md](components.md) — standalone components, control flow, `@defer`, SSR, Vitest testing
- [animations.md](animations.md) — `animate.enter`/`animate.leave`, CSS-first motion, View Transitions router API (`@angular/animations` is deprecated)

## Angular 22 defaults — write new code this way

Angular 22 (June 2026) completed the "signal-first" shift. In new code:

- **Zoneless is the default.** No Zone.js; change detection is driven by
  signals. Never write code that relies on Zone magic (e.g. mutating a field
  and expecting the view to notice) — state lives in signals.
- **OnPush is the implicit default** for components that don't set
  `changeDetection`. The old check-always behavior is opt-in via
  `ChangeDetectionStrategy.Eager` (migrations add it to legacy components).
- **Signal Forms are stable** — prefer them over ReactiveFormsModule for new
  forms (see signal-forms.md).
- **`resource()` / `httpResource()` are stable** — prefer them over manual
  `HttpClient` + subscribe for read paths.
- **Vitest is the default test runner** for new projects (Jest/Web Test Runner
  experimental support was removed).
- **Angular ARIA** (headless accessible patterns) is stable — use it before
  hand-rolling menus, dialogs, comboboxes.
- Standalone components, `input()`/`output()`/`model()` functions,
  `inject()` over constructor injection, native control flow
  (`@if/@for/@switch`) — all baseline since v17–v19; never generate NgModules,
  `*ngIf`, or `@Input()` decorators in new code.

## House style — binding, see [style-standards.md](style-standards.md)

- **Signals first; RxJS only for genuinely complex stream logic** (races,
  debounced pipelines, websockets) — and converted at the edge via `toSignal`.
- **Restrictive visibility**: `private readonly` by default, `protected` for
  template-only members, public only for the component's I/O surface;
  `readonly` on every field that isn't reassigned.
- **`const` for locals** unless reassignment is real; never `var`.
- **Arrays/objects by spread** (`[...xs, x]`, `{ ...o, k }`, `toSorted()`),
  never `push`/`splice`/in-place `sort` on shared state.
- **Early returns**: guard clauses at the top, happy path flat at one level.

## Version awareness

When working in an existing repo, check `package.json` for the Angular major
first and match its idioms; propose `ng update` migrations rather than mixing
eras in one file. Notable v22 breaking change: router
`paramsInheritanceStrategy` now defaults to `'always'` (was `'emptyOnly'`).
