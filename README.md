# SheLink

**Your Story. Your Skill. Your Market.**

SheLink helps women describe what they make in simple words and turns that into a professional product listing, pricing guidance, promotional content, and relevant business opportunities.

> Hackathon MVP — Member 1 (Core App + Integration). This repo is the main version that other modules plug into.

## URLs
- **Sandbox preview**: https://3000-ifno47fr4b792rj0hsp79-5185f4aa.sandbox.novita.ai
- **Production**: _not deployed yet_ (Cloudflare Pages ready — `npm run deploy`)
- **API health**: `GET /api/health`

## Completed features
- ✅ Landing page — tagline, main text, **Start Your Story** / **Try Demo**, 4-step "How it works"
- ✅ **Tell Us What You Make** — large natural-language input + 6 simple numeric fields
- ✅ **Product Result** — title, tagline, category, description, features, target customers, keywords, photo suggestions, copy-to-clipboard
- ✅ **Pricing & Profit** — cost breakdown bar, minimum / recommended / premium price, per-unit + monthly profit, break-even, tips
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
└── favicon.svg
```

**Integration rule for teammates:** keep each module's exported function signature and return type (`src/types.ts`) unchanged. Replace the internals (e.g. call OpenAI / Workers AI, query D1) and the UI works with zero changes. Each module also has its own endpoint for isolated testing.

Current implementations are rule/template based so the app is fully functional offline; `source: 'template'` fields flip to `'ai'` when real AI is wired in.

## API

| Method | Path                  | Body        | Returns                                  |
|--------|-----------------------|-------------|------------------------------------------|
| POST   | `/api/generate`       | `StoryInput`| `SheLinkResult` (all 4 modules)          |
| POST   | `/api/product`        | `StoryInput`| `ProductListing`                         |
| POST   | `/api/pricing`        | `StoryInput`| `PricingResult`                          |
| POST   | `/api/promotion`      | `StoryInput`| `PromotionContent`                       |
| POST   | `/api/opportunities`  | `StoryInput`| `Opportunity[]`                          |
| GET    | `/api/demo`           | —           | demo `StoryInput`                        |
| GET    | `/api/health`         | —           | `{ ok, app, time }`                      |

`StoryInput` fields: `description` (required, ≥5 chars), `productName?`, `productionCost`, `packagingCost`, `deliveryCost`, `timeHours`, `monthlyCapacity`, `profitMargin` (%), `location?`.

Example:
```bash
curl -X POST http://localhost:3000/api/generate -H 'Content-Type: application/json' \
  -d '{"productName":"Homemade Chocolate Cake","description":"I make homemade chocolate cakes for birthdays and small events.","productionCost":500,"packagingCost":50,"deliveryCost":80,"timeHours":3,"monthlyCapacity":20,"profitMargin":30}'
```

## Frontend routes (hash router)
`#/` landing · `#/story` input · `#/product` · `#/pricing` · `#/promotion` · `#/opportunities`

## Data architecture
- **Storage**: none required for MVP — results are computed per request; the browser keeps the current session in `sessionStorage`.
- **Pricing model**: `total = production + packaging + delivery + hours × 60 BDT/hr`; recommended = total × (1 + margin), min = total × 1.1, premium = +20 pts; prices rounded to 5 BDT.
- **Opportunity catalog**: static list in `modules/opportunities.ts` (easy to move to D1).

## User guide
1. Open the app → **Start Your Story** (or **Try Demo** to see everything instantly).
2. Describe what you make and enter rough costs → **Build My Product**.
3. Walk through Product → Pricing → Promotion → Opportunities using the step nav.
4. Copy any text with the **Copy** buttons, share on WhatsApp, or **Download summary**.

## Development
```bash
npm run build                    # vite build → dist/
pm2 start ecosystem.config.cjs   # wrangler pages dev on :3000
pm2 logs webapp --nostream
```

## Deployment
- **Platform**: Cloudflare Pages (`wrangler.jsonc`, `pages_build_output_dir: ./dist`)
- **Status**: ⏳ Sandbox running; production deploy pending
- **Tech stack**: Hono + TypeScript · Vanilla JS SPA · Tailwind CSS (CDN) · Font Awesome · Axios
- **Last updated**: 2026-09-25

## Next steps
- Member 2: swap `modules/product.ts` + `modules/promotion.ts` internals for LLM calls (add `OPENAI_API_KEY` via `.dev.vars` / `wrangler secret`).
- Member 3: enrich `modules/pricing.ts` with market benchmarks.
- Member 4: move opportunity catalog to D1 + add location filtering.
- Bangla language toggle; image upload for product photos; PDF export.
