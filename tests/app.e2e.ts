import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
}

async function clearProductData(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    for (const name of ['no-ai-language-path', 'demo:no-ai-language-path']) {
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  });
}

test.beforeEach(async ({ page }) => {
  await clearProductData(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build a private language study routine');
});

test('the first screen states the job, audience, and one-click sample action', async ({ page }) => {
  await expect(page.getByText(/For language learners who use their own material/)).toBeVisible();
  const action = page.getByRole('link', { name: 'Try it with sample data' });
  await expect(action).toBeInViewport();
  await action.click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
  await expect(page.getByText('2/3')).toBeVisible();
});

test('demo edits and reset never change the real routine', async ({ page }) => {
  await page.getByRole('button', { name: 'Add the 20-minute starter' }).click();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.getByRole('button', { name: /Edit Listen to a short news clip/ }).click();
  await page.getByLabel('Short title').fill('Changed sample title');
  await page.getByRole('button', { name: 'Save block' }).click();
  await expect(page.getByRole('heading', { name: 'Changed sample title' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.getByRole('heading', { name: 'Listen to a short news clip' })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Listen twice' })).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toHaveCount(0);
});

test('completes the sample routine and keeps its local history', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample session' }).click();
  for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: /Mark done and continue/ }).click();
  await page.getByRole('button', { name: /Finish session/ }).click();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Stage 2/ })).toBeVisible();
  await page.getByRole('link', { name: 'Review history' }).click();
  await expect(page.locator('.history-list li')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.history-list li')).toHaveCount(3);
});

test('rejects fractional imported rules and stages without changing data', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Data' }).click();
  await page.getByLabel('Choose JSON file').setInputFiles('tests/fixtures/fractional-import.json');
  await expect(page.getByRole('alert')).toContainText('Your current data was not changed');
  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
  await expect(page.getByText('Stage 1: Settle in')).toBeVisible();
});

test('moves focus on routes and restores it after closing a dialog', async ({ page }) => {
  await page.getByRole('link', { name: 'Rules' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page).toHaveTitle('Progression rules — No-AI Language Path');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const opener = page.getByRole('button', { name: 'Add your first block instead' });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(opener).toBeFocused();
});

test('supports keyboard navigation, visible focus, and reduced motion', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const action = page.getByRole('link', { name: 'Try it with sample data' });
  await action.focus();
  const focus = await action.evaluate((element) => ({ outline: getComputedStyle(element).outlineWidth, color: getComputedStyle(element).outlineColor }));
  expect(focus).toEqual({ outline: '4px', color: 'rgb(36, 87, 214)' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await action.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('1e-06s');
});

test('has accessible routes, route titles, and 44px navigation targets', async ({ page }) => {
  const routes = ['/demo', '/history', '/rules', '/data', '/plus', '/privacy', '/terms'];
  for (const path of routes) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    expect(await page.title(), path).not.toBe('No-AI Language Path — Build a study routine');
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')), path).toEqual([]);
  }
  await page.goto('/');
  for (const link of await page.locator('.brand, .site-header nav a, .footer-links a').all()) {
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('returns a designed HTTP 404 for an unknown route', async ({ page }) => {
  const response = await page.goto('/not-a-real-page');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — No-AI Language Path');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the routine builder' })).toBeVisible();
});

test('loads without console errors under the production CSP', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Rules' }).click();
  await page.getByRole('link', { name: 'Data' }).click();
  expect(errors).toEqual([]);
});

test('stores a returned license and removes it from the address bar', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/no-ai-language-path/verify?license=returned-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) }));
  await page.goto('/plus?license=returned-token');
  await expect(page.locator('#main').getByText('Plus is active on this device.')).toBeVisible();
  await expect(page).toHaveURL('/plus');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:no-ai-language-path'))).toBe('returned-token');
});

test('a fresh controlled profile boots from the precache with Vary: Origin offline', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL) throw new Error('The offline regression needs a base URL.');
  const freshContext = await browser.newContext({ ...testInfo.project.use });
  const freshPage = await freshContext.newPage();
  try {
    await freshPage.goto(`${baseURL}/demo`);
    await waitForServiceWorkerControl(freshPage);
    const precache = await freshPage.evaluate(async () => {
      const shellName = (await caches.keys()).find((name) => name.endsWith('-shell'))!;
      const shell = await caches.open(shellName);
      return Promise.all((await shell.keys()).map(async (request) => ({ path: new URL(request.url).pathname, vary: (await shell.match(request, { ignoreVary: true }))?.headers.get('vary') ?? '' })));
    });
    expect(precache.map((entry) => entry.path)).toEqual(expect.arrayContaining(['/index.html', expect.stringMatching(/^\/assets\/index-.*\.js$/), expect.stringMatching(/^\/assets\/index-.*\.css$/)]));
    expect(precache.map((entry) => entry.path)).not.toContain('/staticwebapp.config.json');
    expect(precache.filter((entry) => /^\/assets\/index-.*\.(js|css)$/.test(entry.path)).every((entry) => /origin/i.test(entry.vary))).toBe(true);
    const client = await freshContext.newCDPSession(freshPage);
    await client.send('Network.clearBrowserCache');
    await client.detach();
    await freshContext.setOffline(true);
    await freshPage.reload();
    await expect(freshPage.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
    await expect(freshPage.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  } finally {
    await freshContext.close();
  }
});
