---
title: Testing · GitHub Actions
---

# Testing · GitHub Actions

Workflow: `.github/workflows/ci.yml`. Se dispara en `push` y `pull_request` a `main`.

## Job `quality`

```yaml
- name: Lint web
  run: pnpm lint:ci
- name: Run web unit tests
  run: pnpm test:ci
- name: Run API unit tests
  run: pnpm test:api
- name: Run API integration tests
  run: pnpm test:integration
- name: Build Nest API
  run: pnpm build:api
```

`pnpm/action-setup@v4` lee `packageManager: pnpm@11.21.0`. Node 22 + cache de pnpm. `pnpm install --frozen-lockfile` falla si el lock no está commiteado.

## Job `e2e`

```yaml
- name: Install Playwright Chromium
  run: pnpm exec playwright install --with-deps chromium
- name: Run end-to-end tests
  run: pnpm test:e2e
  env:
    CI: true
    API_BASE_URL: /api
```

Chromium se instala en el runner; no se sube al repo. `retries: 2` solo en CI (`playwright.config.ts`).

## Por qué no hay errores de entorno

| Riesgo | Mitigación |
|--------|------------|
| `validateEnv` exige secretos | `test/setup-env.ts` asigna JWT/PIN de 32+ caracteres **antes** de importar `AppModule` |
| Decoradores Nest sin metadata | `unplugin-swc` con `decoratorMetadata: true` en `vitest.integration.config.ts` |
| Build nativo de SWC | `pnpm-workspace.yaml` → `allowBuilds["@swc/core"] = true` |
| Neon no está en Actions | `DatabaseService` mockeado |
| `set-env.js` pide `.env` | `CI=true` genera environments y sale 0 |
| Angular tarda en servir | `webServer.timeout: 180000` y `toBeVisible({ timeout: 20000 })` |
| Lockfile desfasado | `--frozen-lockfile` + commit de `pnpm-lock.yaml` |

Si un job rojo es flaky de Playwright, el primer sitio a mirar es el locator de Ionic (preferir `ion-tab-button[tab=…]` a `getByRole('tab')`).
