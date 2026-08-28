# Independent verification 2 — No-AI Language Path

**Verdict: FAIL — do not release this candidate as an offline PWA.**

Tested on 2026-08-28 against candidate commit `18968d26d5e6eb02c6d602670f5a2f82380a45f0` from a clean detached worktree. Production URL tested: <https://no-ai-language-path.sociobot.in/>.

The earlier deployment failure is no longer present. The live URL has a valid certificate for the hostname and serves the exact candidate artifact. However, a fresh installation cannot reload offline, which violates the core local-first/offline acceptance contract.

## Release blocker

### High — cold-install offline reload is blank

`public/sw.js` precaches only `/`, HTML, manifest, images, and icons. It omits Vite's production assets `/assets/index-DbQ5cBAh.js` and `/assets/index-BkxE4ZNp.css`.

I used a fresh Chromium profile, loaded the built app once, waited for service-worker installation, cleared the ordinary browser HTTP cache while retaining Cache Storage, set the context offline, and reloaded. Cache Storage contained only:

```
/, /index.html, /offline.html, /manifest.webmanifest,
/assets/hero-960.webp, /assets/hero-1440.webp,
/icons/icon-192.png, /icons/icon-512.png
```

The reload yielded zero `<h1>` elements, empty `#app`, and body text only `Skip to main content`. The JS and CSS requests failed offline. This is not covered by the repository's offline test: that test reloads online once after the worker is ready, warming the runtime cache before switching offline.

**Required remediation:** generate the service-worker precache from `dist/` so the current hashed JS and CSS are available at installation time, then add the cold-install/offline regression test described above.

## Checks that passed

### Reproducible local build and automated tests

In the clean worktree:

```sh
npm ci
npm test                 # 3/3 passed
npm run build            # tsc && vite build passed; dist/ produced
npm run test:e2e         # 8/8 passed (desktop and mobile)
npm audit --omit=dev     # 0 vulnerabilities
```

There is no separate lint script; `npm run build` performs the available TypeScript check. Production artifact sizes are within budget: JS 30,684 B raw / 10,760 B gzip, CSS 17,521 B raw / 4,770 B gzip, and mobile hero 107,862 B (all below the 200 KB / 50 KB / 300 KB budgets).

Local Lighthouse with Chromium headless shell: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 1.0 s, LCP 1.7 s, TBT 0 ms, CLS 0.

### Product behavior and recovery paths

Manual browser checks exercised the actual production build:

- Created and completed the supplied four-block, 20-minute path entirely by keyboard; IndexedDB retained 4 blocks and 1 history record.
- Added an individual 90-minute block; `0` was rejected by the native minimum constraint; 1 minute was accepted on recovery.
- Rejected an `ftp:` source with the clear message “Use a complete link beginning with https:// or http://.”; an HTTPS source then saved. External source links use `target="_blank" rel="noreferrer"`.
- Rejected an invalid JSON import without changing the current data; JSON export produced `language-path-2026-08-28.json`.
- Rejected a progression threshold of 31 and accepted 1 after correction.
- The destructive path has a specific confirmation. Privacy, terms, local storage messaging, export/import, visible rule wording, and no-fluency claim were present.

### Accessibility, responsive behavior, and motion

- Desktop and 390px live pages each had one `h1`, one `main`, no horizontal overflow, zero console/page errors, no failed responses, and no axe serious/critical findings.
- The local empty, editor, and utility-page axe coverage in the 8 Playwright tests also passed.
- Keyboard tab order reached the skip link, navigation, primary actions, details, and footer. Every sampled keyboard focus ring was a visible 4px `#2457d6` outline; Enter completed the normal path.
- At 390px, body type remained 16px, document width equaled 390px, and the primary start target measured 366 × 48px. With reduced motion enabled, control transitions computed to 0.001 ms.

### Privacy, PWA metadata, and deployment identity

- On normal live desktop and 390px first loads, browser requests went only to `https://no-ai-language-path.sociobot.in`; no analytics, model, font CDN, or other third party was contacted. Source links are only opened by an explicit user action. Code review confirms the Sociobot billing endpoint is contacted only for a pasted/returned license.
- Chrome DevTools reported a valid manifest with no errors and no installability errors. It has standalone display, matching colours, valid 192/512 maskable icons, and a versioned start URL.
- A controlled test server served a second service-worker version after installation; the candidate's `skipWaiting`/`clientsClaim` path activated it and displayed the “A fresh version is ready” reload toast.
- Live TLS verifies for `no-ai-language-path.sociobot.in` (DigiCert, 2026-08-27 to 2027-02-27). SHA-256 comparisons found live `/`, hashed JS, hashed CSS, and `/sw.js` byte-identical to `dist/` from the tested commit. Direct `/privacy` and `/terms` requests return the app shell as required.

### Live headers and cache policy

The live app returns HTTPS plus HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and no server errors. A non-blocking deployment observation: HTML, hashed JS/CSS, assets, and `sw.js` all use `Cache-Control: public, must-revalidate, max-age=30`; immutable hashed assets are therefore not given the requested long-lived immutable caching policy. No CSP was present. These should be addressed as deployment hardening, but are not the reason for this FAIL.

## Exact evidence commands

```sh
git worktree add --detach /tmp/no-ai-language-path-qa-18968d2 18968d26d5e6eb02c6d602670f5a2f82380a45f0
cd /tmp/no-ai-language-path-qa-18968d2
npm ci && npm test && npm run build && npm run test:e2e
npm audit --omit=dev
curl -sS https://no-ai-language-path.sociobot.in/ -o live-index.html
openssl s_client -connect no-ai-language-path.sociobot.in:443 -servername no-ai-language-path.sociobot.in
```

Browser evidence used Playwright 1.58.2 and a fresh profile for cold offline testing; the build was served by `vite preview` before test execution.
