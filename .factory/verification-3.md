# Independent verification 3 — FAIL

**Work order:** `no-ai-language-path-verify-3`  
**Candidate:** `b9c41fd8d32f03fc0ebed0c9ed16dbc51a5ddb49`  
**Live URL:** <https://no-ai-language-path.sociobot.in/>  
**Tested:** 2026-08-28 UTC

## Verdict

**FAIL — do not release this candidate as a reliable offline PWA.** The prior deployment-only problem is fixed: the live product is the exact candidate artifact and one-off cold offline checks succeed. However, the candidate's required cold-install/offline regression is intermittent. The complete browser suite failed in both desktop and mobile on this path, and a sequential Chromium repeat failed 1 of 6 runs. A learner can therefore get the blank application shell during the product's core immediate-offline scenario.

No product code was changed for this verification.

## Release blocker

### High — cold-install offline reload is nondeterministic

The production worker correctly precaches `/index.html`, current hashed JS and CSS, assets, manifest, and icons. But directly after `navigator.serviceWorker.ready`, an offline reload sometimes is not controlled by that worker. The module request then goes to the network and fails with `net::ERR_INTERNET_DISCONNECTED`; the document retains only “Skip to main content” and no app heading.

Fresh evidence:

- `npm run test:e2e` left `test-results/.last-run.json` with `status: "failed"` and both Desktop Chromium and 390px mobile cold-install tests failed.
- `npx playwright test --project=chromium --grep 'cold-install' --workers=1 --repeat-each=6` failed its second repetition (1/6 failures). The failing trace records a request for `/assets/index-DbQ5cBAh.js` after offline mode with `net::ERR_INTERNET_DISCONNECTED`; the assertion at `tests/app.e2e.ts:95` then timed out waiting for `Study by your rules.`
- A one-off local and a one-off live attempt passed, including cache inspection. That demonstrates the generated precache is present, but not that the first offline navigation is reliable.

This is most consistent with an activation/client-control race: `ready` can resolve before the page has a controller. The recovery must make immediate offline navigation deterministic and make the full suite reliable, then be reverified on both desktop and 390px mobile.

## Passed evidence

### Clean install, build, and available checks

```sh
npm ci                         # 50 packages added; 0 vulnerabilities
npm test                       # 3/3 Vitest tests passed
npm run build                  # tsc + Vite + generated production SW passed
npm audit --omit=dev           # 0 vulnerabilities
```

There is no lint script; `npm run build` performs the available TypeScript check. The build generated a 12-file precache (`nlp-1122a09783f9`). Initial bundles meet the supplied budgets: JS 30,684 B raw / 10,760 B gzip; CSS 17,521 B raw / 4,770 B gzip; 390px hero 107,862 B.

Local production Lighthouse (mobile configuration) scored **99 Performance, 100 Accessibility, 100 Best Practices, 100 SEO**: FCP 0.9 s, LCP 2.0 s, TBT 60 ms, CLS 0.

### Product behavior and recovery

On the exact production build, in both desktop Chromium and the 390px iPhone-13 profile, I independently:

- created a private one-block routine, rejected 0 minutes, rejected an `ftp:` source with the displayed HTTPS/HTTP recovery message, then saved a valid HTTPS source and the 90-minute upper boundary;
- rejected invalid JSON import without replacing current data, downloaded a JSON backup, rejected a threshold of 31, then saved 1;
- completed the routine and observed local history. The repository's desktop and mobile end-to-end path/history tests also passed;
- found no console/page errors, failed requests, horizontal overflow, or axe serious/critical findings on the empty and edited route; body text remained 16px at 390px;
- verified keyboard skip-link activation, a visible `rgb(36, 87, 214)` 4px focus ring, keyboard activation coverage in both repository profiles, and reduced-motion transitions of 0.001 ms.

The live `/`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms` routes each returned 200, had the expected title, exactly one `h1` and one `main`, zero axe serious/critical findings, and no browser errors.

### Privacy, PWA, and live identity

- Normal local and live first loads requested only their respective first-party origin; no telemetry, model, third-party font, CDN, or analytics request was observed. Static review found no upload path; study state uses IndexedDB. The only external endpoint in source is the disclosed Sociobot billing API, used only after a returned/pasted license.
- The manifest has required name/short name, standalone display, matching colours, versioned start URL, and 192/512 icons with a maskable 512 icon.
- A controlled service-worker update test changed the served worker version after first control; the candidate displayed “A fresh version is ready. Reload” with no errors.
- A SHA-256 comparison of all 13 non-source-map files in `dist/` against the live origin found **13/13 byte-identical** (including HTML, JS, CSS, manifest, assets, icons, and `sw.js`). TLS presented `CN=no-ai-language-path.sociobot.in` with a matching SAN, and HTTP redirects to HTTPS.

## Non-blocking deployment observations

These are not the reason for the FAIL, but should be hardened by the deployment owner:

- Live HTML and hashed assets use `Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived immutable caching for fingerprinted assets.
- HTTPS serves HSTS, `strict-origin-when-cross-origin`, and `nosniff`, but no Content-Security-Policy header was present.

## Reproduction commands

```sh
npm ci
npm test
npm run build
npm run test:e2e
npx playwright test --project=chromium --grep 'cold-install' --workers=1 --repeat-each=6
npm audit --omit=dev
```

