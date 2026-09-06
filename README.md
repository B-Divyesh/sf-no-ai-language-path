# No-AI Language Path

Build and follow a private language study routine. The app is for learners who bring their own listening, reading, speaking, and recall material.

Live app: <https://no-ai-language-path.sociobot.in>

One-click sample: <https://no-ai-language-path.sociobot.in/demo>

## What it does

- Builds editable and reorderable four-part routines with optional source links.
- Guides each session with a timer and ordered checklist.
- Records complete sessions and applies one visible progression rule.
- Stores routine data in IndexedDB and works offline after the first visit.
- Exports complete JSON backups, confirms imports, and supports local deletion.
- Runs without an account, model calls, analytics, trackers, or third-party runtime assets.

The sample uses a separate `demo:no-ai-language-path` IndexedDB database. Reset restores its four Spanish-study blocks and two history rows. “Start for real” deletes the sample database and returns to the real namespace.

## Free and paid features

The routine builder, timer, rules, offline use, and complete export remain free. Plus is priced at $12 once and adds sessions from the last 90 days and printable study sheets. A valid license can be restored on another device. A refunded, revoked, or invalid license removes paid access.

Checkout is currently unavailable because billing registration is pending. The required public offer metadata is in `/work/.evidence/billing-offer.json` for the separate billing operator.

## Run and verify

Use Node.js 22 and npm.

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

The build writes the deployable static app to `dist/`. `npm run test:e2e` builds and serves it, then checks desktop and 390 px phone behavior. The same suite covers accessibility, keyboard focus, isolated demo data, invalid input, offline reload, metadata, and HTTP 404 behavior.

Every public product claim has one command in [`.factory/claims.json`](.factory/claims.json). Run a single claim exactly as listed, or run all claim tests:

```sh
npm run test:claims -- --project=chromium
```

## Deploy

Publish `dist/` to the product’s Azure Static Web App. Keep [`staticwebapp.config.json`](public/staticwebapp.config.json) with the artifact so route rewrites, 404 responses, CSP, and cache rules apply.

## Product records

- [Researched brief](.factory/brief.json)
- [Visual system and asset provenance](.factory/design.md)
- [Demo contract](.factory/demo.md)
- [Repair handoff](.factory/handoff.md)
- [Privacy](https://no-ai-language-path.sociobot.in/privacy)
- [Terms](https://no-ai-language-path.sociobot.in/terms)

## License

MIT. See [LICENSE](LICENSE).
