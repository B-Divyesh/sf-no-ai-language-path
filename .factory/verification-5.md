# Independent verification 5 — PASS

**Work order:** `no-ai-language-path-verify-5`
**Candidate:** `848f83000f0f9a7cf4c2bfe32966cab1845331be`
**Live URL:** <https://no-ai-language-path.sociobot.in/>
**Tested:** 2026-08-28 UTC

## Verdict

**PASS — accept this candidate.** The earlier deployment/PWA failures do not reproduce. Fresh `dist/` is byte-identical to the live deployment, and the core fresh-install/offline reload works reliably at desktop and 390px mobile. No product code was modified for this verification.

## Clean-checkout gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 50 packages; 0 audit vulnerabilities |
| `npm test` | PASS — 3/3 Vitest tests |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — TypeScript, Vite, generated 12-file SW precache; `dist/` produced |
| `npm run test:e2e` | PASS — 12/12 Playwright tests, desktop Chromium and iPhone 13 / 390px |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Local mobile Lighthouse | PASS — 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0 |

There is no separate lint script; TypeScript is the available static check. Production budgets pass: JS 30,627 B raw / 10,740 B gzip, CSS 17,521 B raw / 4,770 B gzip, mobile hero 107,862 B.

## Product, recovery and accessibility exercise

On fresh local-production and live desktop/390px browser contexts, I started the blank path, applied the four-block 20-minute starter, completed it, and confirmed a session history record. I added a private block; native validation rejected 0 minutes and accepted the 1- and 90-minute boundaries. An `ftp:` source was rejected with **“Use a complete link beginning with https:// or http://.”** and a replacement HTTPS source saved. Rule validation rejected 31, accepted 30, then recovered by saving 1 with **“Progression rule saved.”** Malformed JSON import gave **“That file is not a valid Language Path JSON backup. Your current data was not changed.”**

The repository suite also covers persisted reload, export, saved-path offline reuse, keyboard starter activation, editor, and utility pages in both profiles.

- Each independent page had `lang=en`, exactly one `h1` and one `main`; desktop and 390px had no console/page errors, failed responses, or horizontal overflow. Mobile body type was 16 px and primary action 366 × 48 px.
- Tab reaches the skip link first; its inspected focus is `rgb(36, 87, 214)` solid 4 px. Enter activates the primary action. Reduced-motion transition duration is `0.001s`.
- Axe found **0 serious/critical** findings on independent live scans of `/`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms`; all had one heading/main and no browser errors. The same home check passed at both viewports.
- `/opt/fleet/lib/verify-url.sh https://no-ai-language-path.sociobot.in/ .factory/evidence` passed title, language, landmark, alt, labelled-button and error checks (711 ms).
- Fresh desktop/mobile screenshot review found the risograph-workbench treatment aligned with `.factory/design.md`; the 390px layout stacks content and intentionally makes navigation horizontally scrollable without page-content clipping.

## Privacy, PWA and live identity

- Normal loads at both viewports requested only the first-party origin. Static review found no analytics, telemetry, model calls, font/script CDN, upload route, or content-licensing call. The sole external endpoint is the disclosed Sociobot billing API, used only after a user supplies/returns with a license.
- Routines, links, and history are IndexedDB-local; export/import and `/privacy`/`/terms` accurately describe local control and optional billing verification.
- The live manifest has standalone display, versioned `start_url`, matching colours, and valid 192/512 icons including a maskable icon.
- Fresh controlled offline reloads waited for worker control, cleared only ordinary HTTP cache, then went offline and reloaded. The app heading/starter rendered with no errors in **4/4 local desktop**, **4/4 local 390px**, **4/4 live desktop**, and **4/4 live 390px** attempts. Current hashed JS/CSS were in every worker shell.
- A controlled byte-changed worker update displayed **“A fresh version is ready. Reload”** with no errors.
- SHA-256 compared **13/13** deployable non-source-map files from fresh `dist/` with live responses; all matched. HTTPS/TLS, HSTS, redirect-to-HTTPS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff` pass.

## Defects

### Low — deployment cache/security hardening

This does not block acceptance or the measured offline behavior: the live host applies `Cache-Control: public, must-revalidate, max-age=30` even to fingerprinted JS/CSS, not a long immutable lifetime, and it sends no CSP. The deployment owner should add immutable caching for hashed assets and a restrictive CSP while retaining short/no-cache policy for HTML and the service worker.

## Reproduce

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm audit --omit=dev
npm run preview -- --port 4174
```

PWA checks used Playwright 1.58.2 and brand-new profiles rather than warmed browser caches. No library/CLI consumer check applies to this static PWA.
