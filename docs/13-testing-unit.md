---
title: Testing · unitarios
---

# Testing · unitarios

Los unitarios instancian la clase **sin** HTTP y **sin** Neon. En la API se usa Vitest (`globals: true`). En la web, Jasmine/Karma.

## PIN (`apps/api/src/auth/pin.util.spec.ts`)

El lookup del PIN es HMAC-SHA256 con `PIN_PEPPER`. El hash persistido es bcrypt, con un fallback SHA-256 de la era anterior.

```ts
it('accepts exactly 8 digits', () => {
  expect(isValidPin('12345678')).toBe(true);
  expect(isValidPin('1234567')).toBe(false);
  expect(isValidPin('1234567a')).toBe(false);
});

it('verifies a bcrypt PIN hash', async () => {
  const hash = await hashPin('87654321');
  expect(await verifyPinHash('87654321', hash)).toBe(true);
  expect(await verifyPinHash('00000000', hash)).toBe(false);
});
```

## JWT (`apps/api/src/auth/auth.service.spec.ts`)

`AuthService` se construye a mano con un `ConfigService` falso. Así se firma y se verifica un token sin Nest.

```ts
const token = await auth.createAccessToken({
  userId: 42,
  sessionId: 'sid-1',
  expiresAt: new Date(Date.now() + 60_000),
});
const claims = await auth.verifyAccessToken(token);
expect(claims.userId).toBe(42);
expect(claims.sessionId).toBe('sid-1');
```

`extractBearerToken` solo acepta el esquema `Bearer`:

```ts
expect(auth.extractBearerToken('Bearer abc.def')).toBe('abc.def');
expect(auth.extractBearerToken('Basic nope')).toBe('');
```

## Ownership (`apps/api/src/users/users.service.spec.ts`)

Si el `actorId` no coincide, el servicio lanza `NotFoundException` (no 403: no se confirma que el recurso existe).

```ts
it('hides another user behind 404', () => {
  expect(() => users.getOwnUser(1, 99)).toThrow(NotFoundException);
});
```

El mismo criterio está en `TasksService.updateTaskForUser` / `deleteTaskForUser`.

## Guard (`apps/api/src/auth/auth.guard.spec.ts`)

El `Reflector` decide si la ruta es `@Public()`. Sin token y sin `@Public()`, el guard responde 401.

```ts
it('lets public handlers through', async () => {
  const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
  const guard = new AuthGuard(auth, reflector);
  await expect(guard.canActivate(ctx())).resolves.toBe(true);
});
```

## Web — filtro de estado (`apps/web/src/app/core/services/task.service.spec.ts`)

Ionic Storage se sustituye por un `Map`. `changeFilter()` recorre `All → Done → Pending`.

```ts
expect(service.filter()).toBe(StatusEnum.All);
service.changeFilter();
expect(service.filter()).toBe(StatusEnum.Done);
```

Al guardar, una tarea sin `priority` queda en `medium` y `tags` en `[]`. Los tags se recortan y pasan a minúsculas (`"  Work "` → `"work"`). El filtro hidrata Ionic Storage:

```ts
store.set('filter', StatusEnum.Done);
await service.init();
expect(service.filter()).toBe(StatusEnum.Done);
```

`TabListPage` (Jasmine) cubre búsqueda por título/descripcion/tag, el overlay de crear y que el chip de prioridad no se pinte como badge.
