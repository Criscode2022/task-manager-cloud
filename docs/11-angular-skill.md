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

La skill pide **mirar el major del repo y no mezclar eras**. Task Cloud está en **Angular 19 + Ionic 8**, así que no se subió a Signal Forms, `httpResource` ni zoneless (v22). Se aplicó el **house style** y los APIs que ya existen en v19.

## Qué se aplicó en `apps/web`

1. **Signals first, RxJS en el borde.** Se eliminó `BehaviorSubject` de `TaskService` (`storageInitialized`) y se sustituyó por `storageReady = signal(false)`. `TabsPage` espera ese signal con `effect()` en vez de `.subscribe()`. El diálogo de edición usa `firstValueFrom(afterClosed())` (un valor, no un stream).
2. **Visibilidad restrictiva.** Inyectados `private readonly`; estado de UI `protected` para la plantilla; `filteredTasks` dejó de ser `public`.
3. **`const` y sin mutar arrays.** El ciclo del filtro de estado es `(index + 1) % length`. Tags únicas con `[...set].toSorted()`. El filtro de lista se deriva en `filterTasksByStatus()` + `computed`.
4. **Early returns.** Guards al inicio en `switchToAlternativeFilter`, persistencia de storage y carga del PWA install prompt.
5. **Formularios.** Se mantienen `ReactiveFormsModule` (la skill prohíbe Signal Forms por debajo de Angular 20). No se añadieron NgModules ni `*ngIf` nuevos.

## Qué queda fuera a propósito (Angular 19)

- Signal Forms / `formField`
- `httpResource()` / `resource()`
- `provideZonelessChangeDetection()` (sigue `zone.js`)
- Migración completa de `NgModule` de Ionic (`TabsPage` sigue `standalone: false`)
- Vitest (el repo sigue con Karma/Jasmine)

Un `ng update` a 20+ permitiría el resto de la skill **archivo a archivo**, no mezclando APIs v22 en componentes legacy.

## House style (extracto)

- Estado y derivación en `signal` / `computed` / `linkedSignal`. RxJS solo para streams reales (debounce, websockets, races); al entrar, `toSignal()`.
- `private readonly` por defecto; `protected` solo si la plantilla lo lee; público es la excepción.
- `const` para locales; nunca `var`.
- Arrays/objetos por spread (`[...xs, x]`, `{ ...o, k }`, `toSorted()`), nunca `push`/`splice` sobre estado compartido.
- Guards arriba, happy path plano.
- En código **nuevo**: standalone, `inject()`, `input()`/`output()`, `@if/@for`, no NgModules ni `@Input()`.

## Referencia en el repo de la app

Tras clonar `task-manager-cloud`, los agentes que lean `.claude/skills/angular/SKILL.md` aplican estas reglas al tocar `apps/web`.
