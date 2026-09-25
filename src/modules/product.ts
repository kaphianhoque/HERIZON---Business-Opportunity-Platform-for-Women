// ─────────────────────────────────────────────────────────────
// MODULE: AI Product Builder (Member 3)
// generateProduct(input, env, opts) → ProductListing
//   • With OPENAI_API_KEY: LLM generates name / category / description under
//     strict no-invention rules, then output is sanitised + validated.
//   • Without a key, or on AI failure when `opts.allowFallback` is true:
//     deterministic rule-based template (works fully offline).
//   • With `opts.strict` (used by the Regenerate button) an AI failure throws
//     so the UI can show "Herizon couldn't generate this right now."
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing } from '../types'
import { aiAvailable, chatJson, AiError, NO_INVENTION_RULES, type AiEnv } from './ai'

interface CategoryRule {
  category: string
  keywords: string[]
  features: string[]
  customers: string[]
  images: string[]
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Food & Baked Goods',
    keywords: ['cake', 'bake', 'cookie', 'bread', 'sweet', 'pastry', 'dessert', 'pitha', 'mishti', 'food', 'snack', 'pickle', 'achar', 'cook', 'biryani', 'chocolate'],
    features: ['Made fresh to order', 'Homemade with quality ingredients', 'Customizable flavors and sizes', 'Hygienically prepared'],
    customers: ['Families celebrating birthdays', 'Small event organizers', 'Office & community gatherings', 'Neighbors and local customers'],
    images: ['Close-up of the finished product', 'Product being prepared in your kitchen', 'Product at a celebration/event', 'Packaging ready for delivery'],
  },
  {
    category: 'Handicrafts & Home Decor',
    keywords: ['craft', 'handmade', 'decor', 'jute', 'pottery', 'candle', 'nakshi', 'kantha', 'embroider', 'basket', 'wall', 'art', 'paint', 'ornament'],
    features: ['100% handmade', 'Unique — no two pieces alike', 'Traditional techniques', 'Eco-friendly materials'],
    customers: ['Home decor enthusiasts', 'Gift buyers', 'Tourists and expatriates', 'Boutique shops'],
    images: ['Product in a styled home setting', 'Hands at work making the item', 'Detail shot of texture and craftsmanship', 'Collection of variations'],
  },
  {
    category: 'Clothing & Fashion',
    keywords: ['dress', 'saree', 'sari', 'kurti', 'kameez', 'sew', 'stitch', 'tailor', 'cloth', 'fashion', 'boutique', 'hijab', 'scarf', 'panjabi', 'blouse'],
    features: ['Custom sizing available', 'Handpicked fabrics', 'Attention to finishing detail', 'Made-to-order designs'],
    customers: ['Women aged 20–45', 'Eid & wedding shoppers', 'Working professionals', 'Online fashion buyers'],
    images: ['Model wearing the outfit', 'Flat-lay of fabric and details', 'Before/after tailoring', 'Color and pattern options'],
  },
  {
    category: 'Beauty & Personal Care',
    keywords: ['soap', 'skin', 'cream', 'oil', 'hair', 'beauty', 'mehendi', 'henna', 'makeup', 'parlour', 'salon', 'herbal', 'organic'],
    features: ['Natural ingredients', 'Gentle on skin', 'Small-batch production', 'No harsh chemicals'],
    customers: ['Health-conscious women', 'Gift buyers', 'Brides & event guests', 'Online wellness shoppers'],
    images: ['Product with natural ingredients around it', 'Application/usage shot', 'Packaging and labels', 'Customer results'],
  },
  {
    category: 'Services & Skills',
    keywords: ['teach', 'tutor', 'class', 'lesson', 'service', 'design', 'photography', 'consult', 'coaching', 'training', 'freelance', 'typing', 'translation'],
    features: ['Personalized attention', 'Flexible scheduling', 'Experienced and reliable', 'Affordable packages'],
    customers: ['Students and parents', 'Small businesses', 'Busy professionals', 'Local community members'],
    images: ['You at work with a client', 'Samples of your results', 'Testimonial quote card', 'Schedule/pricing card'],
  },
]

const DEFAULT_RULE: CategoryRule = {
  category: 'Handmade Products',
  keywords: [],
  features: ['Made with care by hand', 'Quality you can trust', 'Made-to-order', 'Supports a local woman entrepreneur'],
  customers: ['Local customers', 'Gift buyers', 'Online shoppers', 'Community members'],
  images: ['Clear photo of the product', 'You making the product', 'Product in use', 'Packaging'],
}

function detectCategory(text: string): CategoryRule {
  const lower = text.toLowerCase()
  let best = DEFAULT_RULE
  let bestScore = 0
  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.filter((k) => lower.includes(k)).length
    if (score > bestScore) {
      bestScore = score
      best = rule
    }
  }
  return best
}

function guessProductName(description: string): string {
  const lower = description.toLowerCase()
  const m = lower.match(/(?:i make|i sell|i create|i bake|i design|i offer|i cook|i stitch|i produce)\s+([a-z\s\-]+?)(?:\s+for|\s+that|\s+which|\s+to|\.|,|$)/)
  if (m && m[1]) {
    return m[1].trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return 'My Handmade Product'
}

function extractKeywords(text: string, category: CategoryRule): string[] {
  const stop = new Set(['i', 'make', 'and', 'for', 'the', 'a', 'an', 'to', 'of', 'in', 'my', 'with', 'small', 'is', 'are', 'it', 'that', 'this', 'from', 'at', 'on'])
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !stop.has(w))
  const unique = Array.from(new Set(words)).slice(0, 6)
  return Array.from(new Set([...unique, 'handmade', 'bangladesh', category.category.split(' ')[0].toLowerCase()]))
}

export function generateProductTemplate(input: StoryInput): ProductListing {
  const rule = detectCategory(input.description + ' ' + (input.productName ?? ''))
  const name = input.productName?.trim() || guessProductName(input.description)
  const cleanDesc = input.description.trim().replace(/^i\s+/i, 'I ')

  return {
    title: name,
    tagline: `${rule.category === 'Services & Skills' ? 'Personal' : 'Handmade'} ${name.toLowerCase()}, prepared to order`,
    category: rule.category,
    description:
      `${cleanDesc.endsWith('.') ? cleanDesc : cleanDesc + '.'} Each order is prepared with care and attention to detail. ` +
      `Suitable for gifting, celebrations, or everyday enjoyment.`,
    features: rule.features,
    targetCustomers: rule.customers,
    keywords: extractKeywords(input.description, rule),
    suggestedImages: rule.images,
    source: 'template',
  }
}

// ── AI path ──────────────────────────────────────────────────

interface AiProductReply {
  productName: string
  category: string
  description: string
  tagline?: string
  features?: string[]
  targetCustomers?: string[]
  keywords?: string[]
}

const PRODUCT_SYSTEM = `You are Herizon's product-listing writer. You help women who run small home-based businesses turn a plain-language description into a short, professional product listing.

${NO_INVENTION_RULES}

Return ONLY a JSON object with these keys:
{
  "productName": "3-6 words, Title Case, no emojis",
  "category": "Broad / Specific, e.g. 'Home Bakery / Food', 'Handicrafts / Home Decor', 'Tailoring / Clothing', 'Beauty / Personal Care', 'Services / Skills'",
  "description": "ONE or TWO sentences, 20-45 words, third person, professional, describing what the product is and what it is suitable for. Base it only on the user's words.",
  "tagline": "Max 10 words, no claims",
  "features": ["3-4 short items grounded in the description or generic to the product type (e.g. 'Prepared to order')"],
  "targetCustomers": ["3-4 short items describing who might buy this, phrased as possibilities not facts"],
  "keywords": ["5-8 lowercase single words or short phrases for search/hashtags"]
}`

/** Words that signal an invented claim; if the model slips one in we fall back to the template description. */
const BANNED_CLAIM_PATTERNS: RegExp[] = [
  /\b\d+\+?\s*(years?|yrs)\b/i,
  /\b(certified|certification|licen[cs]ed|award|award-winning|FSSAI|BSTI|ISO)\b/i,
  /\b(hundreds|thousands|many|countless)\s+(of\s+)?(happy\s+)?(customers|clients|orders|buyers)\b/i,
  /\b(best[- ]selling|top[- ]rated|5[- ]star|five[- ]star|trusted by|loved by)\b/i,
  /\b(same[- ]day|24\/7|next[- ]day|within \d+ (hours|days))\b/i,
  /\b(Dhaka|Chittagong|Chattogram|Sylhet|Khulna|Rajshahi|Bangladesh|nationwide|citywide)\b/i,
  /\b(featured in|as seen on|partnered with)\b/i,
]

function containsInventedClaim(text: string, sourceDescription: string): boolean {
  const src = sourceDescription.toLowerCase()
  return BANNED_CLAIM_PATTERNS.some((re) => {
    const m = text.match(re)
    // allowed only if the user themselves wrote that word
    return m ? !src.includes(m[0].toLowerCase()) : false
  })
}

function cleanLine(s: unknown, max: number): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}
function cleanList(v: unknown, max: number, itemMax = 80): string[] {
  return Array.isArray(v) ? v.map((x) => cleanLine(x, itemMax)).filter(Boolean).slice(0, max) : []
}

export interface GenerateOptions {
  /** bump for "Regenerate" so wording changes */
  seed?: number
  /** if true, AI failure throws instead of falling back (UI shows retry message) */
  strict?: boolean
}

export async function generateProduct(input: StoryInput, env?: AiEnv, opts: GenerateOptions = {}): Promise<ProductListing> {
  const template = generateProductTemplate(input)
  if (!env || !aiAvailable(env)) {
    if (opts.strict) throw new AiError('AI is not configured')
    return template
  }

  try {
    const user =
      `Product/skill description from the maker:\n"""${input.description.trim()}"""\n` +
      (input.productName ? `The maker calls it: "${input.productName.trim()}"\n` : '') +
      `\nWrite the listing JSON now.`

    const ai = await chatJson<AiProductReply>(env, { system: PRODUCT_SYSTEM, user, seed: opts.seed })

    const title = cleanLine(ai.productName, 60) || template.title
    const category = cleanLine(ai.category, 60) || template.category
    let description = cleanLine(ai.description, 400) || template.description
    if (containsInventedClaim(description, input.description)) description = template.description
    let tagline = cleanLine(ai.tagline, 90) || template.tagline
    if (containsInventedClaim(tagline, input.description)) tagline = template.tagline

    const features = cleanList(ai.features, 4).filter((f) => !containsInventedClaim(f, input.description))
    const targetCustomers = cleanList(ai.targetCustomers, 4).filter((f) => !containsInventedClaim(f, input.description))
    const keywords = cleanList(ai.keywords, 8, 30).map((k) => k.toLowerCase())

    return {
      title,
      tagline,
      category,
      description,
      features: features.length >= 2 ? features : template.features,
      targetCustomers: targetCustomers.length >= 2 ? targetCustomers : template.targetCustomers,
      keywords: keywords.length >= 3 ? keywords : template.keywords,
      suggestedImages: template.suggestedImages,
      source: 'ai',
    }
  } catch (e) {
    if (opts.strict) throw e instanceof AiError ? e : new AiError('AI request failed', e)
    return template
  }
}
