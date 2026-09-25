// ─────────────────────────────────────────────────────────────
// MODULE: Opportunity Matching
// Owner: (teammate) — replace the static catalog with a D1 table or
// external API; replace scoring with embeddings if desired.
// Keep the function signature identical.
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing, Opportunity } from '../types'

type CatalogItem = Omit<Opportunity, 'matchReason' | 'matchScore'> & { categories: string[]; keywords: string[] }

/** Static catalog of real-world style opportunities relevant to women entrepreneurs in Bangladesh */
const CATALOG: CatalogItem[] = [
  {
    id: 'ws-shop',
    title: 'WE (Women & e-Commerce) Forum – Sell in the Community',
    organization: 'WE Forum Bangladesh',
    type: 'community',
    description: 'A 1M+ member Facebook community where women entrepreneurs post and sell products directly.',
    url: 'https://www.facebook.com/groups/webangladesh',
    tags: ['Facebook', 'Community', 'Free'],
    categories: ['*'],
    keywords: ['online', 'facebook', 'sell'],
  },
  {
    id: 'sme-foundation',
    title: 'SME Foundation Women Entrepreneur Training',
    organization: 'SME Foundation Bangladesh',
    type: 'training',
    description: 'Free business management, marketing and bookkeeping training for women-led small enterprises.',
    url: 'https://smef.gov.bd',
    tags: ['Training', 'Free', 'Government'],
    categories: ['*'],
    keywords: ['business', 'training'],
  },
  {
    id: 'daraz-seller',
    title: 'Daraz Seller Program',
    organization: 'Daraz Bangladesh',
    type: 'platform',
    description: 'List your products on the largest e-commerce marketplace in Bangladesh. Simple onboarding for small sellers.',
    url: 'https://sellercenter.daraz.com.bd',
    tags: ['E-commerce', 'Nationwide'],
    categories: ['Handicrafts & Home Decor', 'Clothing & Fashion', 'Beauty & Personal Care', 'Handmade Products'],
    keywords: ['product', 'ship'],
  },
  {
    id: 'foodpanda-home-chef',
    title: 'foodpanda Home Chef Program',
    organization: 'foodpanda Bangladesh',
    type: 'platform',
    description: 'Register as a home-based food seller and deliver to customers in your city via the foodpanda app.',
    url: 'https://www.foodpanda.com.bd',
    tags: ['Food', 'Delivery', 'Home Chef'],
    categories: ['Food & Baked Goods'],
    keywords: ['cake', 'food', 'bake', 'cook'],
  },
  {
    id: 'aarong-artisan',
    title: 'Aarong / BRAC Artisan Network',
    organization: 'BRAC Aarong',
    type: 'market',
    description: 'Supply handcrafted goods to Aarong retail outlets through the Ayesha Abed Foundation artisan network.',
    url: 'https://www.aarong.com',
    tags: ['Retail', 'Artisans', 'Fair Trade'],
    categories: ['Handicrafts & Home Decor', 'Clothing & Fashion'],
    keywords: ['handmade', 'craft', 'nakshi', 'jute'],
  },
  {
    id: 'bwcci',
    title: 'BWCCI Membership & Trade Fairs',
    organization: 'Bangladesh Women Chamber of Commerce & Industry',
    type: 'event',
    description: 'Join trade fairs and networking events for women entrepreneurs; access SME loan facilitation.',
    url: 'https://bwcci-bd.org',
    tags: ['Trade Fair', 'Networking', 'Loans'],
    categories: ['*'],
    keywords: ['event', 'fair'],
  },
  {
    id: 'bb-women-loan',
    title: 'Bangladesh Bank Women Entrepreneur Refinance Scheme',
    organization: 'Bangladesh Bank',
    type: 'grant',
    description: 'Low-interest collateral-free loans for women-owned small businesses through partner banks.',
    url: 'https://www.bb.org.bd',
    tags: ['Loan', 'Low Interest', 'Government'],
    categories: ['*'],
    keywords: ['capital', 'expand', 'grow'],
  },
  {
    id: 'bideshi-foods',
    title: 'Cake & Bakers Community Bangladesh',
    organization: 'Facebook Community',
    type: 'community',
    description: 'A community of home bakers sharing orders, recipes, and bulk ingredient sourcing tips.',
    tags: ['Baking', 'Community'],
    categories: ['Food & Baked Goods'],
    keywords: ['cake', 'bake', 'pastry', 'cookie'],
  },
  {
    id: 'ictd-she-power',
    title: 'Her Power Project – Digital Skills for Women',
    organization: 'ICT Division, Govt. of Bangladesh',
    type: 'training',
    description: 'Free digital marketing, e-commerce and freelancing training for women in 130 upazilas.',
    url: 'https://ictd.gov.bd',
    tags: ['Digital', 'Free', 'Government'],
    categories: ['*'],
    keywords: ['online', 'digital', 'freelance', 'service'],
  },
  {
    id: 'upwork-fiverr',
    title: 'Freelance Marketplaces (Fiverr / Upwork)',
    organization: 'Fiverr, Upwork',
    type: 'platform',
    description: 'Offer your service skills to international clients and earn in USD.',
    url: 'https://www.fiverr.com',
    tags: ['Freelance', 'International'],
    categories: ['Services & Skills'],
    keywords: ['design', 'teach', 'service', 'freelance'],
  },
  {
    id: 'shopup',
    title: 'ShopUp – Facebook Shop Financing',
    organization: 'ShopUp',
    type: 'grant',
    description: 'Working-capital financing and logistics support for small Facebook-based sellers.',
    url: 'https://shopup.org',
    tags: ['Financing', 'Logistics', 'F-commerce'],
    categories: ['*'],
    keywords: ['facebook', 'online'],
  },
  {
    id: 'skin-care-fair',
    title: 'Organic & Herbal Products Fair',
    organization: 'Dhaka Chamber',
    type: 'event',
    description: 'Annual exhibition for organic, herbal and handmade personal care products.',
    tags: ['Exhibition', 'Organic'],
    categories: ['Beauty & Personal Care'],
    keywords: ['soap', 'herbal', 'organic', 'skin'],
  },
]

export async function matchOpportunities(input: StoryInput, product: ProductListing, limit = 6): Promise<Opportunity[]> {
  const text = (input.description + ' ' + product.keywords.join(' ')).toLowerCase()

  const scored = CATALOG.map((item) => {
    let score = 40
    const reasons: string[] = []

    if (item.categories.includes(product.category)) {
      score += 35
      reasons.push(`Matches your category (${product.category})`)
    } else if (item.categories.includes('*')) {
      score += 15
      reasons.push('Open to all women entrepreneurs')
    } else {
      score -= 30
    }

    const hits = item.keywords.filter((k) => text.includes(k))
    if (hits.length) {
      score += Math.min(20, hits.length * 8)
      reasons.push(`Relevant to "${hits[0]}"`)
    }

    if (item.type === 'grant' && input.monthlyCapacity >= 15) {
      score += 5
      reasons.push('You have capacity to scale')
    }
    if (item.type === 'training' && input.profitMargin < 25) {
      score += 5
      reasons.push('Could help improve your margins')
    }

    const { categories, keywords, ...rest } = item
    return {
      ...rest,
      matchScore: Math.max(0, Math.min(100, score)),
      matchReason: reasons.join(' · ') || 'General opportunity',
    } as Opportunity
  })

  return scored
    .filter((o) => o.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}
