import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
}

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

test('supports keyboard skip navigation and primary action', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const starter = page.getByRole('button', { name: 'Use the 20-minute starter' });
  await starter.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Listen once, then again' })).toBeVisible();
});

test('keeps headings and accessibility clean across utility pages and the editor', async ({ page }) => {
  for (const path of ['/history', '/rules', '/data', '/plus', '/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')), path).toEqual([]);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Add one block' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialogResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(dialogResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
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

test('cold-install precaches the hashed app shell before an offline reload', async ({ page, context, browserName }) => {
  // `ready` only says that a worker is active. A cold offline navigation needs
  // the stronger guarantee that this first page is already controlled.
  await waitForServiceWorkerControl(page);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()));
    return urls.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedUrls).toContain('/index.html');
  expect(cachedUrls).toEqual(expect.arrayContaining([
    expect.stringMatching(/^\/assets\/index-.*\.js$/),
    expect.stringMatching(/^\/assets\/index-.*\.css$/)
  ]));

  // Reproduce the verifier's fresh-profile condition: retain Cache Storage but
  // remove the ordinary HTTP cache before taking the next navigation offline.
  if (browserName === 'chromium') {
    const client = await context.newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await client.detach();
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Study by your rules.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use the 20-minute starter' })).toBeEnabled();
});
