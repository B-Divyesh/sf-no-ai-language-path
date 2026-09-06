# Verification 6 — Build a private language study routine

**Verdict: PASS**

- Work order: `no-ai-language-path-verify-6`
- Tested: 2026-09-06 UTC
- Live URL: <https://no-ai-language-path.sociobot.in>
- Implementation reviewed: `b15f00b58bc9c20aefb543a9312928a0c56334d0`
- Documentation reviewed: `11ffa2560cc24ccc6ac7ecbe79f7fe5f4a224dbc`
- Findings: **0** — critical 0, high 0, medium 0, low 0
- Untested claim groups: **0**

## Result

PASS. The deployed static PWA matches the implementation candidate, completes the real routine-building job, and passes the clean repository and live checks. Every declared claim command passed separately. No public claim was missing, false, incomplete, or untested.

The billing checkout endpoint still returns HTTP 404 because product registration is pending. This is not a hidden or broken user path: the product shows “Checkout is not available yet”, provides no checkout link, keeps the $12 one-time offer visible, and declares and tests that exact state. Registration remains a separate operator dependency.

## First screen before scrolling

- Job: build a private language study routine.
- Audience: language learners who use their own material and want a clear daily plan without generated lessons.
- First action: “Try it with sample data”. The adjacent text says it opens a filled four-block Spanish routine and leaves current data unchanged.
- Desktop 1440×900: the action occupied y=716–764 and was visible before scrolling.
- Phone 390×664: the action occupied y=443–491 and was visible before scrolling.
- The offline, privacy, and price facts were also visible before scrolling in both fresh browsers.

## Clean-checkout checks

The checks ran from a detached clean checkout of documentation SHA `11ffa2560cc24ccc6ac7ecbe79f7fe5f4a224dbc`. The later documentation and test-only commits do not change the product runtime from implementation SHA `b15f00b58bc9c20aefb543a9312928a0c56334d0`.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 52 packages installed; 0 vulnerabilities |
| `npm test` | PASS — 10/10 Vitest tests |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — `dist/index.html` produced; 16-file service-worker shell |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm run test:e2e` | PASS — 76/76 across desktop Chromium and 390px mobile |
| Bundle budgets | PASS — JS 38,295 bytes raw / 12.40 KB gzip; CSS 19,578 bytes raw / 5.17 KB gzip; mobile hero 107,862 bytes |

## Declared claims

Every command from `.factory/claims.json` ran separately from the clean checkout. The manifest has 26 declarations, the test file has exactly 26 matching tags, every ID occurs once, and there are no orphan tags.

| Claim ID | Result |
| --- | --- |
| `demo-isolation` | PASS |
| `four-part-routine` | PASS |
| `edit-blocks` | PASS |
| `reorder-blocks` | PASS |
| `private-source-links` | PASS |
| `guided-session` | PASS |
| `completion-history` | PASS |
| `progression-rule` | PASS |
| `rule-preserves-history` | PASS |
| `user-controlled-content` | PASS |
| `offline-reload` | PASS |
| `installable-pwa` | PASS |
| `local-persistence` | PASS |
| `privacy-network` | PASS |
| `no-account` | PASS |
| `no-file-upload` | PASS |
| `complete-export` | PASS |
| `confirmed-import` | PASS |
| `erase-local-data` | PASS |
| `free-core` | PASS |
| `plus-offer` | PASS |
| `plus-history` | PASS |
| `print-study-sheet` | PASS |
| `restore-license` | PASS |
| `revoked-license` | PASS |
| `build-output` | PASS |

The command transcript is `/work/.evidence/qa6-claims-clean-run.log`.

## Live product checks

### Demo and main job

Fresh desktop and phone contexts passed the following path:

1. Created a real four-block starter routine.
2. Opened the sample in one click.
3. Confirmed four realistic Spanish-study blocks, 20 planned minutes, two completed sessions, and `2/3` progression.
4. Confirmed the persistent “Demo — sample data, nothing is saved” label.
5. Observed separate IndexedDB databases `no-ai-language-path` and `demo:no-ai-language-path`.
6. Edited the sample and reset it to the original data.
7. Left with “Start for real” and confirmed the real routine was unchanged.

The timer, ordered checklist, completion history, progression, edit, reorder, export, import confirmation, deletion, license restore, revoked-license, and print paths also passed the complete browser and claim suites.

### Invalid, boundary, and recovery paths

- Block minutes: 0 and 91 were invalid; 1 and 90 saved correctly.
- Source URL: `ftp:` was rejected with a specific recovery message; `https:` then saved.
- Progression count: 0 and 31 were invalid; 30 and 1 saved correctly.
- Fractional rule and stage import was rejected without replacing the current routine.
- Malformed JSON was rejected with “Your current data was not changed”; the saved 90-minute block remained.
- An invalid live license returned a clear inactive-license message. The evidence log redacts the query value.

### Accessibility and mobile

- Playwright axe integration found zero serious or critical violations on `/`, `/demo`, `/history`, `/rules`, `/data`, `/plus`, `/privacy`, and `/terms`.
- Each route had `lang=en`, one `h1`, one `main`, ordered headings, and a route-specific title.
- The skip link was first in keyboard order and moved focus to `main`.
- SPA navigation moved focus to the new heading, and closing the block dialog restored focus to its opener.
- Focus used a visible 4px cobalt outline. Header and footer targets met the 44px baseline.
- Reduced motion changed transitions to effectively instant (`0.000001s`).
- At 200% root text size on a 390px viewport, the document had no horizontal overflow, off-screen control, or clipped visible text.
- The worker `verify-url.sh` check passed with no console errors, missing alt text, or unnamed buttons.

### Offline and update behavior

- Fresh desktop and phone contexts loaded `/demo`, waited for worker control, cleared the ordinary HTTP cache, went offline, and reloaded successfully.
- Both contexts showed the populated sample, persistent demo label, and explicit offline status with no browser errors.
- The worker shell contained the current hashed JavaScript and CSS plus all 14 other required shell files. It excluded the host-only configuration.
- The browser suite passed the controlled-worker update notice and reload action.

The live replay of `tests/app.e2e.ts` passed 22 applicable tests. Its two remaining assertions intentionally require the local preview server's `Vary: Origin` header and therefore stop on Azure, which correctly does not send that header. Independent host-neutral desktop and phone checks exercised the offline steps those assertions precede; both passed. This is a test-environment distinction, not a product failure.

### Privacy, routes, links, and response policy

- Normal real and demo flows made same-origin requests only. No model, analytics, tracking, upload, font-CDN, or third-party asset request occurred.
- A license check contacted only the disclosed Sociobot verification endpoint after explicit submission.
- All 23 discovered live links returned 2xx responses, including the public privacy-contact link.
- All eight public routes returned 200 with their own title, canonical URL, description, Open Graph fields, Twitter card, one heading, and one main landmark.
- A deliberate unknown URL returned the designed product page with HTTP 404 and a route back.
- HTTP redirects to HTTPS. Live responses include CSP, HSTS, `nosniff`, referrer, frame, and permissions policies.
- Hashed JavaScript and CSS use `max-age=31536000, immutable`; HTML and the worker use short revalidation.
- The canonical build matched all 18 served non-map files byte for byte. Azure consumes `staticwebapp.config.json`, so it is not a public file.

### Performance and visual review

- Live mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.
- FCP 0.9 s, LCP 1.0 s, TBT 0 ms, CLS 0.
- Desktop, phone, and offline screenshots match the documented single-mode risograph workbench design. The hand-made icon and generated hero provenance are recorded in `.factory/design.md`.
- No extra AI feature is appropriate: avoiding model calls is the product's stated job and privacy promise. Import and complete export cover the useful non-AI portability path.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| F-01 sample demo missing | Fixed. One-click realistic sample, persistent label, reset, exit, and separate IndexedDB namespace passed live. |
| F-02 claims missing | Fixed. All 26 declarations have exactly one matching test; all 26 commands passed separately. |
| F-03 checkout returned 404 | External registration remains pending. The broken link was removed; the UI and claim accurately state checkout is unavailable. |
| F-04 first screen unclear | Fixed. Job, audience, first action, outcome, and three facts are visible before scrolling on desktop and phone. |
| F-05 fractional import accepted | Fixed. Unit, full browser, and live rejection/recovery checks passed. |
| F-06 route titles and metadata incomplete | Fixed. Titles, canonicals, descriptions, social metadata, icons, sitemap, and routes passed. |
| F-07 focus and touch targets failed | Fixed. Route focus, dialog restoration, focus styling, and 44px targets passed. |
| F-08 not-found returned 200 | Fixed. The designed live page returns HTTP 404. |
| F-09 structure and plain words incomplete | Fixed. Required section order, footer, contact link, copy audit, and plain headings are present. No audited sentence exceeds 22 words or uses a banned term. |
| F-10 no CSP and short asset cache | Fixed live. CSP is present and hashed JS/CSS use one-year immutable caching. |
| Initial TLS mismatch and Azure default page | Fixed. HTTPS is valid and serves the product. |
| Hashed assets absent from precache | Fixed. Current JS and CSS are in the 16-file shell. |
| First-control activation race | Fixed. Fresh live offline reload passed on desktop and phone. |
| `Vary: Origin` cache miss | Fixed. The clean local desktop and phone regression passed. |
| Update notice not proved | Fixed. The controlled-update browser regression passed. |

## Billing dependency

`GET https://api.sociobot.in/api/v1/products/no-ai-language-path/checkout` returns HTTP 404 with the known registration-pending response. A harmless invalid-token verification returns HTTP 200 with `valid: false`, and the live restore form explains how to recover. The free product remains complete and the paid offer is honestly unavailable rather than linked to a broken page.

The separate billing operator must register the preserved $12 one-time offer. No product-code repair, secret access, payment-provider integration, or deployment action is authorized or required in this verification.

## Scope and evidence

This is a static PWA. Backend tenant isolation, SQLite restart persistence, health, and 429/`Retry-After` checks do not apply. CLI, library, and desktop installation checks do not apply.

Primary evidence:

- `/work/.evidence/qa6-claims-clean-run.log`
- `/work/.evidence/qa6-e2e.log`
- `/work/.evidence/qa6-live-audit.json`
- `/work/.evidence/qa6-live-boundary-recovery.json`
- `/work/.evidence/qa6-link-metadata-audit.json`
- `/work/.evidence/qa6-live-artifact-compare.log`
- `/work/.evidence/qa6-http.log`
- `/work/.evidence/qa6-lighthouse.json`
- `/work/.evidence/qa6-verify-url/verify.json`
- `/work/.evidence/qa6-live-desktop.png`
- `/work/.evidence/qa6-live-phone.png`
- `/work/.evidence/qa6-live-phone-offline.png`

No product code was modified.
