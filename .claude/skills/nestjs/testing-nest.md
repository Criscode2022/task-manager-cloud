# Testing NestJS

(Vitest is the default runner for new v11 projects; the patterns are identical
under Jest.)

## Unit tests — services, without the framework

Instantiate directly with fakes; `Test.createTestingModule` only when DI
wiring itself matters:

```ts
describe('OrdersService', () => {
  it('rejects cancellation of shipped orders', async () => {
    const repo = { findById: vi.fn().mockResolvedValue(shippedOrder()) };
    const service = new OrdersService(repo as any, fakeEvents());
    await expect(service.cancel('o1', user())).rejects.toBeInstanceOf(ConflictException);
    expect(repo.findById).toHaveBeenCalledWith('o1');
  });
});
```

- Mock at the **ports** you own (repository token, mailer token) — this is why
  interfaces + injection tokens matter (architecture.md). Never mock the ORM's
  internals; wrap them.
- With `Test.createTestingModule`, use `.overrideProvider(TOKEN).useValue(fake)`
  — don't import real infrastructure modules into unit tests.

## E2E tests — the HTTP contract

```ts
beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB_TOKEN).useValue(testDb)      // containerized/branch DB
    .compile();
  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // mirror main.ts!
  await app.init();
});

it('POST /orders → 400 on qty 0', () =>
  request(app.getHttpServer())
    .post('/orders').set(auth(user))
    .send({ productId: uuid(), quantity: 0 })
    .expect(400));
```

- **Mirror every global from `main.ts`** (pipes, filters, prefix) in the test
  app — the classic e2e gap is validation that exists in prod but not in tests.
- Real database over mocks for e2e: Testcontainers Postgres, or a **Neon
  branch** per CI run (see the neon track) — cheap, isolated, real SQL.
- Test the contract: status codes, error shapes, authz failures (the 403s
  matter more than the 200s), pagination envelope.
- Close the app in `afterAll` (`await app.close()`) — leaked handles are why
  "tests pass but CI hangs".

## What to cover

Priority order: service business rules (unit) → authz/validation behavior
(e2e) → serialization shape (e2e) → interceptors/filters (unit with mock
execution context). Controllers with no logic need no dedicated unit tests —
they're covered by e2e.
