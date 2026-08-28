# No-AI Language Path — verification handoff

## Current independent QA verdict: **FAIL**

Candidate `b9c41fd8d32f03fc0ebed0c9ed16dbc51a5ddb49` was independently tested on 2026-08-28 against <https://no-ai-language-path.sociobot.in/>. The live deployment is healthy and byte-identical to the candidate, but the PWA cannot yet be accepted: its required cold-install/offline regression is flaky. The complete browser suite failed the desktop and 390px cold-install cases, and a sequential Chromium repeat failed 1/6 attempts. On failure the offline reload requests the hashed JS from the network (`ERR_INTERNET_DISCONNECTED`) and renders only the skip link.

See [`.factory/verification-3.md`](verification-3.md) for exact commands, trace evidence, passed coverage, the full defect severity, and non-blocking response-policy observations. No product code was modified by this verifier.

### Required next step

Make service-worker activation/client control deterministic before the first offline navigation, then rerun `npm run test:e2e` and repeated desktop/mobile cold-install tests from a clean install. Do not mark this candidate PASS merely because a one-off offline attempt succeeds.

---

# Prior repair context

## Release repair: cold-install offline reload

Independent verification report `b74453a4b4408e71a431a712e8491a6b367c2d84` found one release blocker in candidate `18968d26d5e6eb02c6d602670f5a2f82380a45f0`: a newly installed service worker precached HTML and static artwork but not Vite's hashed JavaScript and CSS. After the ordinary HTTP cache was cleared, an offline reload left only the skip link and no application.

This repair replaces the hand-maintained production precache with a build-generated one. `scripts/generate-sw.mjs` enumerates the production `dist/` artifact after Vite has emitted it, excludes only source maps and the worker itself, fingerprints the resulting artifact set for the cache version, and writes `dist/sw.js`. Consequently the exact hashed JS and CSS referenced by `dist/index.html` are cached during service-worker installation. `public/sw.js` is deliberately a development placeholder; it is always replaced in the production artifact by `npm run build`.

The original product behavior, local-first data model, service-worker update flow, visual system, and researched brief are unchanged.

## Regression coverage

`tests/app.e2e.ts` now has a cold-install regression that:

1. opens a new browser profile and waits for the initial worker installation;
2. reads Cache Storage and requires the current `/assets/index-*.js` and `/assets/index-*.css` files alongside `/index.html`;
3. clears Chromium's ordinary HTTP cache while preserving Cache Storage;
4. switches the context offline and reloads before any controlled online reload; and
5. requires the real app heading and primary routine action to be available.

It runs in both Desktop Chromium and the Playwright iPhone 13 profile (390px). This is the verifier's failed path, rather than the prior warm-runtime-cache approximation.

## Verification evidence (2026-08-28)

Executed from a clean dependency install:

```sh
npm ci                                      # 51 packages installed; 0 vulnerabilities
npm test                                    # 3/3 unit tests passed
npx tsc --noEmit                            # passed
npm run build                               # passed; produced dist/ and generated 12-file precache
npm run test:e2e                            # 12/12 passed (desktop + 390px mobile)
npm audit --omit=dev                        # 0 vulnerabilities
```

The browser suite covers saved routine completion, history persistence, empty/editor/utility-page axe scans, keyboard skip navigation and Enter activation, warm offline reuse, and the new cold-install offline reload. The axe scans reported no serious or critical findings. The product's semantic landmarks, reduced-motion behavior, local-only request policy, manifest, and service-worker update UI were preserved; the build has no third-party runtime assets or telemetry.

Production build budgets remain within the static-PWA limits: JavaScript 30,684 B raw / 10,760 B gzip; CSS 17,521 B raw / 4,770 B gzip; mobile hero 107,862 B. `dist/index.html` is at the artifact root.

## Deployed verification

Repair commit `0a4585fec03df781bfce28b9b1d5a56c95bc3a49` was pushed to `main` and deployed with the work-order static configuration (`dist/`) to Azure Static Web Apps. Deployment `0b876143-a876-4499-9e86-797aa17d20a6` completed successfully; `https://no-ai-language-path.sociobot.in/` returned HTTPS 200.

Post-deploy checks at 2026-08-28 00:40 UTC:

- `dist/sw.js` and live `/sw.js` had the identical SHA-256 `7bcd6f1af80f57f0b6f99c9a0e57a4c9191895f3a791eeb7cdb8797b3290a274`.
- The live worker's install precache included `/assets/index-BkxE4ZNp.css` and `/assets/index-DbQ5cBAh.js`.
- `verify-url.sh` found live title and `lang`, one `h1`, a `main`, no images missing `alt`, no unlabelled buttons, and no page/console errors (627 ms desktop load).
- Fresh live Desktop Chromium and 390px mobile contexts cleared their normal HTTP caches, retained Cache Storage, went offline, then reloaded to “Study by your rules.” with `<main>` present. Both cached entry assets and had no horizontal overflow or browser errors.
- Normal live first loads requested only `https://no-ai-language-path.sociobot.in`; no analytics, font CDN, model, or other third-party request was observed. `/privacy` returned the history-fallback app shell with HTTPS 200 and the expected HSTS, referrer-policy, and `nosniff` headers.

The static deploy utility generated the required history-fallback configuration in the deployed `dist/` artifact. The verifier's non-blocking hosting-hardening observations remain: Azure currently serves hashed assets with 30-second revalidation and no CSP. Those headers are deployment-platform concerns and do not affect the fixed cold-install path.

## Known gaps

There are no remaining code-level release blockers from verification report `b74453…`. No repository deployment configuration was supplied beyond the static `dist/` artifact contract, so response headers cannot be changed from this codebase.
