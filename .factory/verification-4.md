# Independent verification 4 — FAIL

**Work order:** `no-ai-language-path-verify-4`  
**Candidate:** `8b10468ac085e39c9aded3295d78b5f73e8ccfb5` (`docs: record repaired PWA verification`)  
**Live URL:** <https://no-ai-language-path.sociobot.in/>  
**Tested:** 2026-08-28 UTC

## Verdict

**FAIL — do not accept this candidate as a portable offline PWA yet.** The prior deployment-only failure is no longer present: the live HTTPS site is valid, the live artifact is byte-identical to this candidate's fresh `dist/`, and live cold offline reloads passed. However, independent fresh-profile testing of the exact production artifact served by `vite preview` reliably leaves the app unbooted after an immediate offline reload. This violates the PWA's core app-shell/offline contract.

No product code was modified during verification.

## Release blocker

### High — precached app shell is not usable when asset responses contain `Vary: Origin`

The generated worker correctly lists the current hashed CSS and JavaScript in its precache, but its static-asset handler uses strict `caches.match(request)` matching. The exact production artifact served locally by `vite preview` returns `Vary: Origin` for those assets. The worker's `cache.addAll()` stores responses without the page's `Origin` request header; the controlled page's module and stylesheet requests do have that header, so strict matching misses them offline.

Fresh Chromium reproduction, repeated six times after `npm run build`:

1. Start `npm run preview -- --port 4174`; create a new browser context.
2. Load `/`, wait until `navigator.serviceWorker.controller` is true, and verify Cache Storage contains `/index.html` and both current hashed assets.
3. Clear the ordinary browser HTTP cache, set the context offline, and reload immediately.
4. All **6/6** runs retained only `Skip to main content`. Both `/assets/index-BkxE4ZNp.css` and `/assets/index-DPQWSmGH.js` failed with `net::ERR_FAILED`; no application heading rendered.

The cached entries themselves expose `Vary: Origin`, which explains the miss. The repository cold-install test passes because its setup performs an additional online controlled navigation; that permits the runtime cache to acquire request variants before it takes the context offline, so it does not prove that the precache alone is usable.

The currently deployed Azure origin does **not** emit `Vary: Origin`, and therefore passed fresh live cold-offline tests (desktop **4/4**, iPhone-13/390px **4/4**). That hosting-specific success does not repair the artifact's failed local production/PWA quality gate or make the service worker safe for a normal static host that does emit `Vary`.

**Required remediation:** make precached static asset lookup insensitive to this benign request-header variance (or otherwise ensure a request-compatible precache), then add a regression that uses a brand-new controlled context, clears HTTP cache, and goes offline without an intervening controlled online navigation. Re-run this report after the local cold path is deterministic.

## Passed evidence

### Clean install and repository gates

Executed from clean, unchanged candidate checkout:

```sh
npm ci                 # passed; 50 packages added, 0 vulnerabilities
npm test               # passed; 3/3 Vitest tests
npx tsc --noEmit       # passed
npm run build          # passed; tsc + Vite + generated 12-file precache
npm run test:e2e       # passed; 12/12 desktop and 390px mobile tests
npm audit --omit=dev   # passed; 0 vulnerabilities
```

There is no lint script; TypeScript is the available static check. The production build writes `dist/` at its root. Its initial JS is 30,627 B raw / 10,722 B gzip, CSS is 17,521 B raw / 4,786 B gzip, and the 390px hero is 107,862 B—within the supplied static-product budgets.

Fresh local mobile Lighthouse scored **100 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO**: FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0, and interactive 1.1 s.

### Product, recovery, and privacy paths

On the exact production build in new desktop and iPhone-13 (390px) contexts, I independently:

- created a one-minute private listening block, completed it, and confirmed persisted local history;
- verified the lower one-minute boundary and upper 90-minute block boundary, plus the 1–30 progression-rule boundary (0 and 31 are rejected by native validation);
- rejected an `ftp:` source with the visible recovery text “Use a complete link beginning with https:// or http://.”, then saved a private HTTPS source;
- rejected malformed JSON import without changing the current path, and downloaded a JSON backup (`language-path-2026-08-28.json`);
- confirmed desktop and 390px layouts, no page or console errors, and normal-load requests limited to the first-party local origin.

Static review and browser network capture found no analytics, telemetry, tracking, model calls, third-party runtime scripts/fonts, or upload path. Study data uses IndexedDB; the optional disclosed Sociobot billing request is only reachable after a returned or pasted license. The privacy and terms routes accurately describe local storage, export/deletion, and the optional one-time license.

### Accessibility, motion, PWA, and live deployment

- `@axe-core/playwright` on live `/`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms`: **0 serious/critical** violations on every route; each had exactly one `h1`, one `main`, and no browser errors.
- The repository suite passed keyboard skip-link/Enter interaction, visible focus, dialog, desktop/mobile, and reduced-motion coverage. The focus ring is a designed 4px cobalt outline; reduced motion reduces transition duration to 0.001ms.
- `/opt/fleet/lib/verify-url.sh` passed against live HTTPS: 200, title, `lang=en`, one `h1`, `main`, image alt coverage, labelled buttons, and no console/page errors (854ms desktop load).
- The live manifest is parsed by Chromium with standalone display, versioned start URL, matching colours, and 192/512 icons including a maskable icon.
- A controlled local worker-update probe changed only the served worker response after initial control; the candidate displayed **“A fresh version is ready. Reload”** with no errors.
- The live site's cold offline reload passed in fresh controlled contexts after ordinary HTTP cache clearing: desktop 4/4 and 390px mobile 4/4.
- SHA-256 comparison of every deployable non-source-map file found **13/13 byte-identical** between fresh `dist/` and live (`index.html`, worker, manifest, JS/CSS, icons, artwork, and static files). TLS presents `CN=no-ai-language-path.sociobot.in` with a matching SAN.

## Deployment observations (non-blocking)

- The live origin applies HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and valid TLS. It does not emit a Content-Security-Policy header.
- HTML, worker, and fingerprinted JS/CSS all use `Cache-Control: public, must-revalidate, max-age=30`; fingerprinted assets are not long-lived immutable as requested by the performance contract. This is a deployment hardening/performance issue, separate from the PWA blocker.

## Verification commands

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm audit --omit=dev
CHROME_PATH=/opt/pw-browsers/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell \
  npx --yes lighthouse http://127.0.0.1:4174/ --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile
```

The standalone `verify-url.sh` was run with its required evidence-directory argument. No library/CLI consumer check applies to this static PWA.
