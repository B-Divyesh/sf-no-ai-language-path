# Review 1 — Build and follow a private language study routine

**Verdict: FAIL**

- Work order: `no-ai-language-path-review-1`
- Review date: 2026-09-05 UTC
- Live URL: <https://no-ai-language-path.sociobot.in/>
- Implementation reviewed: `0a6f7f083e4f08899d8435b1b08fb151d78a6fa0`
- Documentation reviewed: `9b687f93f5fa11a7d3099893265f4db7007d7b9c`
- Findings: **10** — 3 high, 6 medium, 1 low
- Untested public claim groups: **30**

The live deployment is byte-identical to a fresh build of the implementation candidate. The core routine works, but the required demo is absent, public claims have no claim manifest or claim commands, and the paid checkout is broken. This is not a zero-finding review.

## First screen before scrolling

- Job: build and follow a routine using listening, reading, speaking, and recall.
- Audience: privacy- or quality-conscious language learners using their own study sources. The first screen does not state this audience.
- First action: no primary action is visible before scrolling. “Use the 20-minute starter” begins at y=1,448 in a 1440×900 desktop viewport and y=1,198 in a 390×664 phone viewport.
- The heading “Study by your rules.” and title “No-AI Language Path — your routine, your rules” do not name the routine-building job.

## Findings

### F-01 — High — The required sample demo and isolated storage do not exist

`/demo` shows the product’s not-found screen. `/?demo=1` opens the ordinary product. There is no “Try it with sample data” action, persistent “Demo — sample data, nothing is saved” label, “Reset demo”, or “Start for real”. `.factory/demo.md` is missing.

The closest action, “Use the 20-minute starter”, creates a useful four-block sample but writes it to IndexedDB database `no-ai-language-path`, object-store key `primary`, which is the real user namespace. The generic erase action later writes an empty real state to that same key. This fails the required demo isolation and makes it impossible to prove that trying the sample leaves real data unchanged.

Required correction: add `/demo` or `?demo=1`, seed the realistic routine in a separate demo namespace, add the persistent label and both exit controls, discard demo data on exit, document it in `.factory/demo.md`, and test isolation against pre-existing user data.

### F-02 — High — Public claims have no manifest or per-claim tests

`.factory/claims.json` is missing. Therefore the clean checkout declares **zero claim commands**, and no `@claim:<id>` tests exist. The generic unit and browser suites do not meet the requirement that every claim have exactly one declared, tagged observable test.

The following 30 distinct public claim groups are undeclared and contractually untested:

1. Composes a routine across listening, reading, speaking, and recall.
2. Routine blocks are editable.
3. Routine blocks are reorderable.
4. Blocks support optional private source links.
5. Provides a block-by-block timer and checklist.
6. Keeps local completion history.
7. Advances only after the configured number of complete sessions.
8. Changing the threshold never rewrites history.
9. Does not alter difficulty or select study content.
10. Works offline after the first visit.
11. Is installable as a PWA.
12. IndexedDB state survives reload and later use.
13. Makes no model calls.
14. Runs no telemetry, analytics, or tracking.
15. Requires no account.
16. Routine details, links, settings, and history stay in the browser and are not transmitted.
17. Never uploads user files or their contents.
18. Loads no third-party runtime assets.
19. JSON export includes the routine, rules, and complete history.
20. Core data export is always free and available at any time.
21. Import replaces current data only after confirmation.
22. Local deletion erases the routine and history.
23. The routine builder, timer, rules, offline use, and export are free.
24. Plus is a $12 one-time license.
25. Plus provides a 90-day detailed history view.
26. Plus provides printable study sheets.
27. A license can be restored on the user’s own devices.
28. Sociobot/Dodo handles checkout and refunds, and a refund revokes the license.
29. The documented Node versions work and the production build writes `dist/index.html`.
30. The documented end-to-end command covers desktop, 390 px mobile, offline persistence, and axe checks.

Independent review observed many of these behaviors, and separately disproved the checkout claim in F-03. Those observations do not replace the missing reproducible claim contract.

### F-03 — High — The paid checkout link is broken

The public “Buy Plus once — $12” link targets the documented Sociobot endpoint, but a live `GET` returns HTTP 404 with `{"error":"enabled factory product","status":404}` and no redirect. A harmless invalid-token request to the product’s verification endpoint returns the expected HTTP 200 invalid verdict, so the verification route exists while purchase entry does not.

Required correction: register or enable this product in the billing engine, then test the checkout redirect and returned-license flow without exposing any credential.

### F-04 — Medium — The first screen does not state the job, audience, and action

The headline and document title use “your rules” rather than naming the job. The supporting sentence describes four activities but does not name the intended learner or their situation. The first primary action is far below both tested viewports because the full illustration precedes the workbench.

Required correction: use a job-naming heading of at most nine words, add a short audience sentence, and place the sample action with its outcome in the first viewport. Keep the three short privacy/offline/price facts beside it.

### F-05 — Medium — Import accepts invalid fractional rules and stages

A crafted version-1 backup with `sessionsPerStage: 1.5` and `stage: 1.5` passed import validation and was saved. The home and rules routes then rendered “Stage 2.5: undefined” and “Complete 1.5 more sessions to move from undefined to undefined.” The visible forms only allow integer boundaries, but import bypasses them.

Required correction: require integer rule and stage values, require a valid stage index, validate all imported fields, and add rejection/recovery tests that prove current data is unchanged.

### F-06 — Medium — Route titles and required metadata are incomplete

Every tested route, including Privacy, Terms, Plus, and the not-found view, keeps the home title. The required canonical URL, Open Graph image metadata, Twitter card metadata, and Apple touch icon link are absent. `sitemap.xml` lists only `/`, `/privacy`, and `/terms`; it omits the current product routes and the required demo route.

Required correction: set a plain, route-specific title on navigation and direct loads; add the required metadata; and list every public route in the sitemap.

### F-07 — Medium — SPA and dialog focus management fail

After activating the Rules link, focus falls to `<body>` instead of the new `<h1>`, and no route announcement region identifies the new page. Closing the block dialog also returns focus to `<body>` instead of the control that opened it. On the 390 px page, the brand link is 36 px high and the three footer links are 19 px high, below the 44 px touch-target baseline.

The skip link, designed 4 px focus ring, keyboard activation, reduced-motion duration, semantics, and automated contrast checks passed. Axe found no violations on eight live routes in both desktop and phone profiles, but automated axe checks do not cover the focus and target failures above.

### F-08 — Medium — The not-found route returns HTTP 200

The not-found view is visually consistent and has a working return link, but a random missing path returns HTTP 200 rather than a deliberate HTTP 404. `/demo` also receives this 200 not-found view. `staticwebapp.config.json` is absent, so there is no deployment rule to produce the required 404 status.

Required correction: keep the designed page, use a real `/404.html` or equivalent host response override, and return status 404 for unknown URLs.

### F-09 — Medium — The standard page structure and plain-word audit are incomplete

The landing page has the header, first screen, and product preview, but it omits the required “How it works”, plain privacy/non-goals, and paid-tier sections in the standard order. The header has five navigation links rather than at most four. The footer omits “Built by Param Factory” and a build/version identifier. The privacy notice says questions can be sent through a repository issue tracker but provides no link.

`.factory/copy-audit.md` is missing. Copy also uses mood or metaphor lines prohibited by the plain-words contract, including “Your workbench”, “Nothing under the floorboards”, “You kept the path”, and “This slip fell off the desk.”

### F-10 — Low — The earlier deployment hardening finding remains open

The earlier verification’s only minor finding is unchanged. Live HTML, service worker, images, and fingerprinted JS/CSS all return `Cache-Control: public, must-revalidate, max-age=30`; fingerprinted assets do not receive a long immutable lifetime. Live responses still have no Content-Security-Policy header. HSTS, `strict-origin-when-cross-origin`, and `nosniff` are present.

Required correction: add a CSP that matches the inline registration and runtime connections, keep HTML/service-worker caching short, and serve fingerprinted assets with a long immutable policy.

## Earlier review findings

| Earlier finding | Current disposition | Current evidence |
| --- | --- | --- |
| TLS mismatch and Azure default 404 | Fixed | Valid HTTPS product returned 200; all 13 built files matched live bytes. |
| Hashed JS/CSS missing from precache | Fixed | Generated worker precached current assets; clean suite passed. |
| First-control activation race | Fixed | Fresh live controlled reload passed 2/2 desktop and 2/2 phone after clearing the HTTP cache. |
| `Vary: Origin` cache miss | Fixed | The dedicated regression passed in both Playwright projects. |
| Update notification | Passing | A controlled changed-worker probe displayed “A fresh version is ready. Reload” with no browser error. |
| Short cache policy and no CSP | Open | See F-10. |

## Checks that passed

From the clean checkout:

```text
npm ci                 PASS — 50 packages; 0 vulnerabilities
npm test               PASS — 3/3
npx tsc --noEmit       PASS
npm run build          PASS — dist/ produced
npm run test:e2e       PASS — 12/12, desktop and 390 px phone
npm audit --omit=dev   PASS — 0 vulnerabilities
verify-url.sh          PASS — title/lang/h1/main/alt/labels/console
```

- Fresh build versus live: 13/13 deployable non-map files were byte-identical.
- Live mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; FCP 0.9 s, LCP 0.9 s, TBT 10 ms, CLS 0.
- Bundle sizes: JS 30,627 B raw / 10,722 B gzip; CSS 17,521 B raw / 4,786 B gzip; mobile hero 107,862 B.
- Axe: zero violations on `/`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, `/terms`, and the not-found view at desktop and phone sizes.
- Normal and recovery paths: 1/90-minute boundaries, 31-rule rejection and 1-rule recovery, invalid `ftp:` recovery, reload persistence, completion/history, JSON download, malformed JSON rejection without replacement, and local reset passed.
- Offline: fresh app-shell reload with a four-block saved routine passed four live attempts, with the offline notice and no browser error.
- Privacy: the normal create/edit/export/session flow made first-party requests only. No analytics, model, font-CDN, or upload request appeared.
- Reduced motion resolved transitions to `0.000001s`; keyboard skip navigation and focus rings worked.
- Legal pages exist and accurately describe local storage and optional license verification.

This is a static PWA. Backend tenant isolation, SQLite restart persistence, health, and 429/`Retry-After` checks do not apply. CLI, library, and desktop consumer-install checks do not apply.

## Evidence

- `/work/.evidence/live-audit.json`
- `/work/.evidence/live-flow.json`
- `/work/.evidence/live-desktop.png`
- `/work/.evidence/live-phone.png`
- `/work/.evidence/lighthouse-review.json`
- `/work/.evidence/verify-url/verify.json`

No product code was modified during this review.
