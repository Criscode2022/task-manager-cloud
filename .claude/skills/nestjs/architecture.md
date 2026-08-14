# NestJS architecture

## Modules & DI

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Order])],  // deps this domain needs
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_REPO, useClass: TypeOrmOrdersRepo },  // port → adapter
  ],
  exports: [OrdersService],                      // ONLY what others may use
})
export class OrdersModule {}
```

Interfaces + tokens make implementations swappable in tests and per
environment:

```ts
// orders/ports.ts — the domain's contract with the outside world
export const ORDERS_REPO = Symbol('ORDERS_REPO');
export interface OrdersRepo {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// consumed via the token, never the concrete class
@Injectable()
export class OrdersService {
  constructor(@Inject(ORDERS_REPO) private readonly repo: OrdersRepo) {}
}
```

- Feature modules own their domain; `exports` is the public API — an empty
  exports array is a feature, not an oversight.
- Circular dependency (`forwardRef`) is a design smell: extract the shared
  piece into a third module instead.
- Scopes: singleton for everything unless you have a per-request reason —
  `Scope.REQUEST` bubbles up the injection chain and costs instantiation per
  request; measure before using.

## Configuration — crash at boot, not at first request

```ts
// config/env.validation.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  PAYMENT_MODE: z.enum(['sandbox', 'live']),
  JWT_SECRET: z.string().min(32),
});

// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: (env) => envSchema.parse(env),   // throws with a precise message at boot
});
```

Typed namespaces instead of scattered `process.env` reads:

```ts
// config/db.config.ts
export const dbConfig = registerAs('db', () => ({
  url: process.env.DATABASE_URL!,
  poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
}));

// consumption — fully typed
constructor(@Inject(dbConfig.KEY) private readonly db: ConfigType<typeof dbConfig>) {}
```

## Lifecycle & operations

```ts
// main.ts — the production-grade bootstrap
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
});
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.enableShutdownHooks();               // required for zero-downtime deploys
app.enableCors({ origin: ALLOWED_ORIGINS });
await app.listen(port);
```

```ts
// close resources cleanly — mirror of what onModuleInit opened
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit()    { await this.worker.run(); }
  async onModuleDestroy() { await this.worker.close(); }   // drain, don't drop
}
```

- Long-lived work goes to queues (`@nestjs/bullmq`) or `@nestjs/schedule`
  tasks — never fire-and-forget promises inside request handlers (they die
  with the request context and swallow errors).
- One structured log line per request with a correlation id (interceptor or
  middleware); health endpoint via `@nestjs/terminus`:

```ts
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}
  @Get() @HealthCheck()
  check() { return this.health.check([() => this.db.pingCheck('database')]); }
}
```

## v11 niceties worth using

- `NestFactory.create(AppController)` — module-less bootstrap for tiny
  services/functions.
- `unwrap()` on microservice clients (Kafka/NATS/Redis) for
  provider-specific features the Nest API doesn't cover.
- `IntrinsicException` for expected control-flow errors that shouldn't spam
  logs.
