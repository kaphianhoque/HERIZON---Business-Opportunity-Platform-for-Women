# Herizon

**Your Story. Your Skill. Your Market.**

Herizon helps women describe what they make in simple words and turns that into a professional product listing, pricing guidance, promotional content, and relevant business opportunities.

> Hackathon MVP — Member 1 (Core App + Integration). This repo is the main version that other modules plug into.
> Formerly "SheLink" — rebranded to **Herizon** (brand name only; all modules, logic and routes unchanged).

## URLs
- **Sandbox preview**: https://3000-ifno47fr4b792rj0hsp79-5185f4aa.sandbox.novita.ai
- **Production**: _not deployed yet_ (Cloudflare Pages ready — `npm run deploy`)
- **API health**: `GET /api/health`

## Completed features
- ✅ Landing page — desktop-first hero (text + real-life photography), **Start Your Story** / **Try Demo**, "Who Herizon is for" photo strip (home baking, tailoring, handicrafts, food production, small local business), 4-step "How it works", community section, final CTA
- ✅ **Tell Us What You Make** — large natural-language input + 6 simple numeric fields
- ✅ **Product Result** — title, tagline, category, description, features, target customers, keywords, photo suggestions, copy-to-clipboard
- ✅ **Pricing & Profit** (Member 2 — deterministic engine, no AI) — Total Cost · Recommended Selling Price · Profit Per Unit · Profit Margin · Estimated Monthly Profit; selling-price comparison table (−৳50 / recommended ★ / +৳50); "How we calculated" step-by-step; cost breakdown; validation (no negatives, margin < 100%, blanks → 0, capacity ≥ 0); optional hourly labor rate — time is **never** costed unless the user provides a rate
- ✅ **Promotion** — Facebook post, WhatsApp message (with `wa.me` share link), short caption, hashtags, CTA — all copyable
- ✅ **Opportunities** — matched programs/platforms/communities with match score & reason
- ✅ **Try Demo** preset (Homemade Chocolate Cake, 500/50/80 BDT, 3 h, 20/month, 30%)
- ✅ Download plain-text summary
- ✅ Responsive, mobile-first UI; step nav; state persisted in `sessionStorage`
- ✅ Empty-state guard when visiting result pages before generating

Explicitly **not** built (per brief): payments, checkout, login, admin, chat, order tracking.

## Architecture — how modules plug in

```
src/
├── index.tsx              # Hono router: API endpoints + serves SPA shell
├── page.ts                # HTML shell (Tailwind CDN + component classes)
├── types.ts               # 🔒 Shared contract types (StoryInput, ProductListing, PricingResult, PromotionContent, Opportunity)
├── demo.ts                # "Try Demo" preset
└── modules/               # 🔌 Independently replaceable modules
    ├── product.ts         # generateProduct(input)                    → ProductListing   (AI product generation)
    ├── pricing.ts         # calculatePricing(input)                   → PricingResult    (pricing calculator)
    ├── promotion.ts       # generatePromotion(input, product, pricing)→ PromotionContent (FB/WhatsApp)
    └── opportunities.ts   # matchOpportunities(input, product)        → Opportunity[]    (opportunity matching)
public/static/
├── app.js                 # Frontend SPA: state · api · components (C.*) · views · hash router
├── style.css              # Animations / helpers
├── favicon.svg
└── img/                   # Landing-page photography (baking, tailoring, handicrafts, food, shop)
```

**Integration rule for teammates:** keep each module's exported function signature and return type (`src/types.ts`) unchanged. Replace the internals (e.g. call OpenAI / Workers AI, query D1) and the UI works with zero changes. Each module also has its own endpoint for isolated testing.

Current implementations are rule/template based so the app is fully functional offline; `source: 'template'` fields flip to `'ai'` when real AI is wired in.

## API

| Method | Path                  | Body        | Returns                                  |
|--------|-----------------------|-------------|------------------------------------------|
| POST   | `/api/generate`       | `StoryInput`| `HerizonResult` (all 4 modules)          |
| POST   | `/api/product`        | `StoryInput`| `ProductListing`                         |
| POST   | `/api/pricing`        | numeric fields only (description optional) | `PricingResult` — 200 valid / 422 with `issues[]` |
| POST   | `/api/promotion`      | `StoryInput`| `PromotionContent`                       |
| POST   | `/api/opportunities`  | `StoryInput`| `Opportunity[]`                          |
| GET    | `/api/demo`           | —           | demo `StoryInput`                        |
| GET    | `/api/health`         | —           | `{ ok, app, time }`                      |

`StoryInput` fields: `description` (required, ≥5 chars), `productName?`, `productionCost`, `packagingCost`, `deliveryCost`, `timeHours`, `monthlyCapacity`, `profitMargin` (% of selling price, < 100), `hourlyLaborRate?` (BDT/h — only when given is time costed), `location?`.

Example:
```bash
curl -X POST http://localhost:3000/api/generate -H 'Content-Type: application/json' \
  -d '{"productName":"Homemade Chocolate Cake","description":"I make homemade chocolate cakes for birthdays and small events.","productionCost":500,"packagingCost":50,"deliveryCost":80,"timeHours":3,"monthlyCapacity":20,"profitMargin":30}'
```

## Frontend routes (hash router)
`#/` landing · `#/story` input · `#/product` · `#/pricing` · `#/promotion` · `#/opportunities`

## Data architecture
- **Storage**: none required for MVP — results are computed per request; the browser keeps the current session in `sessionStorage`.
- **Pricing model** (`src/modules/pricing.ts`, margin = % of *selling price*):
  ```
  totalCost     = production + packaging + delivery (+ timeHours × hourlyLaborRate ONLY if a rate is given)
  sellingPrice  = totalCost / (1 − margin)
  profitPerUnit = sellingPrice − totalCost
  monthlyProfit = profitPerUnit × monthlyCapacity
  ```
  Demo: 500 + 50 + 80 = 630 → 630 / 0.70 = **৳900** → ৳270/unit → ৳5,400/month. Comparison: ৳850 → ৳220 → ৳4,400 · **৳900 → ৳270 → ৳5,400** · ৳950 → ৳320 → ৳6,400.
  Values rounded to 2 dp; capacity floored to whole units. Invalid input returns `valid: false` + `issues[]` (HTTP 422 on `/api/pricing`).
- **Opportunity catalog**: static list in `modules/opportunities.ts` (easy to move to D1).

## User guide
1. Open the app → **Start Your Story** (or **Try Demo** to see everything instantly).
2. Describe what you make and enter rough costs → **Build My Product**.
3. Walk through Product → Pricing → Promotion → Opportunities using the step nav.
4. Copy any text with the **Copy** buttons, share on WhatsApp, or **Download summary**.

## Development
```bash
npm test                         # 46 deterministic pricing-engine tests (tests/pricing.test.ts)
npm run build                    # vite build → dist/
pm2 start ecosystem.config.cjs   # wrangler pages dev on :3000
pm2 logs webapp --nostream
```

## Deployment
- **Platform**: Cloudflare Pages (`wrangler.jsonc`, `pages_build_output_dir: ./dist`)
- **Status**: ⏳ Sandbox running; production deploy pending
- **Tech stack**: Hono + TypeScript · Vanilla JS SPA · Tailwind CSS (CDN) · Playfair Display + Inter · Font Awesome · Axios
- **Visual direction**: warm terracotta/plum palette, documentary-style photography of middle-aged & older women entrepreneurs; desktop web first (`max-w-7xl` landing, `max-w-6xl` inner pages), fully responsive to tablet/phone
- **Imagery**: original generated photos stored in `public/static/img/` (license-safe; CC search returned mostly archival/off-topic results)
- **Last updated**: 2026-09-25

## Next steps
- Member 2: swap `modules/product.ts` + `modules/promotion.ts` internals for LLM calls (add `OPENAI_API_KEY` via `.dev.vars` / `wrangler secret`).
- Member 4: move opportunity catalog to D1 + add location filtering.
- Bangla language toggle; image upload for product photos; PDF export.
