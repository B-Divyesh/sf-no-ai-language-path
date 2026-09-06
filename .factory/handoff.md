# Repair 4 handoff

Date: 2026-09-06 UTC

- Product: <https://no-ai-language-path.sociobot.in>
- Deployed implementation commit: `b15f00b58bc9c20aefb543a9312928a0c56334d0`
- Product/documentation baseline commit: `823eea88ddf814d2cc1a81cb3fa35be77ff6dd1e`
- Prior review commit: `75d209a31b140f1bff8ec56804e7e475e2381106`

## What changed

- Added `/demo` with a realistic four-block Spanish routine and two completed sessions.
- Isolated demo state in IndexedDB database `demo:no-ai-language-path`.
- Added a persistent demo label, reset action, and “Start for real” action.
- Added 26 declared claims and one outcome test for each retained public claim.
- Rejected fractional and out-of-range stages, rules, block minutes, history values, dates, and source URLs during import.
- Rewrote the first screen to name the job, audience, first action, and three short facts before scrolling.
- Added standard landing sections for the product, use steps, privacy and limits, and the paid tier.
- Added route-specific titles, canonical and social metadata, an Apple touch icon, and a 1200×630 social image.
- Added route heading focus, route announcements, dialog focus restoration, 44px header and footer links, and plain errors.
- Added a designed static 404 page with a real HTTP 404 response.
- Added a CSP, security headers, and one-year immutable caching for fingerprinted JavaScript and CSS.
- Kept the earlier deterministic, `Vary: Origin`-safe offline worker behavior.
- Excluded Azure’s consumed host configuration from the worker precache so live worker installation succeeds.
- Updated the README, visual provenance, demo notes, copy audit, catalog description, and billing metadata.

## Review finding disposition

| Finding | Disposition |
| --- | --- |
| F-01 sample demo missing | Fixed and tested. Demo data is isolated, resettable, and discarded by “Start for real”. |
| F-02 claims missing | Fixed. `.factory/claims.json` lists 26 current claim groups. Every declared command passed separately from a clean worktree. |
| F-03 checkout returned 404 | External dependency remains. The UI now says checkout is unavailable instead of sending users to a broken endpoint. `/work/.evidence/billing-offer.json` is ready for the billing operator. |
| F-04 first screen unclear | Fixed on desktop and 390px phone. The job, audience, sample action, action result, and three facts appear before scrolling. |
| F-05 fractional import | Fixed with strict whole-number and full-shape validation. Unit and browser recovery tests pass. |
| F-06 route titles and metadata | Fixed for every public route, including demo and 404. Sitemap and social metadata are complete. |
| F-07 focus and touch targets | Fixed. SPA headings receive focus, dialogs restore focus, and sampled header/footer targets are at least 44px. |
| F-08 not-found status | Fixed. Unknown live URLs return the designed page with HTTP 404. |
| F-09 structure and plain words | Fixed. Required sections and footer details are present; mood headings were removed; the copy audit has no flags. |
| F-10 CSP and caching | Fixed live. CSP is present, and hashed JavaScript/CSS return `max-age=31536000, immutable`. |
| Earlier TLS/deployment mismatch | Remains fixed. HTTPS is valid and the final deployed files match the local build. |
| Earlier missing hashed precache | Remains fixed. Current hashed JavaScript and CSS are in the 16-file shell. |
| Earlier activation race | Remains fixed. Four final cold offline attempts passed. |
| Earlier `Vary: Origin` cache miss | Remains fixed. Local regression passes in desktop and phone projects. |
| Earlier update notice | Remains fixed. A browser regression confirms that a controlled app shows the reload action after a controller change. |

## Verification

Clean worktree at `823eea8`, followed by the isolated live-precache repair at `b15f00b`:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm audit --omit=dev
```

Results:

- Unit tests: 10 passed.
- Full browser suite: 74 passed across desktop Chromium and 390px mobile before the isolated service-worker repair; the affected offline regression and update notice then passed in both profiles.
- Claim commands: all 26 commands in `.factory/claims.json` passed separately.
- Build: `dist/index.html` present; JS 38,295 bytes raw / 12.40 KB gzip; CSS 19,578 bytes raw / 5.17 KB gzip.
- Mobile hero: 107,862 bytes.
- Live Lighthouse mobile: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.
- Live Lighthouse: FCP 0.9 s, LCP 0.9 s, TBT 0 ms, CLS 0.
- Live route axe scan: zero serious or critical findings across eight routes in desktop and phone profiles.
- Final `verify-url.sh`: no console errors, one H1, one main, complete alt text, and no unlabeled buttons.
- Final deployment comparison: 18 of 18 served non-map files match local bytes. Azure consumes the host configuration, so it is not a public file.
- Live 404: HTTP 404 with the designed product page.
- Live privacy flow: no external request during the normal sample and editing flow.
- Live cold offline: 2/2 desktop and 2/2 phone attempts passed after clearing the HTTP cache.
- Live first screen: sample action is visible at both 1440×900 and 390×664.
- Live demo: four populated blocks, `2/3` progress, persistent label, reset, exit, and unchanged real routine all passed.

Evidence is in `/work/.evidence/` and `.factory/evidence/`. The per-claim clean run is `/work/.evidence/claims-clean-run.log`.

## Known gap and next step

The Sociobot billing engine still returns HTTP 404 for `GET /api/v1/products/no-ai-language-path/checkout`. Invalid-token verification returns a normal HTTP 200 invalid verdict. The separate billing operator must register the offer from `/work/.evidence/billing-offer.json`. No credential or provider integration was added here.

After registration, replace the pending checkout notice with the hosted checkout link and run a real checkout-return-entitlement test. The free product, local license restore path, cached entitlement behavior, and revoked-license handling work now.
