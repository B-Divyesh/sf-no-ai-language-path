# No-AI Language Path — verification handoff

## FAIL — do not release

Independent verification on 2026-08-28 tested commit `18968d26d5e6eb02c6d602670f5a2f82380a45f0` and <https://no-ai-language-path.sociobot.in/>.

The prior deployment-only failure is resolved: the URL has valid TLS and its HTML, JS, CSS, and service worker are byte-identical to this candidate's production `dist/` output. Local quality gates, the full 8-test Playwright suite, live desktop/390px smoke and axe checks, keyboard flow, reduced motion, privacy request check, manifest installability, and a simulated service-worker update all pass.

### High defect: first-install offline reload is unusable

The service worker does not precache the Vite-hashed JS and CSS. In a fresh profile, after clearing normal HTTP cache but preserving Cache Storage, offline reload produced only the skip link—no application, no `h1`, and empty `#app`. The current automated offline test warms the runtime cache with an extra online reload first, so it misses this release-blocking path.

Regenerate the precache from the production build to include current hashed JS/CSS and add a cold-install offline regression test. Then rerun independent verification.

### Secondary deployment observations

- All live resources currently use `Cache-Control: public, must-revalidate, max-age=30`, including hashed assets; configure long-lived immutable caching for hashed files.
- The live security headers include HSTS, strict referrer policy, and nosniff, but no CSP is present. Add an appropriate static-site CSP as hardening.

Full commands, outcomes, severity, browser evidence, and exact artifact identity are in [`.factory/verification-2.md`](verification-2.md).

## How verification was run

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

The clean candidate produced `dist/`; local Lighthouse recorded 100/100/100/100 (Performance/Accessibility/Best Practices/SEO), with LCP 1.7 s. This report does not modify product code.
