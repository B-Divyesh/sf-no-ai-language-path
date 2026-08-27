# Independent verification — FAIL

**Work order:** `no-ai-language-path-verify-1`  
**Candidate tested:** `18968d26d5e6eb02c6d602670f5a2f82380a45f0` (`chore: verify offline release and document handoff`)  
**Date:** 2026-08-27  
**Required live URL:** `https://no-ai-language-path.sociobot.in/`

## Verdict

**FAIL.** The local candidate is buildable and largely functional, but the required live URL is not serving the product and the PWA fails a cold-install offline reload. Either defect blocks the `pwa-offline` release contract.

## Release-blocking defects

### Critical — live deployment is not reachable as this product

Fresh verification of the required URL failed TLS hostname verification:

```
curl: (60) SSL: no alternative certificate subject name matches target host name
```

DNS resolved to `68.220.237.27` (`waws-prod-bn1-395a8892.sip.p.azurewebsites.windows.net`). The certificate subject was `*.msha-slice-7-eus2-0-ase.p.azurewebsites.net`; its SAN list did not include `no-ai-language-path.sociobot.in`.

With certificate verification deliberately disabled only to inspect the response, `GET /` returned `HTTP 404`, 2,667 bytes, the Azure default **“404 Web Site not found”** page. Plain HTTP also returned that Azure 404. Consequently the deployed artifact does not match candidate `18968d…`, and live browser, header, cache, CSP, install, update, and privacy-policy verification cannot pass.

**Required remediation:** correctly map the custom hostname to the deployed static artifact, provision a certificate containing `no-ai-language-path.sociobot.in`, and redeploy `dist/`. Re-run this verification against the real HTTPS artifact.

### High — immediate offline reload after first install is broken

The service worker precache in `public/sw.js` contains `/`, `/index.html`, manifest, images, and icons but excludes Vite's hashed JavaScript and CSS (`/assets/index-DbQ5cBAh.js`, `/assets/index-BkxE4ZNp.css`).

Independent Chromium reproduction on a new browser context:

1. Load `http://127.0.0.1:4174/` online and wait for `navigator.serviceWorker.ready`.
2. Inspect Cache Storage: only `nlp-v1.0.1-shell` exists, containing the documented HTML/images/icons; no JS or CSS assets.
3. Set the context offline and reload immediately.
4. The resulting body contains only `Skip to main content`; the application never starts because its module cannot be fetched.

The repository e2e offline test passes only after an additional online reload, which allows the now-controlling worker to cache the hashed assets at runtime. That is not a valid first-install/offline reload path, nor a complete app-shell precache.

**Required remediation:** generate the precache from the production manifest (or otherwise include the current hashed JS and CSS) and add an e2e test for immediate offline reload after initial installation, before a controlled online reload.

## Local verification evidence

Executed from clean candidate checkout `18968d26d5e6eb02c6d602670f5a2f82380a45f0` after `npm ci`:

| Check | Result |
| --- | --- |
| `npm test` | PASS — 1 file, 3 tests |
| Type check and exact production build (`npm run build`) | PASS — `tsc && vite build`; `dist/` produced |
| `npm run test:e2e` | PASS — 8/8: desktop Chromium and iPhone 13/390px profile |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Lighthouse mobile, local production preview | 99 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; FCP 1.0 s, LCP 2.0 s, TBT 100 ms, CLS 0 |
| Bundle budget | PASS — JS 30,684 bytes raw / 10,760 gzip; CSS 17,521 bytes raw / 4,770 gzip; mobile hero 107,862 bytes (all within stated budgets) |

Browser probes covered the blank state, starter routine, an independently added one-minute block, 90-minute upper boundary, four-block completion and persisted history, rule display/change, invalid `ftp:` source recovery, invalid `0` minutes native recovery, invalid JSON import recovery without data replacement, JSON export, desktop and 390px layouts, and reduced motion. There were no captured console errors or page errors.

Accessibility probes found exactly one `h1` and one `main`; skip link keyboard activation moved focus to `#main`; keyboard focus showed a 4px solid `rgb(36, 87, 214)` ring; `prefers-reduced-motion` set transition duration to `0.001ms`; and axe reported 0 serious/critical violations on the empty path, editor, rules page, and repository-covered utility routes. The full suite also covers the session screen and utility routes on both profiles.

Privacy/network probe of a normal local first load observed only `http://127.0.0.1:4174` requests. Static review found no analytics, telemetry, third-party runtime scripts, font requests, model calls, or user-data upload path. The optional licensing endpoint is the documented Sociobot API and is only fetched after a license exists/is submitted. User routines are stored in IndexedDB; license token/verdict storage is disclosed in the privacy route. These local findings cannot substitute for production response-policy verification while the required origin returns Azure's default 404.

## PWA/update and response-policy status

The manifest has required names, 192/512 icons (including maskable purpose), standalone display, colours, and a versioned start URL. Source inspection confirms `skipWaiting`, `clientsClaim`, versioned caches, a client `controllerchange` update toast, and cached navigation fallback. The warm-cache offline e2e path passes; the cold-install path above fails. Update-toast behavior and production cache/security headers remain **unverified** because no valid live product origin exists.

## Scope

No product code was modified. This report and `.factory/handoff.md` are the only verification changes.
