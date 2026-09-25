import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { StoryInput, HerizonResult } from './types'
import { generateProduct } from './modules/product'
import { calculatePricing } from './modules/pricing'
import { generatePromotion } from './modules/promotion'
import { matchOpportunities } from './modules/opportunities'
import { DEMO_INPUT } from './demo'
import { renderPage } from './page'

type Bindings = {
  // Teammates can add bindings here (e.g. AI: Ai, DB: D1Database, OPENAI_API_KEY: string)
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

  const product = await generateProduct(parsed)
  const pricing = calculatePricing(parsed)
  const [promotion, opportunities] = await Promise.all([
    generatePromotion(parsed, product, pricing),
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
app.post('/api/product', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => ({})))
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  return c.json(await generateProduct(parsed))
})

/** Pure calculator — description not required. Returns 422 with `issues` when input is invalid. */
app.post('/api/pricing', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const result = calculatePricing(body)
  return c.json(result, result.valid ? 200 : 422)
})

app.post('/api/promotion', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => ({})))
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  const product = await generateProduct(parsed)
  const pricing = calculatePricing(parsed)
  return c.json(await generatePromotion(parsed, product, pricing))
})

app.post('/api/opportunities', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => ({})))
  if ('error' in parsed) return c.json({ error: parsed.error }, 400)
  const product = await generateProduct(parsed)
  return c.json(await matchOpportunities(parsed, product))
})

app.get('/api/demo', (c) => c.json(DEMO_INPUT))
app.get('/api/health', (c) => c.json({ ok: true, app: 'Herizon', time: new Date().toISOString() }))

// ── Frontend (SPA) ───────────────────────────────────────────
app.get('/', (c) => c.html(renderPage()))

export default app
