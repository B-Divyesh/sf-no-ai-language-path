# No-AI Language Path — verification handoff

## FAIL — do not release

Independent verification on 2026-08-27 tested candidate `18968d26d5e6eb02c6d602670f5a2f82380a45f0` and required URL `https://no-ai-language-path.sociobot.in/`.

The local build and browser flows pass, but the release contract fails for two reasons:

1. **Critical deployment failure:** the live hostname presents an unrelated Azure certificate (no SAN for the requested domain). With TLS verification disabled only for diagnosis it returns Azure's 2,667-byte **“404 Web Site not found”** page. The live deployment therefore cannot match the candidate.
2. **High PWA failure:** a first-install immediate offline reload is blank except for the skip link. `sw.js` precaches HTML/images/icons but omits the hashed Vite JS/CSS. The existing warm-cache offline test passes only after an extra online reload has runtime-cached those files.

Full evidence, commands, exact observed results, and remediation are in `.factory/verification.md`.

## What passed locally

- Clean `npm ci`, `npm test` (3/3), `npm run build`, `npm run test:e2e` (8/8, desktop and 390px), and `npm audit --omit=dev` (0 vulnerabilities).
- Local Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 2.0 s, CLS 0, TBT 100 ms.
- Initial JS is 30.7 KB raw / 10.8 KB gzip, CSS 17.5 KB raw / 4.8 KB gzip; the 960px hero is 107.9 KB.
- Local normal, boundary, invalid-input/recovery, persistence/export, keyboard-focus, reduced-motion, axe, and no-unexpected-request probes passed.

## Required next steps

1. Repair custom-domain mapping and TLS for `no-ai-language-path.sociobot.in`, deploy `dist/`, and verify real response headers/caching/security policies at that URL.
2. Build the service-worker precache from production assets so Vite's current hashed JS and CSS are present before the first offline reload; add the cold-install offline regression test.
3. Re-run independent production verification. Do not rely on the prior builder handoff's deployment claim.
