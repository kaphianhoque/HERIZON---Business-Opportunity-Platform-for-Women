// ─────────────────────────────────────────────────────────────
// Herizon shared types
// These types are the "contract" between the core app and the
// independently-developed modules (AI product, pricing, promotion,
// opportunities). Keep them stable so teammates can plug in freely.
// ─────────────────────────────────────────────────────────────

/** Raw input collected from the "Tell Us What You Make" form */
export interface StoryInput {
  productName?: string
  description: string
  productionCost: number   // BDT
  packagingCost: number    // BDT
  deliveryCost: number     // BDT
  timeHours: number        // hours per unit
  monthlyCapacity: number  // units per month
  profitMargin: number     // percent, e.g. 30
  location?: string
}

/** Output of the AI Product Generation module */
export interface ProductListing {
  title: string
  tagline: string
  category: string
  description: string
  features: string[]
  targetCustomers: string[]
  keywords: string[]
  suggestedImages: string[]
  source: 'ai' | 'template'
}

/** Output of the Pricing Calculator module */
export interface PricingResult {
  currency: 'BDT'
  costs: {
    production: number
    packaging: number
    delivery: number
    labor: number
    laborRatePerHour: number
    totalCostPerUnit: number
  }
  recommendedPrice: number
  minimumPrice: number
  premiumPrice: number
  profitPerUnit: number
  profitMarginPercent: number
  monthly: {
    capacity: number
    revenue: number
    totalCost: number
    profit: number
  }
  breakEvenUnits: number
  tips: string[]
}

/** Output of the Promotion Generation module */
export interface PromotionContent {
  facebookPost: string
  whatsappMessage: string
  shortCaption: string
  hashtags: string[]
  callToAction: string
  source: 'ai' | 'template'
}

/** Output of the Opportunity Matching module */
export interface Opportunity {
  id: string
  title: string
  organization: string
  type: 'training' | 'grant' | 'market' | 'platform' | 'community' | 'event'
  description: string
  matchReason: string
  matchScore: number  // 0-100
  url?: string
  tags: string[]
}

/** Full response returned by POST /api/generate */
export interface HerizonResult {
  input: StoryInput
  product: ProductListing
  pricing: PricingResult
  promotion: PromotionContent
  opportunities: Opportunity[]
  generatedAt: string
}
