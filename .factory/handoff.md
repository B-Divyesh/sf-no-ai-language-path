# No-AI Language Path — repair handoff

## Release-blocking repair

This repair addresses the sole release blocker in independent verification report
[`verification-3.md`](verification-3.md): a fresh service worker could be active
while its first page was still uncontrolled. An immediate offline reload could
therefore request Vite's hashed module from the network and leave only the skip
link on screen.

The service worker now starts registering in `index.html`, before the app module
is requested, rather than after application startup. Its activation path claims
clients before cache cleanup. The generated worker still precaches the complete
production artifact set, including the hashed JS and CSS. This keeps the
existing local-first behavior, update toast, visual system, and researched brief
unchanged.

## Regression coverage

`tests/app.e2e.ts` now distinguishes an *active* worker from a worker that
*controls this first page*. The cold-install regression waits for client control,
confirms `/index.html` plus the current hashed JS and CSS are in Cache Storage,
clears Chromium's ordinary HTTP cache, then reloads offline. It requires the
real app heading and starter action. This is run in both Desktop Chromium and
the Playwright iPhone 13 (390 px) profile.

## Verification evidence — 2026-08-28 UTC

From a clean dependency installation:

```sh
npm ci                                                        # passed; 0 vulnerabilities
npm test                                                      # 3/3 passed
npx tsc --noEmit                                              # passed (via build too)
npm run build                                                 # passed; dist/ at artifact root
npm run test:e2e                                              # 12/12 passed: desktop + 390 px
npx playwright test --project=chromium --grep cold-install --workers=1 --repeat-each=12  # 12/12 passed
npx playwright test --project=mobile --grep cold-install --workers=1 --repeat-each=8     # 8/8 passed
npm audit --omit=dev                                         # 0 vulnerabilities
```

There is no separate lint script; TypeScript's strict production build is the
available type/lint gate. This static PWA has no publishable package/consumer
artifact beyond `dist/`.

The Playwright suite covers routine creation/completion and IndexedDB history,
desktop and 390 px layouts, keyboard skip-link and Enter activation, empty,
editor, and utility-route axe serious/critical scans, warm offline use, and the
repaired cold-install offline case. The standalone axe CLI could not run in this
container because it requires a system ChromeDriver/Chrome binary; the project
uses `@axe-core/playwright` with the installed Playwright Chromium instead.

A controlled local worker update (changed worker response after first control)
showed **“A fresh version is ready. Reload”** with no page or console errors.
Normal static review and browser requests found no analytics, telemetry, model,
third-party font, or CDN request; routine data remains in IndexedDB. The only
optional external request remains the disclosed Sociobot license API.

Local desktop Lighthouse scored **100 Performance, 100 Accessibility, 100 Best
Practices, 100 SEO** (FCP 0.3 s, LCP 0.3 s, TBT 0 ms, CLS 0). The production
bundle is 30,631 B raw / 10,742 B gzip JavaScript and 17,521 B raw / 4,770 B
gzip CSS, comfortably under the static-product budgets.

## Deployment and live verification

Repair commit `59c6baf2e7cc80e7187502b9a75bbab00106419f` was pushed to `main`
and deployed using the supplied static work-order configuration (`dist/`). Azure
Static Web Apps deployment `20874267-c464-4fb9-97fe-32b6b70d9dc5` succeeded.

- <https://no-ai-language-path.sociobot.in/> returned HTTPS 200. Its certificate
  has `CN=no-ai-language-path.sociobot.in` and a matching DNS SAN (valid through
  2027-02-27).
- `/opt/fleet/lib/verify-url.sh` passed: title and `lang` present, one `h1`, one
  `main`, no missing image alt text or unlabeled buttons, and no browser/page
  errors (2,664 ms desktop load).
- SHA-256 comparison found **13/13** deployable product files byte-identical to
  `dist/` (HTML, worker, manifest, icons, artwork, and hashed assets). The
  deployment-owned `staticwebapp.config.json` is intentionally not publicly
  served.
- In fresh live Desktop Chromium and iPhone 13 (390 px) contexts, the worker was
  allowed to control the initial page, the ordinary HTTP cache was cleared, and
  an offline reload rendered “Study by your rules.” with one `<main>`, no
  horizontal overflow, and no console/page errors.
- Live response policy includes HSTS, `Referrer-Policy:
  strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.

## Known gaps

No code-level release blockers from `verification-3.md` remain. The verifier's
non-blocking hosting observations remain: Azure serves fingerprinted assets with
30-second revalidation and does not emit a CSP. Those are deployment-platform
configuration concerns, not changes to the product's PWA behavior.
