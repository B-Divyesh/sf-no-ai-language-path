# No-AI Language Path — build handoff

## Shipped

- A complete Vite + vanilla TypeScript offline PWA in the required `dist/` artifact.
- Editable, reorderable listening, reading, speaking, and recall blocks with optional local-only source links; a balanced 20-minute starter removes blank-system friction.
- A keyboard-operable block-by-block session runner with countdown/pause/restart controls, explicit completion, local history, streak count, and a printable Plus view.
- Inspectable rule-based progression. The learner chooses the completed-session threshold; the UI shows the exact count, next stage, and what does and does not trigger advancement.
- IndexedDB persistence plus full JSON export, validated replacement import, and confirmed local deletion.
- Install manifest, 192/512 icons, versioned service worker caches, cached navigation shell, offline status/fallback, and update notification.
- A free core product and optional $12 one-time Plus license using the Sociobot checkout/verify contract. Returned licenses are stored under `sb_license:no-ai-language-path`, verdicts are cached for at most one day, and cached valid licenses stay optimistic offline. No product ID is hardcoded.
- Responsive risograph visual system, original generated hero illustration with prompt/provenance, reduced-motion handling, semantic routes, and `/privacy` + `/terms`.

## Verification (2026-08-27)

Commands run from a clean dependency install:

```sh
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
VERIFY_NODE_MODULES=/work/repo/node_modules /opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ .factory/evidence
```

Results:

- Unit tests: 3/3 passed (progress counting, stage advancement, consecutive-day streak).
- Playwright 1.58.2: 8/8 passed across desktop Chromium and a 390px mobile profile. It covers starter creation, all four session steps, saved/reloaded history, direct utility routes, the modal editor, offline reload, and axe serious/critical checks.
- Offline: a saved routine reloads and remains usable after `context.setOffline(true)`.
- Accessibility verifier: title present, `lang="en"`, one `<h1>`, `<main>`, 0 missing image alt attributes, 0 unlabeled buttons, and 0 console/page errors.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 2.0 s, CLS 0, Total Blocking Time 0 ms. INP has no value in a non-interactive lab trace; browser flows exercise the interactive controls.
- Production payload: 30.68 KB initial JS (10.76 KB gzip), 17.52 KB CSS (4.77 KB gzip), 106 KB mobile hero WebP, 249 KB large hero WebP. No runtime fonts, scripts, analytics, or CDNs.
- Dependency audit: 0 production vulnerabilities (`npm audit --omit=dev`); the full installed dependency audit also reports 0 vulnerabilities.
- Output: `dist/index.html` exists at the deployment root.

Audit artifacts are in `.factory/evidence/`.

## Deployment notes

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Configure the static host to fall back to `index.html` for client routes such as `/privacy` and `/terms`.
- Register the `no-ai-language-path` paid product and its $12 one-time price in the Sociobot billing engine before release. The UI already uses `https://api.sociobot.in/api/v1/products/no-ai-language-path/...` and does not contact Dodo directly.

## Known gaps / next steps

- Live checkout and license verification require the factory’s product registration and could not be completed against production from this repository. Invalid/unavailable verification is handled without blocking the free experience.
- This is intentionally device-local: there is no account sync or recovery. Users move data via JSON export/import and restore Plus by pasting a license.
- External source links naturally require connectivity; the routine, rules, timer, and saved history do not.
- Four-week retention and rule-comprehension targets require the planned beta; no telemetry was added to simulate or measure them.
