# Repair handoff — PASS

## Release-blocking repair

The portable first-offline-reload failure in verifier report 4 is repaired. The generated service worker now looks up only the revisioned same-origin **precache** with `ignoreVary: true`; runtime-cache lookup retains normal `Vary` semantics. This handles static hosts such as `vite preview` that return `Vary: Origin`, where a precache request made by `cache.addAll()` has no `Origin` header but the controlled page's module and stylesheet requests do.

I reproduced the reported candidate failure in an isolated checkout of `8b10468ac085e39c9aded3295d78b5f73e8ccfb5`: a fresh controlled Chromium context, after ordinary HTTP-cache clearing and an immediate offline reload, had **0 h1 elements** and both current hashed CSS and JS failed with `net::ERR_FAILED`.

`tests/app.e2e.ts` now has an exact regression for that condition. It creates a separate new browser context (with no intervening controlled online navigation), verifies that `vite preview` has stored `Vary: Origin` on the two hashed assets, clears only the HTTP cache, sets the context offline, reloads, and requires the app heading and starter action. It passed in both Desktop Chrome and the iPhone 13 / 390px project.

## Verification performed

From a clean dependency install:

```sh
npm ci                         # passed; 0 vulnerabilities
npm test                       # passed; 3/3 Vitest tests
npx tsc --noEmit               # passed
npm run build                  # passed; dist/ contains index.html and a 12-file precache
npm run test:e2e               # passed; 12/12 desktop and 390px tests
npm audit --omit=dev           # passed; 0 vulnerabilities
```

There is no separate lint script in this TypeScript project; `npx tsc --noEmit` is its static check. There is no package/consumer surface beyond the static PWA artifact.

- Production assets: JS 30,627 B raw / 10,740 B gzip; CSS 17,521 B raw / 4,770 B gzip; within the product budgets.
- Local mobile Lighthouse: **100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO** (FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0).
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ .factory/evidence` passed: title, `lang=en`, one `h1`, `main`, image alt coverage, labelled buttons, and no page or console errors (630 ms load).
- Browser coverage includes the real starter path/session/history, keyboard skip link and Enter action, utility/editor axe checks, desktop and 390px layouts, saved-path offline reuse, and the fresh PWA cold reload above. Axe found no serious or critical violations.
- An explicit update probe served a changed worker after initial control; the in-app **“A fresh version is ready. Reload”** toast appeared with no errors.
- A normal browser load requested only `http://127.0.0.1:4173`; static review found no analytics, telemetry, model calls, third-party scripts/fonts, or upload route. Study data remains IndexedDB-local; the optional disclosed Sociobot billing call is reachable only after a supplied license.
- The service worker is cache-first for revisioned shell assets, network-first for navigation with an offline fallback, uses versioned caches, `skipWaiting`, `clientsClaim`, and now performs the required Vary-tolerant shell lookup.

## Deploy and handoff

Commit `0a6f7f0` (`fix: make PWA precache Vary-tolerant`) is pushed to `main` and was deployed as the unchanged static artifact root at `dist/` using `/opt/fleet/lib/deploy-static.sh no-ai-language-path /work/repo/dist` (Azure deployment `c074d3ff-470f-4bb1-a07d-7cd3ac4056bc`).

Post-deploy checks at <https://no-ai-language-path.sociobot.in/> passed:

- `/opt/fleet/lib/verify-url.sh` returned HTTPS 200 in 639 ms with the required title, language, one `h1`, `main`, image alts, labelled buttons, and no browser errors.
- SHA-256 comparison found **13/13** deployed files byte-identical to fresh `dist/` (HTML, worker, manifest, assets, icons, artwork, and static files).
- Fresh controlled live contexts, after ordinary HTTP-cache clearing and immediate offline reload, rendered the app and enabled the starter action on desktop and iPhone 13 / 390px; both had no page errors.
- Live axe scans of `/`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms` found **0 serious/critical** violations; every route had one `h1` and one `main`.
- The live manifest has the expected name, standalone display, versioned installed start URL, and 192/512 icons. TLS presents `CN=no-ai-language-path.sociobot.in` with a matching SAN; HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff` are present.

Known gaps: none for the verifier's release blocker. The existing Azure response policy still uses 30-second revalidation for fingerprinted assets and does not send a CSP; these were previously recorded as non-blocking deployment hardening items. The product intentionally remains a static, local-first PWA with no server API or consumer package.
