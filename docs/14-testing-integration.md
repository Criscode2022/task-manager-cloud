---
title: Testing · integración
---

# Testing · integración

Archivo: `apps/api/test/app.integration.spec.ts`.  
Comando: `pnpm test:integration`.

Levanta **Nest de verdad** (`Test.createTestingModule` + `configureApp`) y habla por HTTP con **Supertest**. Neon no entra: se hace `overrideProvider(DatabaseService)`.

Antes de importar `AppModule` se **fuerzan** las env que `validateEnv` exige al boot (`apps/api/test/setup-env.ts`). No se usa `||=`: un JWT corto heredado del `.env` local rompería el arranque.

```ts
process.env.DATABASE_URL = 'postgresql://task:cloud@localhost/taskcloud';
process.env.JWT_SECRET = 'integration-jwt-secret-32-chars-ok';
process.env.PIN_PEPPER = 'integration-pin-pepper-32-chars-ok';
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:4200';
```

Vitest transpila los decoradores de Nest con **SWC** (`unplugin-swc` + `decoratorMetadata: true` en `vitest.integration.config.ts`). Sin metadata, `Reflector` y `DatabaseService` llegan `undefined` al `TestingModule`.

## Fake de base de datos

```ts
const fakeDb = {
  getSql: () => Object.assign(async () => [], {}) as never,
  ping: async () => undefined,
  ensureAuthSchema: async () => undefined,
};
```

`configureApp` aplica el mismo `ValidationPipe`, filtro, helmet y request-id que producción. Si un test no llama a `configureApp`, el prefix `/api` y el pipe no existen — ese es el fallo clásico de e2e Nest.

## Contratos que se afirman

```ts
it('GET /api/health returns the product payload', async () => {
  const res = await request(app.getHttpServer()).get('/api/health').expect(200);
  expect(res.body).toEqual({ ok: true, service: 'task-cloud-nest-api' });
  expect(res.headers['x-request-id']).toBeTruthy();
});

it('rejects an unauthenticated task list', async () => {
  await request(app.getHttpServer()).get('/api/tasks').expect(401);
});

it('rejects a short PIN at the DTO boundary', async () => {
  await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ pin: '12' })
    .expect(400);
});

it('rejects extra fields on login (forbidNonWhitelisted)', async () => {
  await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ pin: '12345678', admin: true })
    .expect(400);
});
```

Un PIN válido pero sin filas en el fake (`[]`) produce **401** — el login llega al servicio, no se queda en el DTO.

También se afirma `GET /api` (mismo payload que health), `GET /api/auth/me` y `POST /api/tasks` sin Bearer (**401**), y el header Helmet `x-content-type-options: nosniff`.

## Qué no cubre esta capa

El smoke `apps/api/scripts/test-api.mjs` sí habla con Neon real (`register` → `tasks` → `logout`). No corre en GitHub Actions para no depender de secretos. Úsalo en local con `pnpm api` + `pnpm --filter @task-cloud/api test:api`.
