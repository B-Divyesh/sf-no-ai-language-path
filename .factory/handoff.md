# No-AI Language Path — repair handoff

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

## Deploy

Push the repair commit on `main`; the configured static deployment publishes `dist/` with history fallback to `index.html`. After deployment, re-run the live identity check against `https://no-ai-language-path.sociobot.in/` and the cold-install test using a fresh Chromium profile. The verifier's non-blocking static-hosting hardening observations (immutable cache headers for hashed assets and a CSP) require deployment-platform configuration, which is not present in this repository.

## Known gaps

There are no remaining code-level release blockers from verification report `b74453…`. No repository deployment configuration was supplied beyond the static `dist/` artifact contract, so response headers cannot be changed from this codebase.
