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
  location?: string        // general region, e.g. "Dhaka" — optional, used only for opportunity matching
  businessGoal?: BusinessGoal // what the maker wants next — optional, used only for opportunity matching
}

/** Simple goals a maker can pick; drives opportunity matching */
export type BusinessGoal = 'find_buyers' | 'learn_skills' | 'grow_network' | 'find_suppliers' | 'sell_online' | 'get_mentor'

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

/** Opportunity types shown to the user */
export type OpportunityType =
  | 'Buyer'
  | 'Supplier opportunity'
  | 'Mentor'
  | 'Women entrepreneur network'
  | 'Workshop'
  | 'Business community'
  | 'Market opportunity'

/** A stored (demo) opportunity — see src/modules/opportunities.ts */
export interface OpportunityRecord {
  id: string
  title: string
  type: OpportunityType
  category: string                 // opportunity's own category label
  description: string
  productCategories: string[]      // which product categories it suits ('*' = any)
  region?: string                  // general region, or undefined = anywhere
  businessGoals: BusinessGoal[]    // which maker goals it serves
  minCapacity?: number             // units/month needed, if relevant
  demo: boolean                    // MUST be true for all sample data
}

/** Output of the Opportunity Matching module: a record + why it matched */
export interface Opportunity extends OpportunityRecord {
  matchReason: string
  matchScore: number  // 0-100, for ordering only
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
