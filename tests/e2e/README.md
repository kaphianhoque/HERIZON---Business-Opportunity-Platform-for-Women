# Herizon E2E QA suites (Playwright)

Real-browser tests of the golden path and edge cases against a running dev server (`http://localhost:3000`).

```bash
# one-time (outside the repo): npm i -g playwright && npx playwright install chromium  (+ system libs)
npm run build && pm2 start ecosystem.config.cjs
npm run test:e2e
```

- `golden.mjs` — Landing → Start → validation → demo → AI product (edit/regenerate) → pricing (৳630 / ৳900 / ৳270 / ৳5,400, comparison rows) → Facebook/WhatsApp → copy buttons (real clipboard, "Copied!") → per-channel regenerate → 3 DEMO opportunities → download → routing/back/refresh → AI failure message → empty state → mobile/tablet overflow → console errors. **90 checks.**
- `edge.mjs` — whitespace/short description, all-blank costs, garbage numbers, blank capacity, 0 % margin, labor rate, float precision, XSS escaping, double-submit guards, stale-refresh sync, API 400/404/422, keyboard submit, header/logo nav. **29 checks.**

Playwright is not a project dependency; the suites import it from a global/adjacent install so the Cloudflare bundle stays untouched.
