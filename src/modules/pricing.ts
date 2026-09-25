// ─────────────────────────────────────────────────────────────
// MODULE: Pricing Calculator
// Owner: (teammate) — pure function, deterministic. Extend freely
// (e.g. market benchmarks, competitor data). Keep signature identical.
// ─────────────────────────────────────────────────────────────
import type { StoryInput, PricingResult } from '../types'

/** Fair hourly rate assumption for a home-based maker in Bangladesh (BDT/hour) */
export const DEFAULT_LABOR_RATE = 60

function round(n: number, step = 5): number {
  return Math.round(n / step) * step
}

export function calculatePricing(input: StoryInput, laborRate = DEFAULT_LABOR_RATE): PricingResult {
  const production = Math.max(0, input.productionCost || 0)
  const packaging = Math.max(0, input.packagingCost || 0)
  const delivery = Math.max(0, input.deliveryCost || 0)
  const hours = Math.max(0, input.timeHours || 0)
  const capacity = Math.max(1, Math.floor(input.monthlyCapacity || 1))
  const margin = Math.max(0, input.profitMargin || 0) / 100

  const labor = hours * laborRate
  const totalCost = production + packaging + delivery + labor

  const recommendedPrice = round(totalCost * (1 + margin))
  const minimumPrice = round(totalCost * 1.1)          // 10% safety margin
  const premiumPrice = round(totalCost * (1 + margin + 0.2)) // +20 pts for premium positioning

  const profitPerUnit = recommendedPrice - totalCost
  const marginPct = totalCost > 0 ? (profitPerUnit / totalCost) * 100 : 0

  const monthlyRevenue = recommendedPrice * capacity
  const monthlyCost = totalCost * capacity
  const monthlyProfit = monthlyRevenue - monthlyCost

  const tips: string[] = []
  if (margin < 0.2) tips.push('Your profit margin is low. Consider at least 25–30% to cover unexpected costs.')
  if (labor > 0 && labor / totalCost > 0.5) tips.push('Most of your cost is your time. Bundle items or batch production to save hours.')
  if (delivery > 0 && delivery / totalCost > 0.25) tips.push('Delivery is a large share of your cost. Offer pickup or charge delivery separately.')
  if (packaging === 0) tips.push('Add a small packaging cost — good presentation lets you charge more.')
  tips.push(`Never sell below ${minimumPrice} BDT — that is your safety floor.`)
  tips.push(`Offer a premium version (e.g. custom design, gift wrap) at ${premiumPrice} BDT.`)

  return {
    currency: 'BDT',
    costs: {
      production,
      packaging,
      delivery,
      labor: Math.round(labor),
      laborRatePerHour: laborRate,
      totalCostPerUnit: Math.round(totalCost),
    },
    recommendedPrice,
    minimumPrice,
    premiumPrice,
    profitPerUnit: Math.round(profitPerUnit),
    profitMarginPercent: Math.round(marginPct),
    monthly: {
      capacity,
      revenue: Math.round(monthlyRevenue),
      totalCost: Math.round(monthlyCost),
      profit: Math.round(monthlyProfit),
    },
    breakEvenUnits: profitPerUnit > 0 ? Math.ceil(monthlyCost / recommendedPrice) : capacity,
    tips,
  }
}
