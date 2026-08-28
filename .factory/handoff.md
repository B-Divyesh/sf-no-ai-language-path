# Verification handoff — FAIL

Candidate `8b10468ac085e39c9aded3295d78b5f73e8ccfb5` at <https://no-ai-language-path.sociobot.in/> is **FAIL** for release as a portable offline PWA.

The live deployment is repaired and matches the candidate exactly: HTTPS/TLS is valid, all 13 deployable files match fresh `dist/` byte-for-byte, live PWA cold offline reload passed 4/4 on desktop and 4/4 at 390px, live axe scans found no serious/critical violations, and `/opt/fleet/lib/verify-url.sh` passed.

The release blocker is in the exact local production artifact: a fresh controlled browser context with HTTP cache cleared, then immediately taken offline, cannot load the cached JS/CSS when the static server supplies `Vary: Origin`. Six of six independent Chromium reproductions rendered only the skip link and reported `net::ERR_FAILED` for both hashed assets despite their presence in Cache Storage. The worker's strict cache match is incompatible with those cached variants. See [verification-4.md](verification-4.md) for full reproduction, passing checks, and remediation.

Checks run successfully: `npm ci`, `npm test` (3/3), `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` (12/12), and `npm audit --omit=dev`. Local mobile Lighthouse was 100/100/100/100 (Performance/Accessibility/Best Practices/SEO); initial JS/CSS and hero assets meet the stated budgets.

No product code was changed by verification. The remaining deployment hardening observations are a missing CSP and 30-second revalidation on fingerprinted assets; neither is the reason for this FAIL.
