---
title: Testing · e2e
---

# Testing · e2e

Playwright en la raíz del monorepo. Config: `playwright.config.ts`. Specs: `e2e/home.spec.ts`.

```bash
pnpm test:e2e
```

En CI, Playwright arranca Angular solo:

```ts
webServer: {
  command: 'pnpm --filter @task-cloud/web start',
  url: 'http://127.0.0.1:4200',
  env: { CI: 'true', API_BASE_URL: '/api' },
}
```

`CI=true` hace que `apps/web/scripts/set-env.js` genere `environment.local.ts` **sin** copiar `.env` (no hay secretos en Actions).

## Specs reales

```ts
async function openPwa(page: Page) {
  await page.goto('/');
  await expect(page.locator('ion-tab-bar')).toBeVisible({ timeout: 20_000 });
}

test('renders the product title in the header', async ({ page }) => {
  await openPwa(page);
  await expect(page.locator('h1.header-title')).toContainText(/Task Cloud/i);
});

test('shows the All filter control', async ({ page }) => {
  await openPwa(page);
  await expect(page.locator('.filter-button')).toBeVisible();
});

test('can open the Options tab', async ({ page }) => {
  await openPwa(page);
  await page.locator('ion-tab-button[tab="options"]').click();
  await expect(page).toHaveURL(/options/i);
  await expect(page.locator('app-tab-options h1')).toContainText(/settings|configuracion/i);
});

test('creates a local task from the overlay form', async ({ page }) => {
  await openPwa(page);
  const form = page.locator('form.task-form');
  await form.locator('input[matInput]').first().fill('E2E milk');
  await form.evaluate((el) => (el as HTMLFormElement).requestSubmit());
  await expect(page.locator('.task-title').filter({ hasText: 'E2E milk' })).toBeVisible();
});
```

Ionic no expone `role="tab"` de forma fiable en `ion-tab-button`, por eso el locator usa el atributo `tab="options"`. El título se afirma con `h1.header-title` (el `h1` dentro de `ion-toolbar` no siempre entra en el árbol de `heading`).

La creación e2e es **offline**: rellena el overlay de `tab-list` y afirma `.task-title`. No hace falta Neon.

Esta suite también pilla regresiones de arranque:

- `provideTranslateHttpLoader()` va en `providers` de `AppModule`, no en `TranslateModule.forRoot({ loader })`. Si no, `NG0201: No provider found for TranslateLoader`.
- En pnpm, `preserveSymlinks: true` en `angular.json` + `PathLocationStrategy` evitan `NG0203` al inyectar `LocationStrategy` (la PWA quedaba en `<ion-app></ion-app>` vacío).

La PWA pinta lista y opciones **offline**. No se afirma sync/PIN en e2e de CI (eso es el smoke Neon).
