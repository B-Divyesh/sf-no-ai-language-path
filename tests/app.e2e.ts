import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('no-ai-language-path');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.reload();
});

test('builds a starter path, completes it, and keeps history', async ({ page }) => {
  await page.getByRole('button', { name: 'Use the 20-minute starter' }).click();
  await expect(page.getByRole('heading', { name: 'Listen once, then again' })).toBeVisible();
  await page.getByRole('button', { name: /Start 20-minute session/ }).click();
  await expect(page.getByRole('heading', { name: 'Listen once, then again' })).toBeVisible();
  await page.getByRole('button', { name: /Mark done/ }).click();
  await page.getByRole('button', { name: /Mark done/ }).click();
  await page.getByRole('button', { name: /Mark done/ }).click();
  await page.getByRole('button', { name: /Finish session/ }).click();
  await expect(page.getByRole('heading', { name: 'You kept the path.' })).toBeVisible();
  await page.getByRole('link', { name: 'See history' }).click();
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('4 blocks')).toBeVisible();
});

test('has no serious accessibility violations on the empty path', async ({ page }) => {
  await expect(page.locator('h1')).toHaveCount(1);
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('the app shell and saved path work offline', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Use the 20-minute starter' }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Listen once, then again' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start 20-minute session/ })).toBeEnabled();
});
