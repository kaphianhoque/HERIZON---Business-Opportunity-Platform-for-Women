// ─────────────────────────────────────────────────────────────
// MODULE: Opportunity Matching (Member 4) — hackathon MVP
//
// • 10 DEMO opportunities. Every record has `demo: true` and the UI
//   labels each one "DEMO OPPORTUNITY". None of these buyers, mentors,
//   organisations or programmes are real.
// • Matching is a small, readable point system (no ML, no embeddings):
//     product category match ............ +40
//     business/product type keyword ..... +20
//     maker's stated goal ............... +30
//     capacity requirement met .......... +10  (−15 if not met)
//     region match ...................... +5   (−10 if a different region)
//   Top 3 are returned with a plain-English "why this matches you".
// • Deterministic, no AI. Signature kept stable for the core app.
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing, Opportunity, OpportunityRecord, BusinessGoal } from '../types'

// ── Demo catalog ─────────────────────────────────────────────

/** Product categories used across Herizon (matches product.ts + AI "Broad / Specific" labels) */
const FOOD = 'Food & Baked Goods'
const CRAFT = 'Handicrafts & Home Decor'
const CLOTH = 'Clothing & Fashion'
const BEAUTY = 'Beauty & Personal Care'
const SERVICE = 'Services & Skills'
const ANY = '*'

export const DEMO_OPPORTUNITIES: OpportunityRecord[] = [
  {
    id: 'demo-buyer-bakery',
    title: 'Home Bakery Supplier Opportunity',
    type: 'Buyer',
    category: 'Events & catering',
    description: 'Looking for home-based dessert producers for small events.',
    productCategories: [FOOD],
    region: 'Dhaka',
    businessGoals: ['find_buyers'],
    minCapacity: 10,
    demo: true,
  },
  {
    id: 'demo-buyer-gift-shop',
    title: 'Local Gift Shop Seeking Handmade Items',
    type: 'Buyer',
    category: 'Retail',
    description: 'A small gift shop wants handmade decor, crafts and small textiles to stock on consignment.',
    productCategories: [CRAFT, CLOTH, BEAUTY],
    businessGoals: ['find_buyers'],
    minCapacity: 5,
    demo: true,
  },
  {
    id: 'demo-supplier-packaging',
    title: 'Bulk Packaging Supplier for Small Makers',
    type: 'Supplier opportunity',
    category: 'Packaging & materials',
    description: 'Discounted boxes, labels and food-safe wrapping for makers ordering in small monthly batches.',
    productCategories: [FOOD, BEAUTY, CRAFT],
    businessGoals: ['find_suppliers'],
    demo: true,
  },
  {
    id: 'demo-supplier-fabric',
    title: 'Wholesale Fabric Sourcing Group',
    type: 'Supplier opportunity',
    category: 'Raw materials',
    description: 'Group buying of cotton, muslin and embroidery thread at wholesale prices for home tailors.',
    productCategories: [CLOTH, CRAFT],
    businessGoals: ['find_suppliers'],
    demo: true,
  },
  {
    id: 'demo-mentor-food',
    title: 'Food Business Mentor Session',
    type: 'Mentor',
    category: 'Mentoring',
    description: 'One-to-one guidance on pricing, hygiene and scaling a home kitchen business.',
    productCategories: [FOOD],
    businessGoals: ['get_mentor', 'learn_skills'],
    demo: true,
  },
  {
    id: 'demo-mentor-general',
    title: 'Small Business Mentor Circle',
    type: 'Mentor',
    category: 'Mentoring',
    description: 'Monthly mentor sessions for women starting or growing any home-based business.',
    productCategories: [ANY],
    businessGoals: ['get_mentor'],
    demo: true,
  },
  {
    id: 'demo-network-women',
    title: 'Women Makers Network',
    type: 'Women entrepreneur network',
    category: 'Networking',
    description: 'A peer network where women entrepreneurs share leads, tips and encouragement.',
    productCategories: [ANY],
    businessGoals: ['grow_network', 'find_buyers'],
    demo: true,
  },
  {
    id: 'demo-workshop-social',
    title: 'Selling on Facebook & WhatsApp Workshop',
    type: 'Workshop',
    category: 'Digital skills',
    description: 'A practical half-day workshop on photographing products, writing posts and handling orders online.',
    productCategories: [ANY],
    businessGoals: ['sell_online', 'learn_skills'],
    demo: true,
  },
  {
    id: 'demo-community-artisans',
    title: 'Handmade Artisans Community',
    type: 'Business community',
    category: 'Community',
    description: 'A community of craft and textile makers who co-organise stalls and share suppliers.',
    productCategories: [CRAFT, CLOTH],
    businessGoals: ['grow_network', 'find_suppliers'],
    demo: true,
  },
  {
    id: 'demo-market-weekend',
    title: 'Weekend Homemade Market Stall',
    type: 'Market opportunity',
    category: 'Local market',
    description: 'Rent a low-cost stall at a weekend market for homemade food, crafts and personal-care products.',
    productCategories: [FOOD, CRAFT, BEAUTY],
    region: 'Dhaka',
    businessGoals: ['find_buyers', 'sell_online'],
    minCapacity: 15,
    demo: true,
  },
]

// ── Simple matching ──────────────────────────────────────────

/** Map any category label (ours or AI's "Broad / Specific") to one of our five buckets. */
function normalizeCategory(label: string): string {
  const l = label.toLowerCase()
  if (/bak|food|cake|sweet|snack|pickle|kitchen|cook|dessert/.test(l)) return FOOD
  if (/craft|decor|jute|pottery|candle|art|kantha|basket|handmade/.test(l)) return CRAFT
  if (/cloth|fashion|tailor|sew|saree|kurti|garment|textile|dress/.test(l)) return CLOTH
  if (/beauty|skin|soap|hair|cosmetic|herbal|personal care/.test(l)) return BEAUTY
  if (/service|skill|teach|tutor|design|freelance|consult/.test(l)) return SERVICE
  return label
}

/** Short, human name for the product type used in explanations, e.g. "homemade cake". */
function productPhrase(product: ProductListing): string {
  const t = product.title.toLowerCase().replace(/^(my|our)\s+/, '')
  return t.length > 40 ? t.slice(0, 40) : t
}

const GOAL_LABEL: Record<BusinessGoal, string> = {
  find_buyers: 'find buyers',
  learn_skills: 'learn new skills',
  grow_network: 'grow your network',
  find_suppliers: 'find suppliers',
  sell_online: 'sell online',
  get_mentor: 'get a mentor',
}

const TYPE_KEYWORDS: Record<string, RegExp> = {
  Buyer: /sell|order|customer|buyer|event|gift/,
  'Supplier opportunity': /material|ingredient|fabric|packag|supply|cost/,
  Mentor: /learn|help|advice|grow|start/,
  'Women entrepreneur network': /women|network|community|connect/,
  Workshop: /learn|online|facebook|whatsapp|photo|skill/,
  'Business community': /community|craft|handmade|stall|together/,
  'Market opportunity': /market|stall|fair|sell|local/,
}

function regionMatches(userLoc: string | undefined, region: string | undefined): 'same' | 'different' | 'unknown' {
  if (!userLoc || !region) return 'unknown'
  const u = userLoc.toLowerCase()
  const r = region.toLowerCase()
  return u.includes(r) || r.includes(u) ? 'same' : 'different'
}

interface Scored {
  record: OpportunityRecord
  score: number
  reasons: string[]
}

function scoreOne(record: OpportunityRecord, input: StoryInput, product: ProductListing): Scored {
  const cat = normalizeCategory(product.category)
  const phrase = productPhrase(product)
  const text = `${input.description} ${product.description} ${product.keywords.join(' ')}`.toLowerCase()
  let score = 0
  const reasons: string[] = []

  // 1. product category
  if (record.productCategories.includes(cat)) {
    score += 40
    reasons.push(`your ${phrase} product`)
  } else if (record.productCategories.includes(ANY)) {
    score += 20
    reasons.push('it is open to any type of product')
  } else {
    score -= 30
  }

  // 2. business / product type keywords
  const kw = TYPE_KEYWORDS[record.type]
  if (kw && kw.test(text)) {
    score += 20
  }

  // 3. maker's goal
  if (input.businessGoal && record.businessGoals.includes(input.businessGoal)) {
    score += 30
    reasons.push(`your goal to ${GOAL_LABEL[input.businessGoal]}`)
  }

  // 4. capacity
  if (record.minCapacity) {
    if (input.monthlyCapacity >= record.minCapacity) {
      score += 10
      reasons.push(`your monthly production capacity (${input.monthlyCapacity}/month)`)
    } else {
      score -= 15
    }
  }

  // 5. region
  const r = regionMatches(input.location, record.region)
  if (r === 'same') {
    score += 5
    reasons.push(`your location (${input.location})`)
  } else if (r === 'different') {
    score -= 10
  }

  return { record, score: Math.max(0, Math.min(100, score)), reasons }
}

/** Build a plain-English "why this matches you" sentence from the reasons list. */
function explain(s: Scored): string {
  const { record, reasons } = s
  const list = reasons.slice(0, 3)
  const joined = list.length <= 1 ? list[0] ?? 'your business' : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]
  const first = joined.charAt(0).toUpperCase() + joined.slice(1)
  const verb = list.length > 1 ? 'align' : 'aligns'
  // avoid "supplier opportunity opportunity"
  const noun = /opportunity$/i.test(record.type) ? record.type.toLowerCase() : `${record.type.toLowerCase()} opportunity`
  return `${first} ${verb} with this ${noun}.`
}

export async function matchOpportunities(input: StoryInput, product: ProductListing, limit = 3): Promise<Opportunity[]> {
  const scored = DEMO_OPPORTUNITIES.map((r) => scoreOne(r, input, product))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
    .slice(0, limit)

  return scored.map((s) => ({
    ...s.record,
    matchReason: explain(s),
    matchScore: s.score,
  }))
}
