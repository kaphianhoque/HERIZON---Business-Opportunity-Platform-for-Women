// ─────────────────────────────────────────────────────────────
// MODULE: Smart Pricing & Profit (Member 2)
//
// 100% deterministic arithmetic — NO AI is used anywhere here.
//
// Formula (margin is a percentage of SELLING PRICE):
//   totalCost      = production + packaging + delivery (+ labor ONLY if an
//                    hourly labor rate is explicitly provided)
//   sellingPrice   = totalCost / (1 - margin)
//   profitPerUnit  = sellingPrice - totalCost
//   monthlyProfit  = profitPerUnit × monthlyCapacity
//
// Demo: 500 + 50 + 80 = 630 → 630 / 0.70 = 900 → 270/unit → 5,400/month
// ─────────────────────────────────────────────────────────────
import type { StoryInput, PricingResult, PricingIssue, PriceScenario } from '../types'

/** Round to 2 decimals to avoid floating-point noise (e.g. 899.9999999). */
function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Coerce a possibly-blank / string / undefined value into a finite number.
 * Blank, null, undefined, NaN, Infinity → `fallback`.
 */
export function toNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') {
    const t = v.trim().replace(/,/g, '')
    if (t === '') return fallback
    const n = Number(t)
    return Number.isFinite(n) ? n : fallback
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Normalised, cleaned numeric input for the engine */
export interface PricingInput {
  productionCost: number
  packagingCost: number
  deliveryCost: number
  monthlyCapacity: number
  profitMargin: number         // percent
  timeHours: number
  hourlyLaborRate: number | null
}

/** Clean raw values (blanks → 0 / null) WITHOUT clamping, so validation can report real problems. */
export function normalizePricingInput(raw: Partial<StoryInput> | Record<string, unknown>): PricingInput {
  const r = raw as Record<string, unknown>
  const rate = toNumber(r.hourlyLaborRate, NaN)
  return {
    productionCost: toNumber(r.productionCost, 0),
    packagingCost: toNumber(r.packagingCost, 0),
    deliveryCost: toNumber(r.deliveryCost, 0),
    monthlyCapacity: toNumber(r.monthlyCapacity, 0),
    profitMargin: toNumber(r.profitMargin, 0),
    timeHours: toNumber(r.timeHours, 0),
    hourlyLaborRate: Number.isFinite(rate) && rate > 0 ? rate : null,
  }
}

/** Validate cleaned input. Returns an empty array when everything is OK. */
export function validatePricingInput(i: PricingInput): PricingIssue[] {
  const issues: PricingIssue[] = []
  if (i.productionCost < 0) issues.push({ field: 'productionCost', message: 'Production cost cannot be negative.' })
  if (i.packagingCost < 0) issues.push({ field: 'packagingCost', message: 'Packaging cost cannot be negative.' })
  if (i.deliveryCost < 0) issues.push({ field: 'deliveryCost', message: 'Delivery cost cannot be negative.' })
  if (i.monthlyCapacity < 0) issues.push({ field: 'monthlyCapacity', message: 'Monthly capacity cannot be negative.' })
  if (i.timeHours < 0) issues.push({ field: 'timeHours', message: 'Production time cannot be negative.' })
  if (i.profitMargin < 0) issues.push({ field: 'profitMargin', message: 'Profit margin cannot be negative.' })
  if (i.profitMargin >= 100) issues.push({ field: 'profitMargin', message: 'Profit margin must be below 100% (a 100% margin means the product costs you nothing).' })
  if (i.productionCost + i.packagingCost + i.deliveryCost <= 0 && !(i.hourlyLaborRate && i.timeHours > 0)) {
    issues.push({ field: 'general', message: 'Enter at least one cost so we can calculate a price.' })
  }
  return issues
}

/** Compute one comparison row for an arbitrary selling price. */
export function scenario(price: number, totalCost: number, capacity: number, recommended = false): PriceScenario {
  const profit = r2(price - totalCost)
  return {
    price: r2(price),
    profitPerUnit: profit,
    marginPercent: price > 0 ? r2((profit / price) * 100) : 0,
    monthlyProfit: r2(profit * capacity),
    recommended,
  }
}

/**
 * Build the −50 / recommended / +50 comparison table.
 * Step is 50 BDT for prices ≥ 300, otherwise 10% of the price (min 5), so small
 * items still get a sensible spread. Prices never go at or below cost.
 */
function buildComparison(recommended: number, totalCost: number, capacity: number): PriceScenario[] {
  const step = recommended >= 300 ? 50 : Math.max(5, r2(recommended * 0.1))
  const lower = recommended - step
  const rows: PriceScenario[] = []
  if (lower > totalCost) rows.push(scenario(lower, totalCost, capacity))
  rows.push(scenario(recommended, totalCost, capacity, true))
  rows.push(scenario(recommended + step, totalCost, capacity))
  return rows
}

function buildTips(i: PricingInput, totalCost: number, price: number, profit: number): string[] {
  const tips: string[] = []
  if (i.profitMargin < 20) tips.push('A margin under 20% leaves little room for surprises. Many small makers aim for 25–35%.')
  if (i.profitMargin > 60) tips.push('A margin above 60% is ambitious for a new product — test it with a few customers first.')
  if (totalCost > 0 && i.deliveryCost / totalCost > 0.25) tips.push('Delivery is over a quarter of your cost. Consider charging delivery separately or offering pickup.')
  if (i.packagingCost === 0) tips.push('You entered no packaging cost. Good packaging often lets you charge more than it costs.')
  if (i.timeHours > 0 && !i.hourlyLaborRate) tips.push(`Your ${i.timeHours} hour(s) of work are not costed. Add an hourly rate if you want your time included in the price.`)
  if (i.monthlyCapacity === 0) tips.push('Set your monthly capacity to see your estimated monthly profit.')
  if (profit > 0) tips.push(`Never sell below ${Math.ceil(totalCost)} BDT — that is your cost. At ${price} BDT you keep ${profit} BDT per sale.`)
  return tips
}

/**
 * Main entry point. Always returns a PricingResult; when `valid` is false the
 * numbers are zeroed and `issues` explains why. The UI must check `valid`.
 */
export function calculatePricing(raw: Partial<StoryInput> | Record<string, unknown>): PricingResult {
  const i = normalizePricingInput(raw)
  const issues = validatePricingInput(i)

  const laborIncluded = i.hourlyLaborRate !== null && i.timeHours > 0
  const labor = laborIncluded ? r2(i.timeHours * (i.hourlyLaborRate as number)) : 0
  const totalCost = r2(i.productionCost + i.packagingCost + i.deliveryCost + labor)

  const base = {
    currency: 'BDT' as const,
    costs: {
      production: r2(i.productionCost),
      packaging: r2(i.packagingCost),
      delivery: r2(i.deliveryCost),
      labor,
      laborIncluded,
      timeHours: r2(i.timeHours),
      hourlyLaborRate: i.hourlyLaborRate,
      totalCostPerUnit: totalCost,
    },
    targetMarginPercent: r2(i.profitMargin),
  }

  if (issues.length > 0) {
    return {
      ...base,
      valid: false,
      issues,
      recommendedPrice: 0,
      profitPerUnit: 0,
      profitMarginPercent: 0,
      markupPercent: 0,
      monthly: { capacity: Math.max(0, Math.floor(i.monthlyCapacity)), revenue: 0, totalCost: 0, profit: 0 },
      comparison: [],
      tips: [],
    }
  }

  const margin = i.profitMargin / 100                  // e.g. 0.30
  const price = r2(totalCost / (1 - margin))           // 630 / 0.70 = 900
  const profit = r2(price - totalCost)                 // 270
  const capacity = Math.floor(i.monthlyCapacity)       // whole units only
  const revenue = r2(price * capacity)
  const monthlyCost = r2(totalCost * capacity)
  const monthlyProfit = r2(profit * capacity)          // 270 × 20 = 5,400

  return {
    ...base,
    valid: true,
    issues: [],
    recommendedPrice: price,
    profitPerUnit: profit,
    profitMarginPercent: price > 0 ? r2((profit / price) * 100) : 0,
    markupPercent: totalCost > 0 ? r2((profit / totalCost) * 100) : 0,
    monthly: { capacity, revenue, totalCost: monthlyCost, profit: monthlyProfit },
    comparison: buildComparison(price, totalCost, capacity),
    tips: buildTips(i, totalCost, price, profit),
  }
}
