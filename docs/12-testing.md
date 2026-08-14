---
title: Testing · visión
---

# Testing · visión

Task Cloud tiene **tres capas** de prueba más un job de **GitHub Actions**. Todas se pueden correr en local y en CI sin Neon real (excepto el smoke HTTP opcional `pnpm test:api`).

| Capa | Runner | Qué cubre | Comando |
|------|--------|-----------|---------|
| Unitario web | Jasmine + Karma (ChromeHeadless) | Componentes y servicios Angular | `pnpm test:ci` |
| Unitario API | Vitest | PIN, JWT, guards, ownership | `pnpm test:api` |
| Integración API | Vitest + Supertest + `@nestjs/testing` | HTTP real contra Nest, Neon mockeado | `pnpm test:integration` |
| E2E | Playwright (Chromium) | PWA: título, filtro, tab Options | `pnpm test:e2e` |
| Smoke Neon (opcional) | `apps/api/scripts/test-api.mjs` | API viva + `DATABASE_URL` | `pnpm --filter @task-cloud/api test:api` |

CI (`.github/workflows/ci.yml`):

1. Job **quality** — lint, unit web, unit API, integración API, `build:api`.
2. Job **e2e** — instala Chromium y lanza Playwright (el `webServer` arranca Angular con `CI=true`).

No hace falta un Postgres en Actions: la integración sustituye `DatabaseService` por un fake. El e2e no depende de que `/api` responda para pintar el header.

Siguientes documentos: [unitarios](./13-testing-unit.md) · [integración](./14-testing-integration.md) · [e2e](./15-testing-e2e.md) · [CI](./16-testing-ci.md).
