# Angular animations (v22 baseline: native CSS + `animate.enter`/`animate.leave`)

**The story changed in v20.2:** the `@angular/animations` package
(`trigger`/`state`/`transition`/`BrowserAnimationsModule`) is **deprecated**.
Modern Angular animates with **plain CSS** (transitions, keyframes) plus two
template bindings — `animate.enter` and `animate.leave` — that solve the one
thing CSS can't: animating elements as they're added to and **removed from**
the DOM. Never add `@angular/animations` to new code.

## Enter animations — `animate.enter`

Applies CSS classes while the element enters; Angular removes them when the
animation/transition finishes.

```html
@if (isShown()) {
  <div class="card" animate.enter="fade-in-up">
    <p>Inserted with animation</p>
  </div>
}
```

```css
.fade-in-up {
  animation: fade-in-up 250ms ease-out;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- Value can be one class, a space-separated list, an **array binding**
  (`[animate.enter]="classes()"`), or any dynamic expression — so themes or
  state can pick the animation.
- Works anywhere elements enter: `@if`, `@for` items, `@defer` blocks,
  components appearing via signals.
- With **transitions** instead of keyframes, the class describes the *target*
  state — define the initial state with CSS `@starting-style`:

```css
.enter-fade { opacity: 1; transition: opacity 300ms ease-in; }
@starting-style { .enter-fade { opacity: 0; } }
```

## Leave animations — `animate.leave`

The historically hard one: Angular keeps the element in the DOM until the
animation completes, **then** removes it.

```html
@if (isShown()) {
  <div class="card" animate.leave="fade-out-down">
    <p>Removed with animation</p>
  </div>
}
```

```css
.fade-out-down {
  animation: fade-out-down 200ms ease-in forwards;
}
@keyframes fade-out-down {
  to { opacity: 0; transform: translateY(8px); }
}
```

## Event-binding form — hand control to JS (GSAP, Web Animations API)

Bind a function instead of classes when a library drives the animation. You
**must** call `event.animationComplete()` — for `animate.leave` that's what
lets Angular finally remove the element (forget it and the element never
leaves).

```ts
import { AnimationCallbackEvent, Component, signal } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    @if (isShown()) {
      <div class="panel" (animate.leave)="leaveWithGsap($event)">…</div>
    }
  `,
})
export class Panel {
  protected readonly isShown = signal(true);

  protected leaveWithGsap(event: AnimationCallbackEvent): void {
    gsap.to(event.target, {
      duration: 0.3,
      x: 80,
      opacity: 0,
      onComplete: () => event.animationComplete(),  // required!
    });
  }
}
```

## State-change animations — no API needed, just signals + CSS

Anything that isn't enter/leave is a class swap driven by a signal plus a
CSS `transition`. Don't reach for an animation API here:

```html
<button [class.expanded]="isOpen()" (click)="isOpen.set(!isOpen())">…</button>
```

```css
button { transition: transform 200ms ease, background-color 200ms ease; }
button.expanded { transform: rotate(180deg); }
```

## Route transitions — the View Transitions API

```ts
bootstrapApplication(App, {
  providers: [provideRouter(routes, withViewTransitions())],
});
```

```css
/* global styles — pseudo-elements live on :root */
::view-transition-old(root) { animation: 150ms ease-out both fade-out; }
::view-transition-new(root) { animation: 200ms ease-in  both fade-in; }
```

Give an element continuity across routes with
`style="view-transition-name: hero"` on both pages — the browser morphs
old → new automatically. (Progressive enhancement: unsupported browsers just
navigate without animation.)

## Rules

- **Reduced motion is non-negotiable** — gate decorative animation:

```css
@media (prefers-reduced-motion: reduce) {
  .fade-in-up, .fade-out-down { animation: none; }
  * { transition-duration: 0.01ms !important; }
}
```

- Animate **`transform` and `opacity`** (compositor-only); animating
  width/height/top/margin causes layout thrash — a jank finding in review.
- Zoneless-safe by design: CSS runs off the main thread and needs no change
  detection. Don't "animate" by mutating styles from `setInterval`.
- **Legacy repos**: code with `trigger()`/`transition()`/`state()` still
  works but is deprecated — migrate incrementally to `animate.enter`/
  `animate.leave` + CSS (see angular.dev/guide/animations/migration). Flag
  new `@angular/animations` usage in review on v20.2+ repos.
- Tailwind projects: `animate.enter` class values compose perfectly with
  Tailwind's `animate-*` utilities — see `tailwind/animations.md`.
