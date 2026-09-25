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
  timeHours: number        // hours per unit (informational unless hourlyLaborRate is given)
  monthlyCapacity: number  // units per month
  profitMargin: number     // percent of SELLING PRICE, e.g. 30
  hourlyLaborRate?: number // BDT/hour — OPTIONAL; only when explicitly provided is time costed
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

/** One row of the selling-price comparison table */
export interface PriceScenario {
  price: number
  profitPerUnit: number
  marginPercent: number       // profit / price × 100
  monthlyProfit: number
  recommended: boolean
}

/** A single validation problem found in the pricing input */
export interface PricingIssue {
  field: 'productionCost' | 'packagingCost' | 'deliveryCost' | 'monthlyCapacity' | 'profitMargin' | 'timeHours' | 'hourlyLaborRate' | 'general'
  message: string
}

/** Output of the Pricing Calculator module (deterministic, no AI) */
export interface PricingResult {
  currency: 'BDT'
  valid: boolean
  issues: PricingIssue[]
  costs: {
    production: number
    packaging: number
    delivery: number
    labor: number              // 0 unless hourlyLaborRate supplied
    laborIncluded: boolean
    timeHours: number          // informational
    hourlyLaborRate: number | null
    totalCostPerUnit: number
  }
  targetMarginPercent: number  // what the user asked for (% of selling price)
  recommendedPrice: number     // totalCost / (1 - margin)
  profitPerUnit: number        // price - totalCost
  profitMarginPercent: number  // achieved margin (% of selling price)
  markupPercent: number        // profit / cost × 100 (shown for clarity)
  monthly: {
    capacity: number
    revenue: number
    totalCost: number
    profit: number
  }
  comparison: PriceScenario[]
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
