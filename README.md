# No-AI Language Path

No-AI Language Path is a private, offline routine composer for language learners who want structure without a generative tutor or hidden personalization. Learners arrange listening, reading, speaking, and recall blocks, follow the built-in timer/checklist, and advance through a rule they can inspect and change.

Live: <https://no-ai-language-path.sociobot.in>

## What v1 includes

- Editable, reorderable four-skill routine blocks with optional private source links
- A focused block-by-block session timer and local completion history
- A plain progression rule: finish the chosen number of complete sessions to advance
- IndexedDB persistence, installable PWA shell, and tested offline reuse
- Complete JSON export/import and explicit local deletion
- Free core experience; optional $12 one-time Plus license for 90-day history and printable sheets
- `/privacy` and `/terms` routes, with no analytics, trackers, model calls, or third-party runtime assets

The researched opportunity is in [`.factory/brief.json`](.factory/brief.json), the product-specific risograph system and image provenance are in [`.factory/design.md`](.factory/design.md), and build verification is in [`.factory/handoff.md`](.factory/handoff.md).

## Who it is for

Privacy- or quality-conscious learners who already have podcasts, readings, recordings, or recall material and want one transparent daily loop around them. It does not generate exercises, choose difficulty, tutor through chat, or promise fluency.

## Run and test

Requires Node.js 22.12+ (or Node.js 20.19+).

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

`npm run build` is the production build command. It writes the static deploy artifact to `./dist`, with `dist/index.html` at its root. `test:e2e` builds and serves that artifact automatically, then exercises desktop, 390px mobile, offline persistence, and axe accessibility checks in Chromium.

## Data and billing

Study data is stored in the browser’s IndexedDB database `no-ai-language-path`. License tokens and a daily verification verdict use the documented `sb_license:no-ai-language-path` localStorage key. Checkout and verification use only the Sociobot billing API; there is no embedded payment provider and no hardcoded product ID.

For static deployment, publish `dist/` and configure history fallback to `index.html` so direct visits to `/privacy`, `/terms`, and other client routes work. The service worker handles subsequent navigation offline.

## License

MIT. See [LICENSE](LICENSE).
