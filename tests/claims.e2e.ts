import { expect, test, type Browser, type Page } from '@playwright/test';

async function clearData(page: Page) {
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

async function openDemo(page: Page) {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
}

async function finishSample(page: Page) {
  await page.getByRole('button', { name: 'Start the sample session' }).click();
  for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: /Mark done and continue/ }).click();
  await page.getByRole('button', { name: /Finish session/ }).click();
}

async function seedDemoHistory(page: Page, count: number) {
  await page.evaluate(async (historyCount) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('demo:no-ai-language-path', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = db.transaction('state').objectStore('state').get('primary');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    state.history = Array.from({ length: historyCount }, (_, index) => ({ id: `h${index}`, completedAt: new Date(Date.now() - index * 86_400_000).toISOString(), durationSeconds: 60, blockIds: ['sample-listen'], stage: 0 }));
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite');
      tx.objectStore('state').put(state, 'primary');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, count);
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await clearData(page);
});

test('sample changes stay separate and reset cleanly @claim:demo-isolation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add the 20-minute starter' }).click();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.getByRole('button', { name: /Edit Listen to a short news clip/ }).click();
  await page.getByLabel('Short title').fill('Changed demo block');
  await page.getByRole('button', { name: 'Save block' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.getByRole('heading', { name: 'Listen to a short news clip' })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page.getByRole('heading', { name: 'Listen twice' })).toBeVisible();
});

test('a routine contains listening, reading, speaking, and recall @claim:four-part-routine', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('.block-type')).toHaveText(['Listen', 'Read', 'Speak', 'Recall']);
  await expect(page.getByText('20 min', { exact: true })).toBeVisible();
});

test('a learner can edit a routine block @claim:edit-blocks', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: /Edit Listen to a short news clip/ }).click();
  await page.getByLabel('Short title').fill('Listen to saved radio');
  await page.getByRole('button', { name: 'Save block' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Listen to saved radio' })).toBeVisible();
});

test('a learner can reorder routine blocks @claim:reorder-blocks', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Move Read the matching summary earlier' }).click();
  await expect(page.locator('.block h3').first()).toHaveText('Read the matching summary');
  await page.reload();
  await expect(page.locator('.block h3').first()).toHaveText('Read the matching summary');
});

test('a saved source link remains private until opened @claim:private-source-links', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('button', { name: /Edit Listen to a short news clip/ }).click();
  await page.getByLabel('Source link').fill('https://example.org/private-audio');
  await page.getByRole('button', { name: 'Save block' }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: /Open source/ })).toHaveAttribute('href', 'https://example.org/private-audio');
  expect(requests.some((url) => url.startsWith('https://example.org'))).toBe(false);
});

test('the timer flow presents every block as a checklist @claim:guided-session', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start the sample session' }).click();
  await expect(page.getByRole('list', { name: 'Session progress' }).getByRole('listitem')).toHaveCount(4);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByText('Counting down')).toBeVisible();
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await page.getByRole('button', { name: /Mark done and continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Read the matching summary' })).toBeVisible();
});

test('a complete routine adds a persistent history row @claim:completion-history', async ({ page }) => {
  await openDemo(page);
  await finishSample(page);
  await page.getByRole('link', { name: 'Review history' }).click();
  await expect(page.locator('.history-list li')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.history-list li')).toHaveCount(3);
});

test('the configured completion count advances the stage @claim:progression-rule', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('2/3')).toBeVisible();
  await finishSample(page);
  await expect(page.getByRole('heading', { name: 'Stage 2: Build range' })).toBeVisible();
});

test('changing the rule does not rewrite history @claim:rule-preserves-history', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Rules' }).click();
  await page.getByLabel('Sessions per stage').fill('5');
  await page.getByRole('button', { name: 'Save rule' }).click();
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-list li')).toHaveCount(2);
});

test('content and difficulty change only through learner actions @claim:user-controlled-content', async ({ page }) => {
  await openDemo(page);
  const original = await page.locator('.block h3').allTextContents();
  await page.getByRole('link', { name: 'Rules' }).click();
  await page.getByLabel('Sessions per stage').fill('6');
  await page.getByRole('button', { name: 'Save rule' }).click();
  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.locator('.block h3')).toHaveText(original);
  await expect(page.getByText('2/6')).toBeVisible();
});

test('the sample reloads offline after the first visit @claim:offline-reload', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use });
  const page = await context.newPage();
  try {
    await page.goto(`${testInfo.project.use.baseURL}/demo`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    const client = await context.newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await client.detach();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
    await expect(page.getByText(/Offline:/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('the manifest and active worker support installation @claim:installable-pwa', async ({ page }) => {
  await openDemo(page);
  const manifest = await page.evaluate(async () => fetch('/manifest.webmanifest').then((response) => response.json()));
  expect(manifest).toMatchObject({ name: 'No-AI Language Path', display: 'standalone' });
  expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: '192x192' }), expect.objectContaining({ sizes: '512x512' })]));
  expect(await page.evaluate(async () => Boolean(await navigator.serviceWorker.ready))).toBe(true);
});

test('routine changes survive reload @claim:local-persistence', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: /Edit Recall useful phrases/ }).click();
  await page.getByLabel('Minutes').fill('9');
  await page.getByRole('button', { name: 'Save block' }).click();
  await page.reload();
  await expect(page.getByText('25 min', { exact: true })).toBeVisible();
});

test('normal use sends no study data or tracking requests @claim:privacy-network', async ({ page }) => {
  const requests: { url: string; method: string }[] = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  await openDemo(page);
  await page.getByRole('button', { name: /Edit Listen to a short news clip/ }).click();
  await page.getByLabel('Short title').fill('Private title');
  await page.getByRole('button', { name: 'Save block' }).click();
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await page.getByRole('button', { name: 'Download JSON backup' }).click();
  expect(requests.every((request) => new URL(request.url).origin === new URL(test.info().project.use.baseURL!).origin)).toBe(true);
  expect(requests.every((request) => request.method === 'GET')).toBe(true);
});

test('the sample works without an account @claim:no-account', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start the sample session' }).click();
  await expect(page.getByRole('button', { name: /Mark done and continue/ })).toBeEnabled();
});

test('import reads a file without uploading it @claim:no-file-upload', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('link', { name: 'Data' }).click();
  await page.getByLabel('Choose JSON file').setInputFiles('tests/fixtures/fractional-import.json');
  await expect(page.getByRole('alert')).toContainText('not changed');
  expect(requests.every((url) => new URL(url).origin === new URL(test.info().project.use.baseURL!).origin)).toBe(true);
});

test('JSON export contains routine, rules, and complete history @claim:complete-export', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON backup' }).click();
  const download = await downloadPromise;
  const content = await (await download.createReadStream()).toArray();
  const exported = JSON.parse(Buffer.concat(content).toString('utf8'));
  expect(exported).toMatchObject({ routineName: 'Spanish news practice', sessionsPerStage: 3 });
  expect(exported.blocks).toHaveLength(4);
  expect(exported.history).toHaveLength(2);
});

test('import asks before replacing current data @claim:confirmed-import', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByLabel('Choose JSON file').setInputFiles('tests/fixtures/valid-import.json');
  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.getByRole('heading', { name: 'Spanish news practice' })).toBeVisible();
  await page.getByRole('link', { name: 'Data' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Choose JSON file').setInputFiles('tests/fixtures/valid-import.json');
  await expect(page.getByRole('heading', { name: 'Imported French routine' })).toBeVisible();
});

test('local deletion removes the routine and history @claim:erase-local-data', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByRole('button', { name: 'Add the 20-minute starter' }).click();
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Erase routine and history' }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Routine' }).click();
  await expect(page.getByRole('heading', { name: 'No blocks yet' })).toBeVisible();
});

test('core study and data actions work without a license @claim:free-core', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('button', { name: 'Start the sample session' })).toBeEnabled();
  await page.getByRole('link', { name: 'Rules' }).click();
  await expect(page.getByRole('button', { name: 'Save rule' })).toBeEnabled();
  await page.getByRole('link', { name: 'Data' }).click();
  await expect(page.getByRole('button', { name: 'Download JSON backup' })).toBeEnabled();
});

test('Plus shows the $12 one-time offer and registration status @claim:plus-offer', async ({ page }) => {
  await openDemo(page);
  await page.goto('/plus?demo=1');
  await expect(page.getByText('Plus costs $12 once.')).toBeVisible();
  await expect(page.getByText('Checkout is not available yet.')).toBeVisible();
});

test('Plus displays all sessions from the last 90 days @claim:plus-history', async ({ page }) => {
  await openDemo(page);
  await seedDemoHistory(page, 18);
  await page.evaluate(() => {
    localStorage.setItem('sb_license:no-ai-language-path', 'cached-valid');
    localStorage.setItem('sb_license_verdict:no-ai-language-path', JSON.stringify({ valid: true, checkedAt: Date.now() }));
  });
  await page.goto('/history?demo=1');
  await expect(page.locator('.history-list li')).toHaveCount(18);
});

test('Plus can print a study sheet @claim:print-study-sheet', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => {
    localStorage.setItem('sb_license:no-ai-language-path', 'cached-valid');
    localStorage.setItem('sb_license_verdict:no-ai-language-path', JSON.stringify({ valid: true, checkedAt: Date.now() }));
  });
  await page.goto('/history?demo=1');
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'yes'; }; });
  await page.getByRole('button', { name: 'Print study sheet' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
});

test('a valid license can be restored on another device @claim:restore-license', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/no-ai-language-path/verify?license=valid-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) }));
  await openDemo(page);
  await page.goto('/plus?demo=1');
  await page.getByLabel('License token').fill('valid-token');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.locator('#main').getByText('Plus is active on this device.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb_license:no-ai-language-path'))).toBe('valid-token');
});

test('an invalid or refunded license removes paid controls @claim:revoked-license', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/no-ai-language-path/verify?license=revoked-token', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'revoked', expires_at: null }) }));
  await openDemo(page);
  await page.evaluate(() => {
    localStorage.setItem('sb_license:no-ai-language-path', 'cached-valid');
    localStorage.setItem('sb_license_verdict:no-ai-language-path', JSON.stringify({ valid: true, checkedAt: Date.now() }));
  });
  await page.goto('/plus?demo=1');
  await expect(page.locator('#main').getByText('Plus is active on this device.')).toBeVisible();
  await page.getByLabel('License token').fill('revoked-token');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await page.goto('/history?demo=1');
  await expect(page.getByRole('button', { name: 'Print study sheet' })).toHaveCount(0);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('sb_license_verdict:no-ai-language-path')) || '{}').valid).toBe(false);
});

test('production output serves the app entry point @claim:build-output', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toHaveCount(1);
  expect(process.versions.node.split('.')[0]).toBe('22');
});
