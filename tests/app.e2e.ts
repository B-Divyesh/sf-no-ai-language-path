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

test('a fresh controlled profile boots from the precache with Vary: Origin offline', async ({ browser, browserName }, testInfo) => {
  const projectUse = testInfo.project.use;
  const baseURL = projectUse.baseURL;
  if (!baseURL) throw new Error('The offline regression test needs a configured base URL.');

  // This must be a separate brand-new context. In particular, do not reload or
  // otherwise navigate online after this page becomes controlled: that would
  // populate a request-compatible runtime entry and hide a broken precache.
  const freshContext = await browser.newContext({
    viewport: projectUse.viewport,
    userAgent: projectUse.userAgent,
    deviceScaleFactor: projectUse.deviceScaleFactor,
    isMobile: projectUse.isMobile,
    hasTouch: projectUse.hasTouch
  });
  const freshPage = await freshContext.newPage();

  try {
    await freshPage.goto(baseURL);
    await waitForServiceWorkerControl(freshPage);
    await expect.poll(() => freshPage.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    const precache = await freshPage.evaluate(async () => {
      const shellName = (await caches.keys()).find((name) => name.endsWith('-shell'));
      if (!shellName) return [];
      const shell = await caches.open(shellName);
      return Promise.all((await shell.keys()).map(async (request) => ({
        path: new URL(request.url).pathname,
        vary: (await shell.match(request, { ignoreVary: true }))?.headers.get('vary') ?? ''
      })));
    });
    expect(precache.map((entry) => entry.path)).toEqual(expect.arrayContaining([
      '/index.html',
      expect.stringMatching(/^\/assets\/index-.*\.js$/),
      expect.stringMatching(/^\/assets\/index-.*\.css$/)
    ]));
    const appAssets = precache.filter((entry) => /^\/assets\/index-.*\.(js|css)$/.test(entry.path));
    expect(appAssets).toHaveLength(2);
    // Vite preview deliberately exposes the problematic host behaviour.
    expect(appAssets.every((entry) => /origin/i.test(entry.vary))).toBe(true);

    if (browserName === 'chromium') {
      const client = await freshContext.newCDPSession(freshPage);
      await client.send('Network.clearBrowserCache');
      await client.detach();
    }
    await freshContext.setOffline(true);
    await freshPage.reload();
    await expect(freshPage.getByRole('heading', { name: 'Study by your rules.' })).toBeVisible();
    await expect(freshPage.getByRole('button', { name: 'Use the 20-minute starter' })).toBeEnabled();
  } finally {
    await freshContext.close();
  }
});
