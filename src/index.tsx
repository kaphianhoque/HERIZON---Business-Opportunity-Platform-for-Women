import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { StoryInput, HerizonResult, ProductListing } from './types'
import { generateProduct } from './modules/product'
import { calculatePricing } from './modules/pricing'
import { generatePromotion, type PromoChannel } from './modules/promotion'
import { matchOpportunities } from './modules/opportunities'
import { AiError, aiAvailable, type AiEnv } from './modules/ai'
import { DEMO_INPUT } from './demo'
import { renderPage } from './page'

type Bindings = AiEnv & {
  // Add more bindings here (e.g. DB: D1Database)
}

/** User-facing message for any AI failure (spec wording). */
const AI_FAIL_MSG = "Herizon couldn't generate this right now. Please try again."

/** Accept a (possibly user-edited) product listing from the client; fall back to a fresh one if malformed. */
function sanitizeProduct(p: any): ProductListing | null {
  if (!p || typeof p !== 'object') return null
  const str = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => str(x, 100)).filter(Boolean).slice(0, max) : [])
  const title = str(p.title, 80)
  const description = str(p.description, 600)
  if (!title || !description) return null
  return {
    title,
    tagline: str(p.tagline, 120),
    category: str(p.category, 80) || 'Handmade Products',
    description,
    features: list(p.features, 6),
    targetCustomers: list(p.targetCustomers, 6),
    keywords: list(p.keywords, 10).map((k) => k.toLowerCase()),
    suggestedImages: list(p.suggestedImages, 6),
    source: p.source === 'ai' ? 'ai' : 'template',
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ── Helpers ──────────────────────────────────────────────────
/** Blank / invalid → fallback; keeps negatives so the pricing engine can report them. */
function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string' && v.trim() === '') return fallback
  const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseInput(body: any): StoryInput | { error: string } {
  const description = String(body?.description ?? '').trim()
  if (description.length < 5) return { error: 'Please describe your product or skill (at least 5 characters).' }
  const rate = num(body?.hourlyLaborRate, NaN)
  return {
    productName: body?.productName ? String(body.productName).trim() : undefined,
    description,
    productionCost: num(body?.productionCost),
    packagingCost: num(body?.packagingCost),
    deliveryCost: num(body?.deliveryCost),
    timeHours: num(body?.timeHours),
    monthlyCapacity: num(body?.monthlyCapacity, 0),
    profitMargin: num(body?.profitMargin, 30),
    hourlyLaborRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    location: body?.location ? String(body.location) : undefined,
  }
}

// ── API: full pipeline ───────────────────────────────────────
app.post('/api/generate', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => ({})))
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)

  const product = await generateProduct(parsed, c.env)
  const pricing = calculatePricing(parsed)
  const [promotion, opportunities] = await Promise.all([
    generatePromotion(parsed, product, pricing, c.env),
    matchOpportunities(parsed, product),
  ])

  const result: HerizonResult = {
    input: parsed,
    product,
    pricing,
    promotion,
    opportunities,
    generatedAt: new Date().toISOString(),
  }
  return c.json(result)
})

// ── API: individual module endpoints (for independent integration/testing) ──
/** Product listing — `regenerate: true` forces a fresh AI variation (strict: errors surface instead of template). */
app.post('/api/product', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = parseInput(body)
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  const regenerate = Boolean(body?.regenerate)
  try {
    const product = await generateProduct(parsed, c.env, {
      seed: regenerate ? Number(body?.seed) || Date.now() % 1000 : undefined,
      strict: regenerate && aiAvailable(c.env),
    })
    return c.json(product)
  } catch (e) {
    return c.json({ error: AI_FAIL_MSG, detail: e instanceof AiError ? e.message : 'unknown' }, 502)
  }
})

/** Pure calculator — description not required. Returns 422 with `issues` when input is invalid. */
app.post('/api/pricing', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const result = calculatePricing(body)
  return c.json(result, result.valid ? 200 : 422)
})

/**
 * Promotion — accepts the user's (edited) `product` and the pricing input.
 * `channel: 'facebook' | 'whatsapp'` + `previous` regenerates one channel only.
 * Price always comes from the deterministic pricing engine, never from the AI.
 */
app.post('/api/promotion', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = parseInput(body)
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  const regenerate = Boolean(body?.regenerate)
  const channel: PromoChannel | undefined = body?.channel === 'facebook' || body?.channel === 'whatsapp' ? body.channel : undefined
  try {
    const product = sanitizeProduct(body?.product) ?? (await generateProduct(parsed, c.env))
    const pricing = calculatePricing(parsed)
    const promotion = await generatePromotion(parsed, product, pricing, c.env, {
      seed: regenerate ? Number(body?.seed) || Date.now() % 1000 : undefined,
      strict: regenerate && aiAvailable(c.env),
      channel,
      previous: body?.previous && typeof body.previous === 'object' ? body.previous : undefined,
    })
    return c.json(promotion)
  } catch (e) {
    return c.json({ error: AI_FAIL_MSG, detail: e instanceof AiError ? e.message : 'unknown' }, 502)
  }
})

app.post('/api/opportunities', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => ({})))
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  const product = await generateProduct(parsed)
  return c.json(await matchOpportunities(parsed, product))
})

app.get('/api/demo', (c) => c.json(DEMO_INPUT))
app.get('/api/health', (c) => c.json({ ok: true, app: 'Herizon', ai: aiAvailable(c.env), model: c.env?.OPENAI_MODEL || null, time: new Date().toISOString() }))

// ── Frontend (SPA) ───────────────────────────────────────────
app.get('/', (c) => c.html(renderPage()))

export default app
