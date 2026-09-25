# Herizon — Hackathon Project Tracker

**Tagline:** Your Story. Your Skill. Your Market.
**Last updated:** 2026-09-25
**Preview:** https://3000-ifno47fr4b792rj0hsp79-5185f4aa.sandbox.novita.ai
**Repo (auto-backup):** `genspark-f3d9c3c1-19a8-438f-81d8-750f914c1e9e` · branch `main`

---

## 1. Status at a glance

| Area | Owner | Budget | Status | Notes |
|---|---|---|---|---|
| Core app, UX, integration | Member 1 | ~10k | ✅ Done | Landing, story input, 5-step flow, routing, module contracts |
| Rebrand SheLink → Herizon + web visuals | Member 1 | (within M1) | ✅ Done | Photography, desktop-first layout, warm palette |
| Smart Pricing & Profit engine | Member 2 | ~8–10k | ✅ Done | Deterministic, 46 tests passing |
| AI Product Builder + AI Promotion | Member 3 | ~10k | ✅ Done | OpenAI via server-side fetch, guardrails, edit/regenerate |
| Opportunity matching | Member 4 (TBD) | — | 🟡 MVP (static catalog) | Rule-based scoring; ready to move to D1 / live data |
| Production deployment | Team | — | ⏳ Pending | Choose hosted deploy vs own Cloudflare account |
| Demo rehearsal / pitch | Team | — | ⏳ Pending | See §6 |

Legend: ✅ done · 🟡 partial / MVP · ⏳ not started · ❌ blocked

---

## 2. Member deliverables

### Member 1 — Core App + Integration ✅
| # | Task | Status | Evidence |
|---|---|---|---|
| 1.1 | Hono + Cloudflare Pages scaffold, PM2 dev server | ✅ | `src/index.tsx`, `ecosystem.config.cjs` |
| 1.2 | Shared type contracts for all modules | ✅ | `src/types.ts` |
| 1.3 | Landing page (tagline, main text, Start / Try Demo, 4 steps) | ✅ | `#/` |
| 1.4 | "Tell Us What You Make" input + 6 numeric fields | ✅ | `#/story` |
| 1.5 | Product / Pricing / Promotion / Opportunities pages + step nav | ✅ | `#/product` … `#/opportunities` |
| 1.6 | Try Demo preset (Homemade Chocolate Cake) | ✅ | `src/demo.ts`, `/api/demo` |
| 1.7 | Reusable components (`C.*`), hash router, sessionStorage persistence | ✅ | `public/static/app.js` |
| 1.8 | Responsive mobile layout | ✅ | Tailwind breakpoints |
| 1.9 | Rebrand to **Herizon** everywhere (title, meta, hashtags, types, storage key) | ✅ | `grep SheLink` → 0 |
| 1.10 | Landing photography (baking, tailoring, handicrafts, food, shop) | ✅ | `public/static/img/*.jpg` |
| 1.11 | Desktop-first web layout (`max-w-7xl` landing, `max-w-6xl` inner, 2-col story form) | ✅ | |
| 1.12 | README | ✅ | `README.md` |
| — | **Not built (by design):** payments, checkout, login, admin, chat, order tracking | n/a | |

### Member 2 — Smart Pricing & Profit ✅
| # | Task | Status | Evidence |
|---|---|---|---|
| 2.1 | Deterministic engine, margin as % of **selling price** | ✅ | `src/modules/pricing.ts` |
| 2.2 | Formula: `total = prod + pack + deliv`; `price = total / (1 − m)`; `profit = price − total`; `monthly = profit × capacity` | ✅ | Demo: 630 → ৳900 → ৳270 → ৳5,400 |
| 2.3 | Display: Total Cost · Recommended Selling Price · Profit/Unit · Profit Margin · Est. Monthly Profit | ✅ | `#/pricing` stat cards |
| 2.4 | Selling-price comparison (৳850 / **৳900 ★** / ৳950) | ✅ | comparison table |
| 2.5 | Validation: no negative costs, margin < 100%, blanks → 0, capacity ≥ 0 | ✅ | server `issues[]` + live form errors |
| 2.6 | Production time **not** costed unless hourly rate given | ✅ | optional "Include my time" field |
| 2.7 | "How we calculated" transparency panel | ✅ | |
| 2.8 | `/api/pricing` returns 422 with issues on invalid input | ✅ | |
| 2.9 | Test suite | ✅ | `npm test` → **46 passed, 0 failed** |

### Member 3 — AI Product + Social Posts ✅
| # | Task | Status | Evidence |
|---|---|---|---|
| 3.1 | Workers-compatible OpenAI client (fetch, JSON mode, timeout) | ✅ | `src/modules/ai.ts` |
| 3.2 | AI Product Builder → Name, Category, short description (+features, customers, keywords) | ✅ | `src/modules/product.ts` |
| 3.3 | No-invention rules (experience, certifications, buyers, revenue, location, achievements, availability) | ✅ | prompt + regex guardrails, tested |
| 3.4 | Product **Edit** (inline form) + **Regenerate** | ✅ | `#/product` |
| 3.5 | AI Facebook caption (name, description, price, capacity) | ✅ | `src/modules/promotion.ts` |
| 3.6 | AI WhatsApp short conversational message | ✅ | |
| 3.7 | **Copy Facebook Post** / **Copy WhatsApp Message** → real clipboard + "Copied!" | ✅ | |
| 3.8 | Per-channel **Regenerate** (other channel preserved) | ✅ | verified |
| 3.9 | Price injected from pricing engine; AI output rejected if price altered/missing | ✅ | `priceIntact()` |
| 3.10 | Loading: "Herizon is preparing your product…" / "Herizon is creating your promotion…" | ✅ | |
| 3.11 | Failure: "Herizon couldn't generate this right now. Please try again." | ✅ | HTTP 502 path tested |
| 3.12 | Template fallback when AI unavailable (app never breaks) | ✅ | `source: 'template'` badge |
| 3.13 | No auto-publishing to social media | ✅ | copy / `wa.me` link only |
| 3.14 | Secrets: `.dev.vars` local, `wrangler pages secret put` prod; `.dev.vars.example` | ✅ | never in browser |

### Member 4 — Opportunity Matching 🟡 (MVP in place, owner TBD)
| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Static catalog (12 BD-relevant programs/platforms/communities) | ✅ | `src/modules/opportunities.ts` |
| 4.2 | Category + keyword scoring with match reason | ✅ | |
| 4.3 | Move catalog to Cloudflare D1 | ⏳ | migration + `matchOpportunities()` unchanged signature |
| 4.4 | Location / district filtering | ⏳ | `StoryInput.location` already exists |
| 4.5 | Verify URLs & add application deadlines | ⏳ | |

---

## 3. API surface

| Method | Path | Purpose | Status |
|---|---|---|---|
| POST | `/api/generate` | Full pipeline → `HerizonResult` | ✅ |
| POST | `/api/product` | Listing; `regenerate:true` = strict AI | ✅ |
| POST | `/api/pricing` | Pure calculator; 422 on invalid | ✅ |
| POST | `/api/promotion` | FB + WA; `channel`, `previous`, edited `product` | ✅ |
| POST | `/api/opportunities` | Matched list | ✅ |
| GET | `/api/demo` | Demo preset | ✅ |
| GET | `/api/health` | `{ ok, ai, model }` | ✅ |

---

## 4. Quality gates

| Check | Result |
|---|---|
| `npm run build` | ✅ passes |
| `npm test` (pricing engine) | ✅ 46 / 46 |
| Browser console on `/`, `/story`, `/product` | ✅ no errors |
| Demo numbers match spec (৳900 / ৳270 / ৳5,400) | ✅ |
| AI guardrail bait test (tailoring description) | ✅ 0 invented claims |
| AI failure path (invalid key) | ✅ spec message, 502 |
| Full pipeline latency with AI | ~5 s |
| Mobile / tablet / desktop layouts | ✅ |

---

## 5. Open items & risks

| Item | Priority | Owner | Notes |
|---|---|---|---|
| Production deploy to Cloudflare Pages | 🔴 High | Team | Decide: Genspark-hosted vs own account; set `OPENAI_API_KEY` secret |
| Custom domain | 🟡 Med | Team | after deploy |
| Opportunities → D1 + real data verification | 🟡 Med | Member 4 | signature is stable |
| Bangla language toggle | 🟡 Med | Member 1 | UI strings are centralised in `app.js` views |
| Tailwind CDN → build step (perf, prod warning) | 🟢 Low | Member 1 | cosmetic |
| Product photo upload (R2) | 🟢 Low | — | out of MVP scope |
| Rate-limit `/api/*` to protect AI spend | 🟡 Med | Member 3 | simple per-IP KV/D1 counter |
| Pitch deck & 3-min demo script | 🔴 High | Team | see §6 |

---

## 6. Demo script (3 minutes)

1. **Landing** (15 s) — show hero photo, tagline, "Tell us what you make."
2. **Try Demo** (10 s) — click; loading messages appear.
3. **Product** (30 s) — AI listing "Homemade Chocolate Cake · Home Bakery / Food". Click **Edit**, change name to "Rina's Chocolate Cake", Save.
4. **Pricing** (45 s) — 630 → ৳900 → ৳270 → ৳5,400; point at comparison table and "How we calculated". Mention: deterministic, no AI.
5. **Promotion** (45 s) — Facebook post now says "Rina's Chocolate Cake" at ৳900. Click **Copy Facebook Post** → "Copied!". Click **Regenerate** on WhatsApp → new text, FB unchanged.
6. **Opportunities** (20 s) — foodpanda Home Chef 91 % match, WE Forum, SME Foundation. Download summary.
7. **Close** (15 s) — "Simple words in, professional business out."

---

## 7. Git log

| Commit | Description |
|---|---|
| `c9b3513` | Member 3: AI Product Builder + AI Promotion, guardrails, edit/regenerate, clipboard feedback |
| `b253ae1` | Member 2: deterministic pricing engine, comparison table, validation, 46 tests |
| `5e10e09` | Rebrand SheLink → Herizon; photo-driven desktop-first landing |
| `4662eac` | Core MVP: landing, story input, product/pricing/promotion/opportunities |
| `5ca5901` | Initial commit |

---

## 8. How to run

```bash
cp .dev.vars.example .dev.vars   # add OPENAI_API_KEY
npm run build
pm2 start ecosystem.config.cjs   # http://localhost:3000
npm test                         # pricing engine tests
```
