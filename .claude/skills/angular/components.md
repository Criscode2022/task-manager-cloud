# Components, templates, SSR, testing

## Component baseline (v22)

```ts
@Component({
  selector: 'app-order-list',
  imports: [CurrencyPipe, OrderRow, EmptyState],   // standalone is implicit
  templateUrl: './order-list.html',
  // no changeDetection field: OnPush is the v22 default
})
export class OrderList {
  private readonly orders = inject(OrderStore);     // inject() over constructor DI

  readonly filter = input('');                      // signal inputs
  readonly selected = output<Order>();

  readonly rows = computed(() =>
    this.orders.visible().filter(o => o.ref.includes(this.filter())));
}
```

Never generate in new code: NgModules, `*ngIf/*ngFor`, `@Input()/@Output()`
decorators, `constructor(private x: X)` injection. Those are legacy-era
idioms — flag them in review when the repo is on v17+.

Routing is standalone + lazy by default:

```ts
export const routes: Routes = [
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.routes').then(m => m.ORDER_ROUTES),
    canActivate: [authGuard],          // functional guard
  },
];

export const authGuard: CanActivateFn = () =>
  inject(AuthStore).isLoggedIn() || inject(Router).createUrlTree(['/login']);
```

## Native control flow & deferral

```html
@let vip = user().tier === 'vip';      <!-- template-local aliases -->

@for (row of rows(); track row.id) {   <!-- track by identity, not $index -->
  <app-order-row [order]="row" (open)="selected.emit(row)" />
} @empty {
  <app-empty-state msg="No orders match the filter." />
}

@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error')   { <app-error (retry)="reload()" /> }
  @default          { <router-outlet /> }
}

@defer (on viewport; prefetch on idle) {
  <app-heavy-chart [data]="stats()" />
} @placeholder {
  <div class="chart-skeleton" aria-hidden="true"></div>  <!-- sized: no layout shift -->
} @error {
  <p role="alert">Chart failed to load.</p>
}
```

- `@defer` for anything heavy below the fold; choose triggers
  (`on viewport`, `on interaction`, `when cond()`) deliberately and always
  size the `@placeholder`.
- Accessible patterns (menu, listbox, combobox, tabs): **Angular ARIA**
  (stable in v22) before hand-rolling roles and keyboard handling.

## SSR & hydration

```ts
// ☠ breaks the server build — window at construction time
export class MapComponent { zoom = window.innerWidth > 900 ? 12 : 10; }

// ✔ browser-only work in afterNextRender
export class MapComponent {
  private readonly el = inject(ElementRef);
  constructor() {
    afterNextRender(() => {
      const map = new MapLibre(this.el.nativeElement);   // browser API, safe here
    });
  }
}
```

- New apps: SSR + incremental hydration; event replay is on by default.
- Data fetched on the server transfers automatically via the HTTP transfer
  cache — avoid patterns that force a client refetch of the same URL.

## Testing (Vitest is the v22 default)

```ts
describe('OrderList', () => {
  it('filters rows by ref', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: OrderStore, useValue: fakeOrderStore([anOrder({ ref: 'A-1' })]) }],
    });
    const fixture = TestBed.createComponent(OrderList);
    fixture.componentRef.setInput('filter', 'A-1');     // set signal inputs properly
    await fixture.whenStable();                          // zoneless: drive updates explicitly

    const rows = fixture.nativeElement.querySelectorAll('app-order-row');
    expect(rows.length).toBe(1);
  });
});
```

- Services: test directly with fakes — `TestBed` only when DI wiring itself
  matters.
- Query the DOM by role/text (Testing Library for Angular works well), not
  CSS internals.
- E2E: Playwright (testing track). Don't add Karma/Jasmine to new projects —
  removed from the default toolchain.
