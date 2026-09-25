// Deterministic tests for the Smart Pricing & Profit engine.
// Run: npx tsx tests/pricing.test.ts
import { calculatePricing, toNumber } from '../src/modules/pricing'

let passed = 0
let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) passed++
  else { failed++; console.error(`✗ ${label}\n    expected ${JSON.stringify(expected)}\n    got      ${JSON.stringify(actual)}`) }
}

// ── Spec demo: 500 + 50 + 80 = 630 → /0.70 = 900 → 270 → ×20 = 5400 ──
const demo = calculatePricing({ productionCost: 500, packagingCost: 50, deliveryCost: 80, monthlyCapacity: 20, profitMargin: 30, timeHours: 3 })
eq(demo.valid, true, 'demo valid')
eq(demo.costs.totalCostPerUnit, 630, 'demo total cost')
eq(demo.recommendedPrice, 900, 'demo recommended price')
eq(demo.profitPerUnit, 270, 'demo profit per unit')
eq(demo.profitMarginPercent, 30, 'demo achieved margin')
eq(demo.monthly.profit, 5400, 'demo monthly profit')
eq(demo.monthly.revenue, 18000, 'demo monthly revenue')
eq(demo.costs.labor, 0, 'demo: time NOT costed without hourly rate')
eq(demo.costs.laborIncluded, false, 'demo: laborIncluded false')
eq(demo.comparison.map((s) => [s.price, s.profitPerUnit, s.monthlyProfit, s.recommended]),
   [[850, 220, 4400, false], [900, 270, 5400, true], [950, 320, 6400, false]], 'demo comparison table')

// ── Labor only when hourly rate explicitly provided ──
const labor = calculatePricing({ productionCost: 500, packagingCost: 50, deliveryCost: 80, monthlyCapacity: 20, profitMargin: 30, timeHours: 3, hourlyLaborRate: 60 })
eq(labor.costs.labor, 180, 'labor = 3h × 60')
eq(labor.costs.totalCostPerUnit, 810, 'total includes labor')
eq(labor.recommendedPrice, 1157.14, 'price with labor (810/0.7)')
eq(labor.costs.laborIncluded, true, 'laborIncluded true')

// ── Blank values handled cleanly ──
const blanks = calculatePricing({ productionCost: '500', packagingCost: '', deliveryCost: undefined, monthlyCapacity: '', profitMargin: '30', timeHours: null })
eq(blanks.valid, true, 'blanks valid')
eq(blanks.costs.totalCostPerUnit, 500, 'blanks → 0')
eq(blanks.recommendedPrice, 714.29, 'blanks price 500/0.7')
eq(blanks.monthly.profit, 0, 'blank capacity → 0 monthly profit')
eq(blanks.monthly.capacity, 0, 'blank capacity = 0')

// ── Strings with commas ──
eq(toNumber('1,250.50'), 1250.5, 'comma string')
eq(toNumber('abc', 7), 7, 'garbage → fallback')
eq(toNumber('  '), 0, 'whitespace → 0')

// ── Validation ──
const neg = calculatePricing({ productionCost: -5, packagingCost: 50, deliveryCost: 80, monthlyCapacity: 20, profitMargin: 30 })
eq(neg.valid, false, 'negative cost invalid')
eq(neg.issues.map((i) => i.field), ['productionCost'], 'negative cost issue field')
eq(neg.recommendedPrice, 0, 'invalid → zeroed price')

const m100 = calculatePricing({ productionCost: 500, monthlyCapacity: 20, profitMargin: 100 })
eq(m100.valid, false, 'margin 100 invalid')
eq(m100.issues[0].field, 'profitMargin', 'margin 100 issue')

const m150 = calculatePricing({ productionCost: 500, monthlyCapacity: 20, profitMargin: 150 })
eq(m150.valid, false, 'margin 150 invalid')

const negCap = calculatePricing({ productionCost: 500, monthlyCapacity: -3, profitMargin: 30 })
eq(negCap.valid, false, 'negative capacity invalid')
eq(negCap.issues[0].field, 'monthlyCapacity', 'negative capacity issue')

const negMargin = calculatePricing({ productionCost: 500, monthlyCapacity: 3, profitMargin: -10 })
eq(negMargin.valid, false, 'negative margin invalid')

const noCost = calculatePricing({ productionCost: '', packagingCost: '', deliveryCost: '', monthlyCapacity: 10, profitMargin: 30 })
eq(noCost.valid, false, 'all-blank costs invalid')
eq(noCost.issues[0].field, 'general', 'all-blank costs → general issue')

const multi = calculatePricing({ productionCost: -1, packagingCost: -1, deliveryCost: 10, monthlyCapacity: -1, profitMargin: 120 })
eq(multi.issues.length, 4, 'multiple issues reported at once')

// ── Edge: 0% margin → price = cost ──
const zero = calculatePricing({ productionCost: 100, monthlyCapacity: 5, profitMargin: 0 })
eq(zero.valid, true, '0% margin valid')
eq(zero.recommendedPrice, 100, '0% margin price = cost')
eq(zero.profitPerUnit, 0, '0% margin profit 0')

// ── Edge: 99% margin ──
const m99 = calculatePricing({ productionCost: 10, monthlyCapacity: 1, profitMargin: 99 })
eq(m99.valid, true, '99% valid')
eq(m99.recommendedPrice, 1000, '99% → 10/0.01 = 1000')

// ── Floating point sanity ──
const fp = calculatePricing({ productionCost: 0.1, packagingCost: 0.2, deliveryCost: 0, monthlyCapacity: 3, profitMargin: 25 })
eq(fp.costs.totalCostPerUnit, 0.3, '0.1 + 0.2 = 0.3')
eq(fp.recommendedPrice, 0.4, '0.3 / 0.75 = 0.4')

// ── Capacity floored to whole units ──
const frac = calculatePricing({ productionCost: 630, monthlyCapacity: 20.9, profitMargin: 30 })
eq(frac.monthly.capacity, 20, 'capacity floored')
eq(frac.monthly.profit, 5400, 'floored monthly profit')

// ── Small price comparison uses 10% step, never at/below cost ──
const small = calculatePricing({ productionCost: 20, monthlyCapacity: 100, profitMargin: 20 })
eq(small.recommendedPrice, 25, 'small price 20/0.8')
eq(small.comparison.length, 2, 'small drops the at-cost row (20 = cost)')
eq(small.comparison.every((s) => s.price > 20), true, 'no comparison row at or below cost')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
