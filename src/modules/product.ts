// ─────────────────────────────────────────────────────────────
// MODULE: AI Product Generation
// Owner: (teammate) — replace `generateProduct` internals with a real
// LLM call (OpenAI / Workers AI). Keep the function signature identical.
// Current implementation: rule-based template generator (works offline).
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing } from '../types'

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

export async function generateProduct(input: StoryInput): Promise<ProductListing> {
  const rule = detectCategory(input.description + ' ' + (input.productName ?? ''))
  const name = input.productName?.trim() || guessProductName(input.description)
  const cleanDesc = input.description.trim().replace(/^i\s+/i, 'I ')

  return {
    title: name,
    tagline: `${rule.category === 'Services & Skills' ? 'Trusted' : 'Handcrafted'} ${name.toLowerCase()} made with love`,
    category: rule.category,
    description:
      `${cleanDesc.endsWith('.') ? cleanDesc : cleanDesc + '.'} Every piece is prepared with care and attention to detail, ` +
      `so you receive something truly personal. Made in small batches to guarantee freshness and quality — ` +
      `perfect for gifting, celebrating, or treating yourself. Order in advance to reserve your spot (capacity: ${input.monthlyCapacity} per month).`,
    features: rule.features,
    targetCustomers: rule.customers,
    keywords: extractKeywords(input.description, rule),
    suggestedImages: rule.images,
    source: 'template',
  }
}
