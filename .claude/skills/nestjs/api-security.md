# NestJS API patterns & security

## Input validation — the DTO boundary

```ts
// main.ts — global, once
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // strip unknown fields (mass-assignment guard)
  forbidNonWhitelisted: true,  // …or reject them loudly
  transform: true,             // payloads become typed DTO instances
}));
```

```ts
export class CreateOrderDto {
  @IsUUID()
  productId!: string;

  @IsInt() @Min(1) @Max(100)
  quantity!: number;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @ValidateNested({ each: true }) @Type(() => AddressDto)
  shipping!: AddressDto;                      // nested DTOs validate too
}
```

- Every controller input is a decorated DTO or a built-in pipe
  (`ParseUUIDPipe`, `ParseIntPipe`, `ParseDatePipe`). A bare
  `@Body() body: any` fails review.
- Response shaping is explicit — never return entities raw:

```ts
// entity: password hash exists but can never leave the process
export class User {
  id!: string;
  email!: string;
  @Exclude() passwordHash!: string;
}
// main.ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

## Auth: guards in layers

```ts
// 1) authentication global by default; public routes are the exception
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    return isPublic || super.canActivate(ctx);
  }
}
// app.module.ts
providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard },
            { provide: APP_GUARD, useClass: RolesGuard }]

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...r: Role[]) => SetMetadata(ROLES_KEY, r);
```

```ts
// 2) authorization is TWO layers: role at the route, ownership in the service
@Roles('admin', 'support')
@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
  return this.orders.remove(id, user);
}

// orders.service.ts — the guard can't know order 123 belongs to the caller
async remove(id: string, user: User) {
  const order = await this.repo.findOne({ id, tenantId: user.tenantId });  // IDOR guard
  if (!order) throw new NotFoundException();       // 404, don't confirm existence
  ...
}
```

- JWTs: verify expiry + issuer + audience; refresh tokens rotated and stored
  **hashed**; `@CurrentUser()` as a typed decorator over `req.user`:

```ts
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest().user,
);
```

## Errors — one shape, no leaks

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const reqId = host.switchToHttp().getRequest().id;

    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }
    // unknown = bug: log the detail, return a generic 500
    this.logger.error({ reqId, err: exception });
    res.status(500).json({ statusCode: 500, message: 'Internal error', reqId });
  }
}
```

- Services throw `HttpException` subclasses (`NotFoundException`,
  `ConflictException`, …); ORM/driver errors never reach clients.
- `IntrinsicException` (v11) for expected control-flow errors that shouldn't
  auto-log.

## Hardening checklist

```ts
app.use(helmet());
app.enableCors({ origin: ['https://app.acme.com'], credentials: true }); // allowlist, not '*'
```

```ts
// @nestjs/throttler — global default, stricter on auth endpoints
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
// login controller:
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Post('login') ...
```

- [ ] Webhooks: verify signatures (Stripe/GitHub HMAC) before parsing
- [ ] File uploads: size limit + content-type + magic bytes; store outside
      the web root
- [ ] Secrets via `ConfigModule` validation (architecture.md) — the app
      refuses to boot without them
