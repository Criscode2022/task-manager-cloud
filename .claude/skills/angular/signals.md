# Signals, resources, and zoneless Angular

## Core graph

```ts
import { signal, computed, effect, linkedSignal, untracked } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  // private writable state, public readonly surface
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((s, i) => s + i.price * i.qty, 0));
  readonly isEmpty = computed(() => this._items().length === 0);

  add(item: CartItem) {
    // replace, never mutate — equality is reference-based
    this._items.update(xs => [...xs, item]);
  }
  remove(id: string) {
    this._items.update(xs => xs.filter(i => i.id !== id));
  }
}
```

- **Derive, don't sync.** `computed()` for anything derivable. An `effect()`
  that calls `.set()` on another signal is almost always a `computed`/
  `linkedSignal` in disguise:

```ts
// ☠ effect-as-glue — timing-dependent, runs after the fact
selected = signal<Item | undefined>(undefined);
constructor() { effect(() => this.selected.set(this.items()[0])); }

// ✔ linkedSignal: derived default, locally writable when the user picks
selected = linkedSignal(() => this.items()[0]);
```

- `effect()` is for reaching **outside** the graph only (DOM APIs,
  localStorage, analytics), with `untracked` for reads that shouldn't
  retrigger:

```ts
effect(() => {
  const theme = this.theme();                        // tracked — reruns on change
  const user = untracked(this.currentUser);          // read without subscribing
  document.documentElement.dataset['theme'] = theme;
  analytics.track('theme_changed', { theme, userId: user?.id });
});
```

- Component I/O is signal-based:

```ts
name = input.required<string>();          // not @Input()
size = input<'sm' | 'lg'>('sm');
save = output<Order>();                   // not @Output() EventEmitter
value = model<string>('');                // two-way: [(value)]
```

- RxJS interop at the edges — streams stay RxJS, state becomes signals:

```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
readonly status = toSignal(this.ws.status$, { initialValue: 'connecting' });
readonly query$ = toObservable(this.query).pipe(debounceTime(300));
```

## Async data: resource() and httpResource() (stable in v22)

```ts
userId = input.required<string>();
user = httpResource<User>(() => `/api/users/${this.userId()}`);

// non-GET / richer requests:
search = httpResource<SearchResult>(() => ({
  url: '/api/search',
  method: 'POST',
  body: { q: this.query(), page: this.page() },
}));
```

```html
@if (user.isLoading()) { <app-spinner /> }
@else if (user.error()) { <app-error [error]="user.error()" (retry)="user.reload()" /> }
@else if (user.hasValue()) { <app-profile [user]="user.value()" /> }
```

- Re-fires automatically when any signal read in the request function
  changes; in-flight requests are cancelled on param change (no manual
  `switchMap`).
- `resource({ params, loader })` for non-HTTP async (IndexedDB, SDKs);
  `rxResource` for observable-based loaders.
- Resources are for **reads**. Mutations: call the service, then
  `resource.reload()` or update local state explicitly:

```ts
async save(changes: Partial<User>) {
  await firstValueFrom(this.http.patch(`/api/users/${this.userId()}`, changes));
  this.user.reload();
}
```

## Zoneless rules

- New v22 apps are zoneless by default; older apps opt in:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],   // and remove zone.js from polyfills
});
```

- The view updates when: a signal it reads changes, a template-bound event
  fires, or `AsyncPipe` receives a value. Code that mutated a plain field
  from a `setTimeout`/websocket and "worked" under Zone.js will not update:

```ts
// ☠ invisible to zoneless change detection
setInterval(() => { this.secondsElapsed++; }, 1000);
// ✔ state lives in a signal
readonly seconds = signal(0);
constructor() {
  const id = setInterval(() => this.seconds.update(s => s + 1), 1000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}
```

- `ChangeDetectorRef.markForCheck()/detectChanges()` in app code is a smell
  post-migration: it means state isn't in the graph.
