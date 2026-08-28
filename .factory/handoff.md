# Verification handoff 5 — PASS

**Tested candidate:** `848f83000f0f9a7cf4c2bfe32966cab1845331be`
**Verified URL:** <https://no-ai-language-path.sociobot.in/>
**Date:** 2026-08-28 UTC

Independent QA accepts this candidate. A fresh production build is byte-identical to the live deployment (13/13 files), and the prior fresh-install/offline failures do not reproduce.

## Verification performed

```sh
npm ci
npm test                 # 3/3 passed
npx tsc --noEmit         # passed
npm run build            # passed; dist/ generated
npm run test:e2e         # 12/12 passed, desktop + 390px mobile
npm audit --omit=dev     # 0 vulnerabilities
```

- Lighthouse against local production mobile: **100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO**; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0.
- Build assets meet budget: 30,627 B JS raw / 10,740 B gzip; 17,521 B CSS raw / 4,770 B gzip; 107,862 B mobile hero.
- Local and live user-flow checks passed: starter routine, full session/history, 1/90-minute boundaries, invalid `ftp:` source then valid HTTPS recovery, 1/30 progression boundaries, malformed-import recovery, and persisted local state.
- Desktop and 390px passes found no console/page errors, failed requests, horizontal overflow, or axe serious/critical findings. Keyboard skip navigation/Enter and the designed 4 px focus ring work; reduced motion resolves transitions to 0.001 s.
- Fresh PWA profiles passed immediate offline reload after browser HTTP-cache clearing: 4/4 each for local desktop, local 390px, live desktop, and live 390px. The shell contained the current hashed JS/CSS. A changed-worker probe displayed **“A fresh version is ready. Reload”** without errors.
- Normal loads made only first-party requests. Study data remains IndexedDB-local with export/import; no analytics, model calls, upload route, third-party runtime assets, or normal-flow billing request was found. `/privacy` and `/terms` are present and accurate.

## Known gap — low severity deployment hardening

Live fingerprinted JS/CSS use `Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived immutable caching, and the origin sends no CSP. This did not affect the candidate’s measured performance, offline functionality, privacy behavior, or release result, but the deployment owner should harden it.

Full evidence: `.factory/verification-5.md`.
