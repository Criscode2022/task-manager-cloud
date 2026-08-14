import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DatabaseService } from '../src/database/database.service';

describe('API integration (mocked Neon)', () => {
  let app: INestApplication;

  const fakeDb: Pick<
    DatabaseService,
    'getSql' | 'ping' | 'ensureAuthSchema'
  > = {
    getSql: () =>
      Object.assign(async () => [], {
        // tagged template used by neon
      }) as never,
    ping: async () => undefined,
    ensureAuthSchema: async () => undefined,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(fakeDb)
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health returns the product payload', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ ok: true, service: 'task-cloud-nest-api' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('rejects an unauthenticated task list', async () => {
    const res = await request(app.getHttpServer()).get('/api/tasks').expect(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  it('rejects a short PIN at the DTO boundary', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ pin: '12' })
      .expect(400);
    expect(res.body.error).toMatch(/pin/i);
  });

  it('rejects extra fields on login (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ pin: '12345678', admin: true })
      .expect(400);
  });

  it('returns 401 for an unknown PIN (empty user table)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ pin: '12345678' })
      .expect(401);
  });

  it('rejects GET /api/auth/me without a bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  it('rejects POST /api/tasks without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'Milk', description: '', done: false, priority: 'medium', tags: [] })
      .expect(401);
  });

  it('serves GET /api with the same product payload as /health', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);
    expect(res.body).toEqual({ ok: true, service: 'task-cloud-nest-api' });
  });

  it('sets Helmet nosniff on JSON responses', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
