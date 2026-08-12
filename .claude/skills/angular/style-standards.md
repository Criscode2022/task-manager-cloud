# House style — how Angular code is written here

Binding rules for all new/edited Angular code, on top of the v22 defaults in
[SKILL.md](SKILL.md). In review, each violation below is a finding.

## 1. Signals first — RxJS is the exception

State and derivation live in signals (`signal`, `computed`, `linkedSignal`,
`httpResource`). Reach for RxJS **only** when the problem is genuinely
stream-shaped and signals can't express it: multi-source race/merge logic,
debounced typeahead pipelines, websocket protocols, complex retry/backoff.

```ts
// ☠ RxJS for plain state — subscription bookkeeping for nothing
private readonly count$ = new BehaviorSubject(0);
readonly double$ = this.count$.pipe(map((c) => c * 2));

// ✔ signals
private readonly count = signal(0);
readonly double = computed(() => this.count() * 2);
```

When RxJS is justified, keep it at the edge and convert immediately:
`toSignal()` on the way in, `toObservable()` only when an API demands it.
A `.subscribe()` inside a component is a smell — the template reads signals.

## 2. Restrictive visibility — everything as closed as possible

Default order: `private readonly` → `private` → `protected readonly` →
`protected` → public. Public is the *earned* exception (template-bound
members and the component's I/O), never the default.

```ts
// ☠ everything public and reassignable
export class CartStore {
  items = signal<CartItem[]>([]);
  http = inject(HttpClient);
}

// ✔ closed by default: private writable core, readonly public surface
export class CartStore {
  private readonly http = inject(HttpClient);
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
}
```

- Injected dependencies: **always** `private readonly` (or `protected
  readonly` when a subclass or the template truly needs them).
- Signals, resources, outputs: `readonly` fields — the container never gets
  reassigned, only its value changes.
- Members used **only by the template** of this component: `protected`, not
  public — templates can read protected; the class stays closed to the rest
  of the app.
- Helper methods called only inside the class: `private`.

## 3. `const` inside functions

`const` for every local that isn't reassigned — which is nearly all of them.
A `let` is a signal to the reader that the value changes; make it rare and
honest. `var` never.

```ts
// ☠
let total = 0;
for (let i = 0; i < items.length; i++) total += items[i].price;

// ✔ const + expression style removes the mutation entirely
const total = items.reduce((sum, item) => sum + item.price, 0);
```

## 4. Arrays (and objects) by spread — never mutate

Signal equality is reference-based: in-place mutation both corrupts shared
state and is invisible to change detection. Produce new arrays/objects.

```ts
// ☠ mutations — push/splice/sort on shared state
this._items().push(item);
list.splice(index, 1);
list.sort(byDate);

// ✔ spread & non-mutating methods
this._items.update((xs) => [...xs, item]);                 // add
this._items.update((xs) => xs.filter((x) => x.id !== id)); // remove
this._items.update((xs) =>
  xs.map((x) => (x.id === id ? { ...x, qty } : x)));       // replace one
const sorted = [...list].sort(byDate);                     // sort a copy
const merged = { ...defaults, ...overrides };              // objects too
```

`toSorted()`, `toSpliced()`, `toReversed()`, `with()` are the non-mutating
natives — prefer them over copy-then-mutate where available.

## 5. Early return — guard clauses over nesting

Validate and bail at the top; the happy path reads flat at one indent level.

```ts
// ☠ arrow anti-pattern
save(order: Order | undefined): void {
  if (order) {
    if (this.form().valid()) {
      if (!this.saving()) {
        // real work, three levels deep
      }
    }
  }
}

// ✔ guards first, happy path last
save(order: Order | undefined): void {
  if (!order) return;
  if (!this.form().valid()) return;
  if (this.saving()) return;

  // real work, at the top level
}
```

Same rule in `computed()` bodies and template-adjacent helpers: handle the
empty/error/loading case first, return early, then the main derivation.

## 6. Modern-API checklist (reject the legacy form in new code)

| Always                                    | Never (in new code)                  |
|-------------------------------------------|--------------------------------------|
| standalone components (implicit v19+)     | NgModules                            |
| `inject(Service)` in field initializers   | `constructor(private s: Service)`    |
| `input()` / `input.required()` / `model()`| `@Input()` decorator                 |
| `output()`                                | `@Output()` + `EventEmitter`         |
| `httpResource()` / `resource()` for reads | manual `HttpClient` + `subscribe`    |
| Signal Forms (see signal-forms.md)        | new `ReactiveFormsModule` forms      |
| `computed()` / `linkedSignal()` to derive | `effect()` writing other signals     |
| `effect()` for outside-world side effects | `ngOnChanges` / Zone-reliant updates |
| `@if` / `@for` / `@switch` / `@let`       | `*ngIf` / `*ngFor` / `ngSwitch`      |
| `DestroyRef.onDestroy` / `takeUntilDestroyed` | manual `Subscription` bookkeeping|

## Review checklist (run mentally over every diff)

1. Any new `BehaviorSubject`/`subscribe` that plain signals could replace?
2. Any field that could be `private`/`protected` and isn't? Missing `readonly`?
3. Any `let` that never reassigns? Any `var`?
4. Any `push`/`splice`/in-place `sort`/direct property assignment on shared
   state instead of spread/`update()`?
5. Any function whose happy path sits ≥ 2 conditions deep instead of using
   guard clauses?
6. Any legacy-column API from the table above?
