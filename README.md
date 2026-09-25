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
- ✅ **AI Product Builder** (Member 3) — LLM generates Product Name, Category (e.g. *Home Bakery / Food*), short professional description, features, target customers, keywords from the plain-language story. Strict **no-invention** rules (no experience, certifications, buyers, revenue, location, achievements, availability) enforced by prompt **and** post-generation regex guardrails. **Edit** (inline form) and **Regenerate** buttons; "AI generated / Template" badge; loading state *“Herizon is preparing your product…”*
- ✅ **Pricing & Profit** (Member 2 — deterministic engine, no AI) — Total Cost · Recommended Selling Price · Profit Per Unit · Profit Margin · Estimated Monthly Profit; selling-price comparison table (−৳50 / recommended ★ / +৳50); "How we calculated" step-by-step; cost breakdown; validation (no negatives, margin < 100%, blanks → 0, capacity ≥ 0); optional hourly labor rate — time is **never** costed unless the user provides a rate
- ✅ **AI Promotion** (Member 3) — Facebook caption (60–110 words, ≤4 emoji, hashtags) + shorter conversational WhatsApp message, built from the (edited) product, the **exact** deterministic selling price and monthly capacity. Per-channel **Regenerate**, **Copy Facebook Post** / **Copy WhatsApp Message** with real clipboard write + *Copied!* feedback, `wa.me` open link. Nothing is auto-published. Loading *“Herizon is creating your promotion…”*; failure *“Herizon couldn't generate this right now. Please try again.”*
- ✅ **Opportunity Matching** (Member 4 — hackathon-safe) — 10 **DEMO** opportunities across 7 types (Buyer, Supplier opportunity, Mentor, Women entrepreneur network, Workshop, Business community, Market opportunity). Simple point-based matching on product category, business type, user goal, capacity and region → **top 3**, each with Opportunity name · Type · description · *Why this matches you*. Every card is labelled **DEMO OPPORTUNITY** + page-level disclaimer; no fake organisations presented as real
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

**AI configuration** (`src/modules/ai.ts`, fetch-based, Workers-compatible): set `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`) in `.dev.vars` locally or via `wrangler pages secret put` in production — see `.dev.vars.example`. Keys never reach the browser. Without a key the product and promotion modules fall back to deterministic templates (`source: 'template'`), so the app always works. Pricing and opportunity matching never use AI.

**AI guardrails**: both prompts share `NO_INVENTION_RULES`; outputs are sanitised, length-capped and regex-checked for invented claims (years of experience, certifications, "hundreds of customers", city names, same-day delivery, fake urgency…). Promotion text must contain the exact price and no other amount, or it's discarded (one automatic retry, then template).

## API

| Method | Path                  | Body        | Returns                                  |
|--------|-----------------------|-------------|------------------------------------------|
| POST   | `/api/generate`       | `StoryInput`| `HerizonResult` (all 4 modules)          |
| POST   | `/api/product`        | `StoryInput` + `regenerate?: true`, `seed?` | `ProductListing` — 502 `{error}` on AI failure when regenerating |
| POST   | `/api/pricing`        | numeric fields only (description optional) | `PricingResult` — 200 valid / 422 with `issues[]` |
| POST   | `/api/promotion`      | `StoryInput` + `product?` (edited listing), `channel?: 'facebook'\|'whatsapp'`, `previous?`, `regenerate?`, `seed?` | `PromotionContent` — 502 `{error}` on AI failure when regenerating |
| POST   | `/api/opportunities`  | `StoryInput` (+ `businessGoal?`, `location?`, edited `product?`) | top-3 `Opportunity[]` (all `demo: true`) |
| GET    | `/api/demo`           | —           | demo `StoryInput`                        |
| GET    | `/api/health`         | —           | `{ ok, app, ai, model, time }`           |

`StoryInput` fields: `description` (required, ≥5 chars), `productName?`, `productionCost`, `packagingCost`, `deliveryCost`, `timeHours`, `monthlyCapacity`, `profitMargin` (% of selling price, < 100), `hourlyLaborRate?` (BDT/h — only when given is time costed), `location?` (region), `businessGoal?` (`find_buyers` \| `sell_online` \| `find_suppliers` \| `learn_skills` \| `get_mentor` \| `grow_network`).

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
- **Opportunity catalog**: `DEMO_OPPORTUNITIES` in `modules/opportunities.ts` — fields: title, type, category, description, productCategories, region?, businessGoals, minCapacity?, `demo: true`. Easy to move to D1 later.
- **Matching rule** (readable, no ML): category +40 (or +20 if open to all) · type keyword +20 · stated goal +30 · capacity met +10 / not met −15 · same region +5 / different −10 → top 3.

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
- **AI**: OpenAI-compatible chat completions (`gpt-5-mini`, `reasoning_effort: minimal`, JSON mode) via server-side fetch; ~5 s full pipeline
- **Tech stack**: Hono + TypeScript · Vanilla JS SPA · Tailwind CSS (CDN) · Font Awesome · Axios
- **Visual system**: soft gradient background (warm ivory → dusty rose → light mauve, with a faint paper grain); dusty-rose primary + muted-mauve secondary + warm ink neutrals; near-black pill CTAs; frosted white cards with soft shadows
- **Typography**: **Schibsted Grotesk** (Grotesk sans) for UI/body/headings; **Instrument Serif italic** for accent words (closest open alternative to PP Editorial New — swap the font-face if you license it)
- **Imagery**: photos are loaded by role from `public/static/img/` (`hero.jpg`, `story-1…5.jpg`, `community.jpg`) — drop in the team's real photos with those filenames, see `public/static/img/README.md`. Current files are placeholders awaiting the uploaded photos.
- **Layout**: desktop web first (`max-w-7xl` landing, `max-w-6xl` inner pages), fully responsive to tablet/phone
- **Last updated**: 2026-09-25

## Next steps
- Member 4: replace DEMO catalog with verified real opportunities in D1 (keep `demo:false` only for confirmed entries).
- Bangla language toggle; image upload for product photos; PDF export.
