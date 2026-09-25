# Herizon — Project Tracker

**Tagline:** Your Story. Your Skill. Your Market.
**Last updated:** 2026-09-25 · latest commit `398a588`
**Sandbox preview (temporary):** https://3000-ifno47fr4b792rj0hsp79-5185f4aa.sandbox.novita.ai
**Backup repo (Genspark SB-Git, auto-pushed):** `genspark-f3d9c3c1-19a8-438f-81d8-750f914c1e9e` · branch `main`
**GitHub:** ✅ https://github.com/kaphianhoque/HERIZON---Business-Opportunity-Platform-for-Women · branch `main`

---

## 1. Status at a glance

| Area | Owner | Status | Notes |
|---|---|---|---|
| Core app, UX, routing, module contracts | Member 1 | ✅ Done | Hono + vanilla SPA, 5-step flow |
| Branding SheLink → Herizon | Member 1 | ✅ Done | 0 remaining references |
| Smart Pricing & Profit engine | Member 2 | ✅ Done | Deterministic, 46 unit tests |
| AI Product Builder + AI Promotion | Member 3 | ✅ Done | OpenAI via server fetch, guardrails, template fallback |
| Opportunity Matching (demo data) | Member 4 | ✅ Done | 10 DEMO records, 7 types, top-3 |
| QA pass + E2E suites | Team | ✅ Done | 165 automated checks, 2 bugs fixed |
| Visual system (fonts, gradient, real photos, a11y) | Member 1 | ✅ Done | Grotesk + editorial serif, ivory→rose→mauve |
| Opportunities card UI refinement | Member 1 | ✅ Done | Compact equal-height cards, actions |
| Push to GitHub | Team | ✅ Done | `kaphianhoque/HERIZON---Business-Opportunity-Platform-for-Women` |
| Production deploy (Cloudflare Pages) | Team | ⏳ Pending | Choose hosted vs own CF account |
| Pitch deck + 3-min demo rehearsal | Team | ⏳ Pending | Script in §6 |

Legend: ✅ done · 🟡 partial · ⏳ not started · ❌ blocked

---

## 2. Member deliverables

### Member 1 — Core App + Integration + Visual ✅
| # | Task | Status | Where |
|---|---|---|---|
| 1.1 | Hono / Cloudflare Pages scaffold, PM2 dev server | ✅ | `src/index.tsx`, `ecosystem.config.cjs` |
| 1.2 | Shared type contracts for all modules | ✅ | `src/types.ts` |
| 1.3 | Landing (hero, Start / Try Demo, who-for, 4 steps, trust, CTA) | ✅ | `#/` |
| 1.4 | "Tell Us What You Make" form (description + 6 numbers + optional labor rate, goal, region) | ✅ | `#/story` |
| 1.5 | Product / Pricing / Promotion / Opportunities pages + step nav | ✅ | `#/product` … `#/opportunities` |
| 1.6 | Try Demo preset (Homemade Chocolate Cake) | ✅ | `src/demo.ts` |
| 1.7 | Reusable components `C.*`, hash router, sessionStorage persistence | ✅ | `public/static/app.js` |
| 1.8 | Rebrand → Herizon (title, nav, hero, meta, OG, storage key, hashtags) | ✅ | |
| 1.9 | Typography: Schibsted Grotesk (UI) + Instrument Serif italic (accents) | ✅ | `src/page.ts` |
| 1.10 | Soft gradient background (ivory → blush → mauve), refined palette, cards, buttons | ✅ | `public/static/style.css`, `src/page.ts` |
| 1.11 | Real uploaded photos only: tailor portrait (hero), weavers (credibility) | ✅ | `public/static/img/hero.jpg`, `community.jpg` |
| 1.12 | Accessibility: focus rings, aria-live, alert roles, aria-current, reduced motion | ✅ | |
| 1.13 | Desktop-first responsive (3/2/1 grids, mobile header) | ✅ | |
| 1.14 | Opportunities card UI refinement (compact, actions) | ✅ | `views.opportunities()` |
| 1.15 | README, TRACKER | ✅ | |
| — | Not built by design: payments, checkout, login, admin, chat, order tracking | n/a | |

### Member 2 — Smart Pricing & Profit ✅
| # | Task | Status | Where |
|---|---|---|---|
| 2.1 | Deterministic engine, margin = % of **selling price**, no AI | ✅ | `src/modules/pricing.ts` |
| 2.2 | `total = prod+pack+deliv`; `price = total/(1−m)`; `profit = price−total`; `monthly = profit×cap` | ✅ | Demo: 630 → ৳900 → ৳270 → ৳5,400 |
| 2.3 | Display: Total Cost · Recommended Price · Profit/Unit · Margin · Monthly Profit | ✅ | `#/pricing` |
| 2.4 | Comparison table ৳850 / **৳900 ★** / ৳950 | ✅ | |
| 2.5 | Validation: no negatives, margin < 100 %, blanks → 0, capacity ≥ 0 (server + live client) | ✅ | |
| 2.6 | Time not costed unless hourly rate given | ✅ | |
| 2.7 | "How we calculated" transparency panel | ✅ | |
| 2.8 | `/api/pricing` → 422 + `issues[]` on invalid | ✅ | |
| 2.9 | Unit tests | ✅ | `npm test` → 46/46 |

### Member 3 — AI Product + Social Posts ✅
| # | Task | Status | Where |
|---|---|---|---|
| 3.1 | Workers-safe OpenAI client (fetch, JSON mode, `reasoning_effort: minimal`, timeout) | ✅ | `src/modules/ai.ts` |
| 3.2 | Product Name / Category / description (+features, customers, keywords) | ✅ | `src/modules/product.ts` |
| 3.3 | No-invention rules: prompt + regex guardrails (experience, certs, buyers, revenue, location, achievements, availability) | ✅ | |
| 3.4 | Product **Edit** (inline form) + **Regenerate** | ✅ | `#/product` |
| 3.5 | Facebook caption + WhatsApp message from edited product + exact price + capacity | ✅ | `src/modules/promotion.ts` |
| 3.6 | **Copy Facebook Post** / **Copy WhatsApp Message** → clipboard + "Copied!" | ✅ | |
| 3.7 | Per-channel **Regenerate** (other channel preserved) | ✅ | |
| 3.8 | Price validated — AI output rejected if price altered/missing (1 retry → template) | ✅ | |
| 3.9 | Loading: "Herizon is preparing your product…" / "…creating your promotion…" | ✅ | |
| 3.10 | Failure: "Herizon couldn't generate this right now. Please try again." (HTTP 502) | ✅ | |
| 3.11 | Template fallback when AI unavailable; `source` badge | ✅ | |
| 3.12 | No auto-publishing (copy + `wa.me` link only) | ✅ | |
| 3.13 | Secrets via `.dev.vars` / `wrangler pages secret put`; `.dev.vars.example` | ✅ | |

### Member 4 — Opportunity Matching ✅ (demo data)
| # | Task | Status | Where |
|---|---|---|---|
| 4.1 | 10 DEMO opportunities, 7 types (Buyer, Supplier, Mentor, Women network, Workshop, Community, Market) | ✅ | `DEMO_OPPORTUNITIES` |
| 4.2 | Fields: title, type, category, description, productCategories, region, businessGoals, minCapacity, `demo` | ✅ | `src/types.ts` |
| 4.3 | Point scoring: category +40 / type kw +20 / goal +30 / capacity ±  / region ± → top 3 | ✅ | `src/modules/opportunities.ts` |
| 4.4 | Each card: DEMO tag · type · match % · title · meta · description · "Why it matches" · actions | ✅ | |
| 4.5 | Every card labelled DEMO + page notice; no fake org presented as real | ✅ | |
| 4.6 | Goal + region inputs on "Tell Us" | ✅ | |
| 4.7 | Opportunities re-match when product is edited/regenerated | ✅ | QA fix |
| 4.8 | Replace demo data with verified real opportunities (D1) | ⏳ | post-hackathon |

---

## 3. API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/generate` | Full pipeline → `HerizonResult` |
| POST | `/api/product` | Listing; `regenerate:true` = strict AI (502 on failure) |
| POST | `/api/pricing` | Pure calculator; 422 + `issues[]` on invalid |
| POST | `/api/promotion` | FB + WA; accepts edited `product`, `channel`, `previous` |
| POST | `/api/opportunities` | Top-3 demo matches; accepts edited `product` |
| GET | `/api/demo` | Demo preset |
| GET | `/api/health` | `{ ok, ai, model }` |

---

## 4. Quality gates (last run: 2026-09-25, all green)

| Check | Result |
|---|---|
| `npm run build` | ✅ |
| `npm test` — pricing unit tests | ✅ 46 / 46 |
| `tests/e2e/golden.mjs` — golden path, real browser | ✅ 90 / 90 |
| `tests/e2e/edge.mjs` — edge cases | ✅ 29 / 29 |
| Demo numbers | ৳630 / ৳900 / ৳270 / 30 % / ৳5,400 ✅ |
| Console errors on clean run | 0 ✅ |
| Mobile 390 px / tablet 820 px overflow | none ✅ |
| AI guardrail bait test | 0 invented claims ✅ |
| "SheLink" anywhere | 0 ✅ |

Bugs found & fixed in QA: stale opportunities after product edit (`91ceb5c`); mobile header (Home leaking, 3-line CTA) (`91ceb5c`).

---

## 5. Open items & risks

| Item | Priority | Owner | Notes |
|---|---|---|---|
| Production deploy to Cloudflare Pages + set `OPENAI_API_KEY` secret | 🔴 High | Team | Decide: Genspark-hosted vs own CF account |
| Pitch deck & demo rehearsal | 🔴 High | Team | §6 |
| Rate-limit `/api/*` to protect AI spend | 🟡 Med | Member 3 | per-IP counter in D1 |
| Replace DEMO opportunities with verified real data (D1) | 🟡 Med | Member 4 | keep DEMO labels until verified |
| Bangla language toggle | 🟡 Med | Member 1 | strings centralised in `app.js` views |
| Tailwind CDN → build step | 🟢 Low | Member 1 | removes prod console warning |
| License PP Editorial New (optional) | 🟢 Low | Member 1 | already first in serif font stack |

---

## 6. Demo script (3 minutes)

1. **Landing** (15 s) — real tailor portrait, "Your Story. *Your Skill.* Your Market."
2. **Try Demo** (10 s) — loading: "Herizon is preparing your product…"
3. **Product** (30 s) — AI listing "Homemade Chocolate Cake · Home Bakery / Food". Click **Edit**, rename "Rina's Chocolate Cake", Save.
4. **Pricing** (45 s) — 630 → ৳900 → ৳270 → ৳5,400; comparison table; "How we calculated". Say: deterministic, no AI touches money.
5. **Promotion** (45 s) — Facebook post says "Rina's Chocolate Cake" at ৳900. **Copy Facebook Post** → "Copied!". **Regenerate** WhatsApp → new text, FB unchanged.
6. **Opportunities** (20 s) — 3 compact cards, DEMO tag, "Why it matches", Request Connection / Details / Save. Point out honesty of demo labelling.
7. **Close** (15 s) — "Simple words in. Professional business out."

---

## 7. Set up on another computer

### 7a. Get the code
```bash
git clone https://github.com/kaphianhoque/HERIZON---Business-Opportunity-Platform-for-Women.git herizon
```
(A second backup also lives in the Genspark SB-Git repo `genspark-f3d9c3c1-19a8-438f-81d8-750f914c1e9e`.)

### 7b. Run
```bash
cd herizon
npm install
cp .dev.vars.example .dev.vars        # add OPENAI_API_KEY (+ OPENAI_BASE_URL if using a proxy)
npm run build
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000     # or: pm2 start ecosystem.config.cjs
# open http://localhost:3000
```
Without an API key the app still works — product & promotion fall back to templates.

### 7c. Test
```bash
npm test                 # 46 pricing unit tests
# E2E (needs Playwright + Chromium available to node): 
npm run test:e2e         # tests/e2e/golden.mjs + edge.mjs against localhost:3000
```

### 7d. Deploy (Cloudflare Pages)
```bash
npx wrangler pages project create herizon --production-branch main
npx wrangler pages secret put OPENAI_API_KEY --project-name herizon
npx wrangler pages secret put OPENAI_BASE_URL --project-name herizon   # if using a proxy
npm run build && npx wrangler pages deploy dist --project-name herizon
```

---

## 8. File map

```
src/
  index.tsx              Hono router — all /api/* endpoints, serves SPA
  page.ts                HTML shell: fonts, Tailwind config, component classes, header/footer
  types.ts               Shared contracts (StoryInput, ProductListing, PricingResult, PromotionContent, Opportunity…)
  demo.ts                Try Demo preset
  modules/
    ai.ts                OpenAI-compatible fetch client + NO_INVENTION_RULES
    product.ts           AI Product Builder (+ template fallback)
    pricing.ts           Deterministic pricing engine
    promotion.ts         AI Facebook / WhatsApp (+ template fallback)
    opportunities.ts     DEMO catalog + simple scorer
public/static/
  app.js                 SPA: state · api · components · views · router · actions
  style.css              Gradient background, animations, a11y helpers
  favicon.svg
  img/hero.jpg           Uploaded — tailor at sewing machine (hero)
  img/community.jpg      Uploaded — two women at looms (credibility)
tests/
  pricing.test.ts        46 unit tests
  e2e/golden.mjs         90 browser checks
  e2e/edge.mjs           29 browser checks
.dev.vars.example        Env template (never commit .dev.vars)
ecosystem.config.cjs     PM2 dev config
wrangler.jsonc           Cloudflare Pages config
README.md · TRACKER.md
```

---

## 9. Commit history

| Commit | Description |
|---|---|
| `398a588` | Opportunities UI: compact equal-height cards, DEMO tag in header, actions, 3/2/1 columns |
| `4623eaf` | Real uploaded photos (tailor hero, weavers); remove generated images; accessibility polish |
| `6ebf4e8` | Visual refresh: Grotesk + editorial serif, ivory→rose→mauve gradient, refined UI |
| `91ceb5c` | QA: fix stale opportunities + mobile header; add Playwright E2E suites |
| `be252a9` | Member 4: demo Opportunity Matching (10 records, 7 types, top-3, reasons) |
| `f30c67a` | Add project tracker |
| `c9b3513` | Member 3: AI Product Builder + AI Promotion, guardrails, edit/regenerate, copy |
| `b253ae1` | Member 2: deterministic pricing engine, comparison table, validation, 46 tests |
| `5e10e09` | Rebrand SheLink → Herizon; photo-driven landing |
| `4662eac` | Core MVP: landing, story input, product/pricing/promotion/opportunities |
| `5ca5901` | Initial commit |
