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

The work-order static deployment (`dist/`) is performed after the repair commit
is pushed. This section is updated with the resulting production URL, identity,
response-policy, and offline evidence before handoff is finalised.

## Known gaps

No code-level release blockers from `verification-3.md` remain. The previous
verifier's deployment-only observations still apply until the post-deploy check:
long-lived immutable caching for fingerprinted files and a CSP are hosting
configuration concerns, not changes to the product's PWA behavior.
