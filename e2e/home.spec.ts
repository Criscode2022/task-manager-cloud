import { expect, test, type Page } from '@playwright/test';

async function openPwa(page: Page) {
  await page.goto('/');
  await expect(page.locator('ion-tab-bar')).toBeVisible({ timeout: 20_000 });
}

test.describe('Task Cloud PWA', () => {
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
    await expect(page.locator('app-tab-options h1')).toContainText(
      /settings|configuracion/i,
    );
  });

  test('creates a local task from the overlay form', async ({ page }) => {
    await openPwa(page);
    const form = page.locator('form.task-form');
    await expect(form).toBeVisible();
    await form.locator('input[matInput]').first().fill('E2E milk');
    await form.evaluate((el) => (el as HTMLFormElement).requestSubmit());

    await expect(page.locator('.task-title').filter({ hasText: 'E2E milk' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
