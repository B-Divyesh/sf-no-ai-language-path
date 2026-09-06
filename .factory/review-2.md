# Review 2 — Build a private language study routine

**Verdict: PASS**

- Work order: `no-ai-language-path-review-2`
- Review date: 2026-09-06 UTC
- Live URL: <https://no-ai-language-path.sociobot.in>
- Implementation reviewed: `b15f00b58bc9c20aefb543a9312928a0c56334d0`
- Documentation and test baseline reviewed: `a250fd4933f6f7c750d0bcc747ad100f86f9d7ce`
- Findings: **0** — critical 0, high 0, medium 0, low 0
- Untested public claims: **0**

## First screen before scrolling

- Job: build a private language study routine.
- Audience: language learners who use their own material and want a clear daily plan without generated lessons.
- First action: **Try it with sample data**. It opens a filled four-block Spanish routine and leaves current data unchanged.

Fresh desktop and 390px phone browser contexts showed the job, audience, action, and the three facts before scrolling: offline use after the first visit, no model calls or tracking, and free core with $12 Plus.

## Result

PASS. The deployed PWA completes the stated job with a real local routine, timer, checklist, history, editable progression rule, import/export, deletion, and recovery paths. The one-click sample is realistic, clearly labelled, isolated from real data, resettable, and removable. No product code was changed in this review.

The billing product has not yet been registered by the separate operator. The product does not expose a broken checkout link; it accurately says checkout is unavailable and keeps the complete free routine usable. This is the documented external dependency, not a product finding.

## Clean checkout

A detached clean checkout at `a250fd4933f6f7c750d0bcc747ad100f86f9d7ce` was installed and tested.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 52 packages; 0 dependency vulnerabilities |
| `npm test` | PASS — 10/10 Vitest tests |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — `dist/index.html` produced |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm run test:e2e` | PASS — 76/76 desktop and phone browser tests |
| `verify-url.sh` | PASS — title, language, main landmark, alt text, labels, and console |

The production build is 38,295 bytes of JavaScript (12.40 KB gzip) and 19,578 bytes of CSS (5.17 KB gzip). The 960px mobile hero is 107,862 bytes.

All 26 commands declared in `.factory/claims.json` passed separately. Every ID has exactly one matching `@claim:` browser test and no declared claim is untested:

`demo-isolation`, `four-part-routine`, `edit-blocks`, `reorder-blocks`, `private-source-links`, `guided-session`, `completion-history`, `progression-rule`, `rule-preserves-history`, `user-controlled-content`, `offline-reload`, `installable-pwa`, `local-persistence`, `privacy-network`, `no-account`, `no-file-upload`, `complete-export`, `confirmed-import`, `erase-local-data`, `free-core`, `plus-offer`, `plus-history`, `print-study-sheet`, `restore-license`, `revoked-license`, and `build-output`.

## Live product checks

- Fresh desktop and phone contexts entered `/demo`, showed the persistent **Demo — sample data, nothing is saved** label, four realistic Spanish blocks, 20 planned minutes, two prior sessions, and the `2/3` rule state.
- Editing sample content, resetting it, and selecting **Start for real** left an independently created real starter routine unchanged.
- A complete four-block live sample session recorded a third history row and advanced to Stage 2. The timer started and paused.
- Invalid `ftp:` source links showed a recovery message; a following `https:` source saved. Progression boundaries 1 and 30 saved; 31 was rejected by the labelled numeric field.
- Fresh controlled desktop and phone contexts cleared the HTTP cache, went offline, reloaded `/demo`, and retained the sample, demo label, offline notice, and no console errors.
- Keyboard checks passed: skip link, 4px visible focus outline, focus moved to the route heading, and dialog close restored focus to its opener. Reduced motion made transitions effectively instant.
- Axe found zero serious or critical violations on `/`, `/demo`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms`. Each has one `h1`, one `main`, `lang="en"`, and a route-specific title. A designed unknown route returned HTTP 404 with a working return link.
- All 23 discovered internal and external links returned 200. Live headers include CSP, HSTS, `nosniff`, referrer, frame, and permissions policies. Fingerprinted JavaScript has one-year immutable caching.
- Normal study and demo use are covered by the clean `privacy-network` claim command, which recorded same-origin GET requests only. The live sample's initial resources also came only from the product origin.
- Live Lighthouse passed with Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 0.9 s, LCP 1.0 s, TBT 0 ms, and CLS 0.

The live application is functionally identical to the implementation candidate. Building at the repository deployment path reproduces all 18 served non-map assets byte-for-byte. A detached clean build gives `sw.js` a different cache identifier because the generator includes its absolute build directory in that identifier; its precache list and service-worker behavior are otherwise identical, and it did not affect runtime, offline, or update behavior.

## Earlier finding disposition

| Earlier finding | Disposition |
| --- | --- |
| F-01 sample demo missing | Fixed; one-click sample, separate IndexedDB namespace, persistent label, reset, exit, and isolation passed. |
| F-02 claim contract missing | Fixed; 26 declared claims and 26 separately passing observable tests. |
| F-03 broken checkout | External registration still pending; no broken link is exposed and the status is accurately stated. |
| F-04 first screen unclear | Fixed; job, audience, first action, outcome, and facts are visible before scrolling. |
| F-05 fractional import accepted | Fixed; clean unit and browser validation reject malformed fractional data without replacement. |
| F-06 titles and metadata incomplete | Fixed; route titles, descriptions, canonicals, social metadata, icons, robots, sitemap, and routes are present. |
| F-07 focus and touch targets failed | Fixed; keyboard focus, dialog restoration, focus styling, and target tests passed. |
| F-08 not-found returned 200 | Fixed; the designed missing page returns HTTP 404. |
| F-09 structure and plain words incomplete | Fixed; required landing order, plain copy audit, footer, legal links, and contact link are present. |
| F-10 missing CSP and immutable cache | Fixed live; CSP is served and fingerprinted JavaScript/CSS use immutable caching. |
| Earlier TLS/default-page issue | Fixed; HTTPS serves the product. |
| Earlier precache, first-control, `Vary: Origin`, and update-notice issues | Fixed; clean and live offline/update regressions passed. |

## Scope and evidence

This is a static PWA. Backend tenant isolation, SQLite restart persistence, health, live request allowances, and 429/`Retry-After` checks do not apply. CLI, library, and desktop consumer-artifact checks do not apply.

Evidence:

- `/work/.evidence/qa-review-2-claims.log`
- `/work/.evidence/qa-review-2-e2e.log`
- `/work/.evidence/qa-review-2-verify/verify.json`
- `/work/.evidence/qa-review-2-lighthouse.json`

