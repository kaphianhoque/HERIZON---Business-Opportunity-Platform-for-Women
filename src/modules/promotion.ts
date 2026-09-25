// ─────────────────────────────────────────────────────────────
// MODULE: AI Promotion — Facebook + WhatsApp (Member 3)
// generatePromotion(input, product, pricing, env, opts) → PromotionContent
//   • Uses the (possibly user-edited) product listing and the deterministic
//     selling price from the pricing engine. The AI never changes the price.
//   • `opts.channel` lets the UI regenerate ONE channel at a time.
//   • Same no-invention rules as the product builder; template fallback.
//   • Nothing is ever published — text is only returned to the browser.
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing, PricingResult, PromotionContent } from '../types'
import { aiAvailable, chatJson, AiError, NO_INVENTION_RULES, type AiEnv } from './ai'

export type PromoChannel = 'facebook' | 'whatsapp'

export interface PromotionOptions {
  seed?: number
  strict?: boolean
  /** regenerate only one channel; the other is taken from `previous` */
  channel?: PromoChannel
  previous?: Partial<PromotionContent>
}

function toHashtag(word: string): string {
  const w = word.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  return w ? '#' + w : ''
}

function priceLabel(pricing: PricingResult): string {
  return pricing.valid && pricing.recommendedPrice > 0 ? `৳${pricing.recommendedPrice.toLocaleString('en-IN')}` : ''
}

// ── Template fallback ────────────────────────────────────────

export function generatePromotionTemplate(input: StoryInput, product: ProductListing, pricing: PricingResult): PromotionContent {
  const price = priceLabel(pricing)
  const name = product.title
  const hashtags = Array.from(
    new Set([...product.keywords.slice(0, 5).map(toHashtag), '#Herizon', '#WomenEntrepreneurs', '#SupportLocal', '#SmallBusiness'].filter(Boolean)),
  )
  const capacityLine = input.monthlyCapacity > 0 ? `Limited to ${input.monthlyCapacity} orders per month — order early to reserve yours.` : 'Made to order.'
  const cta = 'Message us to place your order or ask a question.'

  const facebookPost =
    `${name}\n\n` +
    `${product.description}\n\n` +
    product.features.slice(0, 3).map((f) => `• ${f}`).join('\n') +
    `\n\n${price ? `Price: ${price}\n` : ''}${capacityLine}\n\n${cta}\n\n${hashtags.join(' ')}`

  const whatsappMessage =
    `Hello! I make ${name.toLowerCase()} — ${product.description.split('. ')[0].replace(/\.$/, '')}.` +
    `${price ? ` Price is ${price}.` : ''} ${input.monthlyCapacity > 0 ? `I take ${input.monthlyCapacity} orders a month, so let me know early if you'd like one.` : 'Made to order.'}` +
    ` Would you like to place an order?`

  return {
    facebookPost,
    whatsappMessage,
    shortCaption: `${name}${price ? ` — ${price}` : ''}. ${product.tagline}. Message to order. ${hashtags.slice(0, 3).join(' ')}`,
    hashtags,
    callToAction: cta,
    source: 'template',
  }
}

// ── AI path ──────────────────────────────────────────────────

interface AiPromoReply {
  facebookPost?: string
  whatsappMessage?: string
  shortCaption?: string
  hashtags?: string[]
  callToAction?: string
}

const PROMO_SYSTEM = `You are Herizon's promotion writer for women running small home-based businesses. You write ready-to-post marketing copy that is honest, warm and professional.

${NO_INVENTION_RULES}

Additional rules:
- Use the EXACT selling price given. Never change, round, discount or add a second price.
- Mention monthly capacity only in the natural form given (e.g. "limited to 20 orders a month"). Do not promise delivery times.
- Write in English. Light, tasteful emoji use is fine on Facebook (max 4). No emoji spam.
- No fake urgency ("only 2 left!"), no fake social proof, no "DM for price" (the price is public).
- Facebook post: 60-110 words, 3-5 short paragraphs or lines, ends with a clear call to action, then a line of 5-7 hashtags (include #Herizon).
- WhatsApp message: 35-60 words, first person, conversational, ONE short paragraph, no hashtags, ends with a friendly question inviting an order. Max 1 emoji.
- shortCaption: max 20 words for Instagram/story, includes the price.

Return ONLY JSON: {"facebookPost": "...", "whatsappMessage": "...", "shortCaption": "...", "hashtags": ["#..."], "callToAction": "..."}`

const BANNED_PROMO_PATTERNS: RegExp[] = [
  /\b\d+\+?\s*(years?|yrs)\b/i,
  /\b(certified|licen[cs]ed|award|award-winning)\b/i,
  /\b(hundreds|thousands|countless)\s+(of\s+)?(happy\s+)?(customers|clients|orders)\b/i,
  /\b(best[- ]selling|top[- ]rated|5[- ]star|five[- ]star|trusted by|loved by)\b/i,
  /\b(same[- ]day|24\/7|next[- ]day|free delivery)\b/i,
  /\b(only \d+ left|selling fast|almost sold out)\b/i,
]

function hasBanned(text: string, src: string): boolean {
  const s = src.toLowerCase()
  return BANNED_PROMO_PATTERNS.some((re) => {
    const m = text.match(re)
    return m ? !s.includes(m[0].toLowerCase()) : false
  })
}

/** The AI must keep the exact price; if it drifts or drops it we discard that channel. */
function priceIntact(text: string, pricing: PricingResult): boolean {
  if (!pricing.valid || pricing.recommendedPrice <= 0) return true
  const p = pricing.recommendedPrice
  const variants = [String(p), p.toLocaleString('en-IN'), p.toLocaleString('en-US'), p.toFixed(0)]
  const hasExact = variants.some((v) => text.includes(v))
  // any other ৳/BDT amount present?
  const amounts = Array.from(text.matchAll(/(?:৳|BDT|Tk\.?)\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?(?:BDT|Tk\b|taka)/gi))
    .map((m) => parseFloat((m[1] || m[2] || '').replace(/,/g, '')))
    .filter((n) => Number.isFinite(n))
  const onlyOurPrice = amounts.every((n) => Math.abs(n - p) < 0.01)
  return hasExact && onlyOurPrice
}

export async function generatePromotion(
  input: StoryInput,
  product: ProductListing,
  pricing: PricingResult,
  env?: AiEnv,
  opts: PromotionOptions = {},
): Promise<PromotionContent> {
  const template = generatePromotionTemplate(input, product, pricing)
  const merge = (fresh: Partial<PromotionContent>, source: 'ai' | 'template'): PromotionContent => {
    const prev = opts.previous ?? {}
    const ch = opts.channel
    return {
      facebookPost: (ch === 'whatsapp' ? prev.facebookPost : fresh.facebookPost) || prev.facebookPost || template.facebookPost,
      whatsappMessage: (ch === 'facebook' ? prev.whatsappMessage : fresh.whatsappMessage) || prev.whatsappMessage || template.whatsappMessage,
      shortCaption: fresh.shortCaption || prev.shortCaption || template.shortCaption,
      hashtags: fresh.hashtags?.length ? fresh.hashtags : prev.hashtags?.length ? prev.hashtags : template.hashtags,
      callToAction: fresh.callToAction || prev.callToAction || template.callToAction,
      source,
    }
  }

  if (!env || !aiAvailable(env)) {
    if (opts.strict) throw new AiError('AI is not configured')
    return merge(template, 'template')
  }

  try {
    const price = priceLabel(pricing)
    const user =
      `Product name: ${product.title}\n` +
      `Category: ${product.category}\n` +
      `Description: ${product.description}\n` +
      `Features: ${product.features.join('; ')}\n` +
      `Selling price: ${price || 'not set — do not mention a price'}\n` +
      `Monthly capacity: ${input.monthlyCapacity > 0 ? `${input.monthlyCapacity} orders per month` : 'not specified — do not mention capacity'}\n` +
      `Maker's own words: """${input.description.trim()}"""\n` +
      (opts.channel ? `\nOnly the ${opts.channel === 'facebook' ? 'facebookPost' : 'whatsappMessage'} needs to be new; still return all keys.` : '') +
      `\nWrite the JSON now.`

    const validate = (ai: AiPromoReply) => {
      const fb = String(ai.facebookPost ?? '').trim()
      const wa = String(ai.whatsappMessage ?? '').trim()
      return {
        ai, fb, wa,
        fbOk: fb.length > 40 && !hasBanned(fb, input.description) && priceIntact(fb, pricing),
        waOk: wa.length > 25 && !hasBanned(wa, input.description) && priceIntact(wa, pricing),
      }
    }
    const needFb = opts.channel !== 'whatsapp'
    const needWa = opts.channel !== 'facebook'

    let v = validate(await chatJson<AiPromoReply>(env, { system: PROMO_SYSTEM, user, seed: opts.seed }))
    // One automatic retry if a required channel failed the guardrails (model occasionally drifts).
    if ((needFb && !v.fbOk) || (needWa && !v.waOk)) {
      const retry = validate(await chatJson<AiPromoReply>(env, { system: PROMO_SYSTEM, user, seed: (opts.seed ?? 0) + 101 }))
      v = {
        ai: { ...v.ai, ...retry.ai },
        fb: v.fbOk ? v.fb : retry.fb,
        wa: v.waOk ? v.wa : retry.wa,
        fbOk: v.fbOk || retry.fbOk,
        waOk: v.waOk || retry.waOk,
      }
    }
    const { ai, fb, wa, fbOk, waOk } = v

    const hashtags = Array.isArray(ai.hashtags)
      ? Array.from(new Set(ai.hashtags.map((h) => toHashtag(String(h).replace(/^#/, ''))).filter(Boolean).concat('#Herizon'))).slice(0, 8)
      : template.hashtags

    // if the requested channel failed validation and we're strict, surface an error
    if (opts.strict && ((opts.channel === 'facebook' && !fbOk) || (opts.channel === 'whatsapp' && !waOk) || (!opts.channel && !fbOk && !waOk))) {
      throw new AiError('AI output failed validation')
    }

    return merge(
      {
        facebookPost: fbOk ? fb : template.facebookPost,
        whatsappMessage: waOk ? wa : template.whatsappMessage,
        shortCaption: String(ai.shortCaption ?? '').trim() || template.shortCaption,
        hashtags,
        callToAction: String(ai.callToAction ?? '').trim() || template.callToAction,
      },
      'ai',
    )
  } catch (e) {
    if (opts.strict) throw e instanceof AiError ? e : new AiError('AI request failed', e)
    return merge(template, 'template')
  }
}
