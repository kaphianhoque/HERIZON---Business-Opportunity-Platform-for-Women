import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const R = []; const ok = (n, c, d = '') => { R.push({ n, c: !!c, d }); console.log(`${c ? '✅' : '❌'} ${n}${d ? '  — ' + d : ''}`) }
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await ctx.newPage()
const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))

// Clean-run console check (no injected failures)
await page.goto(BASE + '/'); await page.click('#hero-demo-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
for (const p of ['/pricing', '/promotion', '/opportunities']) { await page.click(`a[href="#${p}"]`); await page.waitForTimeout(400) }
ok('Clean golden run: zero console errors', errs.filter((e) => !/tailwindcss/.test(e)).length === 0, errs.join(' | '))

// E1: whitespace-only description
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form')
await page.fill('#f-description', '     '); await page.click('#generate-btn'); await page.waitForTimeout(200)
ok('Whitespace-only description blocked', await page.locator('#form-error').isVisible())

// E2: description < 5 chars
await page.fill('#f-description', 'cake'); await page.click('#generate-btn'); await page.waitForTimeout(200)
ok('Too-short description blocked client-side', await page.locator('#form-error').isVisible())

// E3: all costs blank
await page.fill('#f-description', 'I make homemade chocolate cakes.')
for (const f of ['productionCost', 'packagingCost', 'deliveryCost']) await page.fill('#f-' + f, '')
await page.click('#generate-btn'); await page.waitForTimeout(200)
ok('All-blank costs blocked', (await page.textContent('#field-errors')).includes('at least one cost'))

// E4: non-numeric typed into number input ('e' is allowed by browsers)
await page.fill('#f-productionCost', '500'); await page.fill('#f-packagingCost', ''); await page.fill('#f-deliveryCost', '')
await page.locator('#f-monthlyCapacity').fill(''); await page.locator('#f-monthlyCapacity').type('e')
await page.click('#generate-btn'); await page.waitForTimeout(200)
const ferr = await page.locator('#field-errors').isVisible() ? await page.textContent('#field-errors') : ''
ok('Garbage number input handled (no crash)', errs.filter((e) => /PAGEERR/.test(e)).length === 0, ferr || 'submitted (treated as blank)')
await page.waitForSelector('#product-title', { timeout: 60000 }).catch(() => {})

// E5: blank capacity → monthly profit 0, no crash
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form')
await page.fill('#f-description', 'I make homemade chocolate cakes.'); await page.fill('#f-productionCost', '500'); await page.fill('#f-packagingCost', ''); await page.fill('#f-deliveryCost', '')
await page.fill('#f-monthlyCapacity', ''); await page.fill('#f-profitMargin', '30')
await page.click('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
await page.click('a[href="#/pricing"]'); await page.waitForSelector('#pricing-summary')
const stats = await page.$$eval('#pricing-summary .stat', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
ok('Blank capacity → monthly profit ৳0', stats.find((s) => s.startsWith('Est. monthly')).includes('৳0'), stats.find((s) => s.startsWith('Est. monthly')))
ok('Blank capacity → price still computed (500/0.7 = ৳714.29)', stats.find((s) => s.startsWith('Recommended')).includes('714.29'), stats.find((s) => s.startsWith('Recommended')))

// E6: 0% margin
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
await page.fill('#f-profitMargin', '0'); await page.click('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
await page.click('a[href="#/pricing"]'); await page.waitForSelector('#pricing-summary')
const s0 = await page.$$eval('#pricing-summary .stat', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
ok('0% margin → price = cost ৳630, profit ৳0', s0.find((s) => s.startsWith('Recommended')).includes('৳630') && s0.find((s) => s.startsWith('Profit per')).includes('৳0'))
const rows0 = await page.locator('#price-comparison tbody tr').count()
ok('0% margin comparison drops the at/below-cost row', rows0 === 2, `${rows0} rows`)

// E7: hourly labor rate included
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
await page.click('summary'); await page.fill('#f-hourlyLaborRate', '60'); await page.click('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
await page.click('a[href="#/pricing"]'); await page.waitForSelector('#pricing-summary')
const sl = await page.$$eval('#pricing-summary .stat', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
ok('Labor rate 60 × 3h → total ৳810', sl.find((s) => s.startsWith('Total cost')).includes('৳810'), sl.find((s) => s.startsWith('Total cost')))
ok('Labor bar shown in breakdown', (await page.textContent('body')).includes('Your time (3 h'))

// E8: decimal inputs
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
await page.click('summary'); await page.fill('#f-hourlyLaborRate', '')
await page.fill('#f-productionCost', '0.1'); await page.fill('#f-packagingCost', '0.2'); await page.fill('#f-deliveryCost', '0'); await page.fill('#f-profitMargin', '25')
await page.click('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
await page.click('a[href="#/pricing"]'); await page.waitForSelector('#pricing-summary')
const sd = await page.$$eval('#pricing-summary .stat', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
ok('0.1 + 0.2 → ৳0.3 (no float noise)', sd.find((s) => s.startsWith('Total cost')).includes('৳0.3'), sd.find((s) => s.startsWith('Total cost')))

// E9: XSS in description / product edit
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
await page.fill('#f-description', 'I make cakes <img src=x onerror="window.__xss=1"> for events.')
await page.fill('#f-productName', '<script>window.__xss=2</script>Cake')
await page.click('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
await page.click('#product-edit-btn'); await page.waitForSelector('#pe-title')
await page.fill('#pe-title', '<b onmouseover="window.__xss=3">Evil</b>'); await page.click('#product-save-btn'); await page.waitForSelector('#product-title')
await page.click('a[href="#/promotion"]'); await page.waitForSelector('#fb-post', { timeout: 60000 })
await page.click('a[href="#/opportunities"]'); await page.waitForSelector('#opportunity-list')
ok('XSS payloads are escaped (no execution)', (await page.evaluate(() => window.__xss)) === undefined)
ok('Escaped title rendered literally', (await page.locator('body').innerText()).includes('<b onmouseover'))

// E10: double-click generate doesn't double-submit
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
let genCalls = 0; page.on('request', (r) => { if (r.url().endsWith('/api/generate')) genCalls++ })
await page.dblclick('#generate-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
ok('Double-click generate → single request', genCalls === 1, `${genCalls} requests`)

// E11: rapid regenerate clicks
let prodCalls = 0; page.on('request', (r) => { if (r.url().endsWith('/api/product')) prodCalls++ })
await page.click('#product-regen-btn'); await page.waitForTimeout(50)
// second click must not auto-wait for the button to reappear (that would be a legitimate 2nd regen)
await page.locator('#product-regen-btn').click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(50)
await page.waitForSelector('#product-title', { timeout: 60000 })
ok('Rapid regenerate clicks → single request', prodCalls === 1, `${prodCalls} requests`)

// E12: Try Demo from landing while a result exists → resets & regenerates
await page.goto(BASE + '/'); await page.click('#hero-demo-btn'); await page.waitForSelector('#product-title', { timeout: 60000 })
ok('Try Demo again works with existing result', page.url().endsWith('#/product'))

// E13: promotion page before promotion refresh finishes — loading card shown, not crash
await page.click('#product-edit-btn'); await page.waitForSelector('#pe-title'); await page.fill('#pe-title', 'Quick Edit'); await page.click('#product-save-btn')
await page.click('a[href="#/promotion"]'); await page.waitForTimeout(100)
const bodyTxt = await page.locator('body').innerText()
ok('Promotion during silent refresh shows content or loading (no crash)', bodyTxt.includes('Promotion'))
await page.waitForSelector('#fb-post', { timeout: 60000 })
ok('Promotion reflects edited product after refresh', (await page.textContent('#fb-post')).includes('Quick Edit'))

// E14: API direct — description missing on /api/generate
const r400 = await page.evaluate(async () => (await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status)
ok('/api/generate without description → 400', r400 === 400)
const rBad = await page.evaluate(async () => (await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'not json' })).status)
ok('/api/generate malformed JSON → 400 (no 500)', rBad === 400, `status ${rBad}`)
const r422 = await page.evaluate(async () => (await fetch('/api/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productionCost: -1 }) })).status)
ok('/api/pricing invalid → 422', r422 === 422)
const r404 = await page.evaluate(async () => (await fetch('/api/nope')).status)
ok('Unknown API route → 404', r404 === 404, `status ${r404}`)

// E15: /api/generate with invalid pricing still returns product/promo, pricing.valid=false
const inv = await page.evaluate(async () => (await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: 'I make homemade chocolate cakes.', productionCost: -5, monthlyCapacity: 20, profitMargin: 30 }) })).json())
ok('/api/generate with bad numbers → 200, pricing.valid=false, no crash', inv.pricing && inv.pricing.valid === false && inv.product && inv.promotion)
ok('Promotion omits price when pricing invalid', !/৳|BDT/.test(inv.promotion.facebookPost), inv.promotion.facebookPost.slice(0, 80))

// E16: keyboard — Enter in a number field submits form (expected) and Escape doesn't break
await page.goto(BASE + '/#/story'); await page.waitForSelector('#story-form'); await page.click('#story-demo-btn')
await page.focus('#f-profitMargin'); await page.keyboard.press('Enter'); await page.waitForSelector('#product-title', { timeout: 60000 })
ok('Enter key submits story form', page.url().endsWith('#/product'))

// E17: header Start button from a result page
await page.click('#nav-start-btn'); await page.waitForSelector('#story-form')
ok('Header "Start Your Story" navigates to story with values retained', (await page.inputValue('#f-productionCost')) === '500')

// E18: logo returns home
await page.click('#logo-link'); await page.waitForTimeout(200)
ok('Logo → landing', await page.locator('#hero-section').isVisible())

// Final console check
const real = errs.filter((e) => !/tailwindcss|status of (400|404|422|502)|ERR_FAILED/.test(e))
ok('Edge suite: zero console/page errors', real.length === 0, real.slice(0, 4).join(' | '))

await browser.close()
const f = R.filter((x) => !x.c); console.log(`\n${R.length - f.length}/${R.length} passed`); f.forEach((x) => console.log(' - FAIL:', x.n, x.d))
