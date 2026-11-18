import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const results = []
const consoleErrors = []
const pageErrors = []
const failedRequests = []

function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail })
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('requestfailed', (r) => failedRequests.push(r.url()))
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/')) failedRequests.push(`${r.status()} ${r.url()}`) })

/** Sign up a fresh account on a page (auth is required for the app pages; see tests/e2e/auth.mjs for the auth suite). */
async function signUp(p, name = 'QA Tester') {
  await p.goto(BASE + '/#/signup'); await p.waitForSelector('#signup-form')
  await p.fill('#a-name', name); await p.fill('#a-email', `qa+${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`); await p.fill('#a-password', 'secret123')
  await p.click('#signup-btn'); await p.waitForSelector('#story-form', { timeout: 5000 })
}

// ── 0. Auth gate ───────────────────────────────────────────
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.click('#hero-start-btn'); await page.waitForSelector('#login-form')
ok('Logged out: Start Your Story → #/login', page.url().endsWith('#/login'))
await signUp(page)
ok('Sign up → #/story', page.url().endsWith('#/story'))

// ── 1. Landing ─────────────────────────────────────────────
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
ok('Landing renders hero', await page.locator('#hero-section').isVisible())
ok('Landing shows tagline', (await page.textContent('#hero-section')).includes('Your Story.'))
ok('Landing has Start Your Story', await page.locator('#hero-start-btn').isVisible())
ok('Landing has Try Demo', await page.locator('#hero-demo-btn').isVisible())
ok('Landing has 4 steps', (await page.locator('#how-it-works li').count()) === 4)
const imgs = await page.$$eval('img', (els) => els.map((e) => ({ src: e.getAttribute('src'), ok: e.complete && e.naturalWidth > 0 })))
ok('All landing images load', imgs.every((i) => i.ok), `${imgs.filter((i) => !i.ok).map((i) => i.src).join(', ') || 'all ok'}`)
ok('Result pages disabled in nav before generating', (await page.locator('#step-nav .step-link.disabled').count()) === 4)

// ── 2. Start Your Story ────────────────────────────────────
await page.click('#hero-start-btn')
await page.waitForSelector('#story-form')
ok('Start Your Story → #/story', page.url().endsWith('#/story'))

// ── 3. Empty input validation ──────────────────────────────
await page.click('#generate-btn')
await page.waitForTimeout(300)
ok('Empty description blocked', await page.locator('#form-error').isVisible(), await page.textContent('#form-error'))
ok('Still on story page after empty submit', page.url().endsWith('#/story'))

// ── 4. Invalid numbers ─────────────────────────────────────
await page.fill('#f-description', 'I make homemade chocolate cakes for birthdays and small events.')
await page.fill('#f-productionCost', '-5')
await page.fill('#f-profitMargin', '100')
await page.fill('#f-monthlyCapacity', '-1')
await page.click('#generate-btn')
await page.waitForTimeout(300)
const errTxt = await page.textContent('#field-errors')
ok('Negative cost rejected', errTxt.includes('Production cost cannot be negative'))
ok('Margin 100% rejected', errTxt.includes('below 100%'))
ok('Negative capacity rejected', errTxt.includes('Monthly capacity cannot be negative'))
ok('Offending fields highlighted', (await page.locator('#story-form .input.ring-red-400').count()) >= 3)
ok('Still on story page after invalid numbers', page.url().endsWith('#/story'))
// live re-validation clears when fixed
await page.fill('#f-productionCost', '500'); await page.fill('#f-profitMargin', '30'); await page.fill('#f-monthlyCapacity', '20')
await page.waitForTimeout(200)
ok('Errors clear on live fix', !(await page.locator('#field-errors').isVisible()))

// blank optional numbers should be OK
await page.fill('#f-packagingCost', ''); await page.fill('#f-deliveryCost', '')
// ── 5. Fill Demo ──────────────────────────────────────────
await page.click('#story-demo-btn')
await page.waitForTimeout(200)
ok('Fill Demo populates fields', (await page.inputValue('#f-productionCost')) === '500' && (await page.inputValue('#f-packagingCost')) === '50' && (await page.inputValue('#f-deliveryCost')) === '80' && (await page.inputValue('#f-monthlyCapacity')) === '20' && (await page.inputValue('#f-profitMargin')) === '30')
ok('Fill Demo sets goal', (await page.inputValue('#f-businessGoal')) === 'find_buyers')

// ── 6. Generate (loading state) ───────────────────────────
const t0 = Date.now()
await page.click('#generate-btn')
let sawLoading = false
try { await page.waitForSelector('#loading-msg', { timeout: 3000 }); sawLoading = true } catch {}
ok('Loading indicator shown during generation', sawLoading)
await page.waitForSelector('#product-title', { timeout: 60000 })
const genMs = Date.now() - t0
ok('Generation completes → #/product', page.url().endsWith('#/product'), `${genMs} ms`)
ok('Nav steps enabled after generation', (await page.locator('#step-nav .step-link.disabled').count()) === 0)

// ── 7. AI product ─────────────────────────────────────────
const title = (await page.textContent('#product-title')).trim()
const desc = (await page.textContent('#product-description')).trim()
ok('Product title present', title.length > 3, title)
ok('Product description present', desc.length > 20, desc.slice(0, 80) + '…')
ok('Category chip present', (await page.locator('.chip').first().textContent()).length > 2, await page.locator('.chip').first().textContent())
const badge = await page.locator('span[title*="Herizon AI"], span[title*="Template"]').first().textContent()
ok('Source badge shown', /AI generated|Template/.test(badge), badge.trim())
const noInvent = !/\b\d+\+? ?years?\b|certified|award|Dhaka|hundreds of|trusted by|same.day/i.test(title + ' ' + desc)
ok('No invented claims in product', noInvent)

// Edit
await page.click('#product-edit-btn')
await page.waitForSelector('#product-edit-form')
await page.fill('#pe-title', "Rina's Chocolate Cake")
await page.click('#product-save-btn')
await page.waitForSelector('#product-title')
ok('Edit → Save updates title', (await page.textContent('#product-title')).includes("Rina's Chocolate Cake"))

// Regenerate
await page.click('#product-regen-btn')
let sawPrepLoading = false
try { await page.waitForSelector('text=Herizon is preparing your product…', { timeout: 3000 }); sawPrepLoading = true } catch {}
ok('Regenerate shows "Herizon is preparing your product…"', sawPrepLoading)
await page.waitForSelector('#product-title', { timeout: 60000 })
const newTitle = (await page.textContent('#product-title')).trim()
ok('Regenerate completes with a product', newTitle.length > 3, newTitle)
ok('Regenerate replaces edited name with fresh AI output', newTitle !== "Rina's Chocolate Cake")

// ── 8-9. Pricing ──────────────────────────────────────────
await page.click('a[href="#/pricing"]')
await page.waitForSelector('#pricing-summary')
const stats = await page.$$eval('#pricing-summary .stat', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
const findStat = (label) => stats.find((s) => s.startsWith(label)) || ''
ok('Total cost = ৳630', findStat('Total cost').includes('৳630'), findStat('Total cost'))
ok('Selling price = ৳900', findStat('Recommended selling price').includes('৳900'), findStat('Recommended selling price'))
ok('Profit/unit = ৳270', findStat('Profit per unit').includes('৳270'), findStat('Profit per unit'))
ok('Profit margin = 30%', findStat('Profit margin').includes('30%'), findStat('Profit margin'))
ok('Monthly profit = ৳5,400', findStat('Est. monthly profit').includes('৳5,400'), findStat('Est. monthly profit'))
const rows = await page.$$eval('#price-comparison tbody tr', (trs) => trs.map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()))
ok('Comparison has 3 rows', rows.length === 3)
ok('Row ৳850 → ৳220 → ৳4,400', rows[0].includes('৳850') && rows[0].includes('৳220') && rows[0].includes('৳4,400'), rows[0])
ok('Row ৳900 → ৳270 → ৳5,400 recommended', rows[1].includes('৳900') && rows[1].includes('৳270') && rows[1].includes('৳5,400') && rows[1].includes('Recommended'), rows[1])
ok('Row ৳950 → ৳320 → ৳6,400', rows[2].includes('৳950') && rows[2].includes('৳320') && rows[2].includes('৳6,400'), rows[2])
ok('Time NOT costed without hourly rate', (await page.textContent('body')).includes('not included in cost'))

// ── 10-12. Promotion ──────────────────────────────────────
await page.click('a[href="#/promotion"]')
await page.waitForSelector('#fb-post, #fb-post-card', { timeout: 60000 })
// promotion may still be refreshing after product regen; wait for text
await page.waitForSelector('#fb-post', { timeout: 60000 })
await page.waitForSelector('#wa-msg', { timeout: 60000 })
const fb = await page.textContent('#fb-post')
const wa = await page.textContent('#wa-msg')
ok('Facebook post generated', fb.length > 60, `${fb.split(/\s+/).length} words`)
ok('Facebook post contains ৳900', fb.includes('900'))
ok('WhatsApp message generated', wa.length > 30, `${wa.split(/\s+/).length} words`)
ok('WhatsApp message contains ৳900', wa.includes('900'))
ok('WhatsApp shorter than Facebook', wa.length < fb.length)
ok('WhatsApp share link is wa.me', (await page.getAttribute('a[href^="https://wa.me/"]', 'href')) !== null)

// Copy buttons — real clipboard
await page.click('#fb-post-card .copy-btn')
await page.waitForTimeout(150)
const clip1 = await page.evaluate(() => navigator.clipboard.readText())
ok('Copy Facebook Post writes clipboard', clip1.trim() === fb.trim())
ok('Copy button shows "Copied!"', (await page.textContent('#fb-post-card .copy-btn')).includes('Copied!'))
ok('Toast shows "Copied!"', (await page.textContent('#toast')).includes('Copied!'))
await page.waitForTimeout(2000)
ok('Copy button label restores', !(await page.textContent('#fb-post-card .copy-btn')).includes('Copied!'))
await page.click('#wa-msg-card .copy-btn')
await page.waitForTimeout(150)
const clip2 = await page.evaluate(() => navigator.clipboard.readText())
ok('Copy WhatsApp Message writes clipboard', clip2.trim() === wa.trim())

// Regenerate WhatsApp only
const fbBefore = fb
await page.click('#wa-msg-card .promo-regen-btn')
let sawPromoLoading = false
try { await page.waitForSelector('text=Herizon is creating your promotion…', { timeout: 3000 }); sawPromoLoading = true } catch {}
ok('Regenerate shows "Herizon is creating your promotion…"', sawPromoLoading)
await page.waitForSelector('#wa-msg', { timeout: 60000 })
const wa2 = await page.textContent('#wa-msg')
const fbAfter = await page.textContent('#fb-post')
ok('WhatsApp regenerated (changed)', wa2.trim() !== wa.trim())
ok('Facebook untouched by WhatsApp regenerate', fbAfter.trim() === fbBefore.trim())

// ── 13. Opportunities ─────────────────────────────────────
await page.click('a[href="#/opportunities"]')
await page.waitForSelector('#opportunity-list')
const cards = await page.locator('#opportunity-list > li').count()
ok('Exactly 3 opportunities shown', cards === 3, `${cards}`)
const demoBadges = await page.locator('#opportunity-list > li:has-text("DEMO")').count()
ok('Every card labelled DEMO', demoBadges === 3)
ok('Page disclaimer present', (await page.textContent('body')).includes('not real'))
const why = await page.locator('#opportunity-list > li').first().textContent()
ok('First card has "Why it matches"', why.includes('Why it matches'))
ok('Cards have Request Connection / Details / Save actions', (await page.locator('#opportunity-list .opp-connect-btn').count()) === 3 && (await page.locator('#opportunity-list .opp-details-btn').count()) === 3 && (await page.locator('#opportunity-list .opp-save-btn').count()) === 3)
const hts = await page.$$eval('#opportunity-list > li', (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
ok('Opportunity cards equal height', Math.max(...hts) - Math.min(...hts) <= 2, hts.join('/'))
ok('Top match is Home Bakery Supplier Opportunity (Buyer)', why.includes('Home Bakery Supplier Opportunity') && why.includes('Buyer'))

// Export
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#export-btn')])
ok('Download summary works', dl !== null, dl ? dl.suggestedFilename() : 'no download')

// ── Navigation ────────────────────────────────────────────
for (const path of ['/', '/story', '/product', '/pricing', '/promotion', '/opportunities']) {
  await page.goto(BASE + '/#' + path); await page.waitForTimeout(200)
  const hasContent = (await page.locator('#app').innerText()).trim().length > 50
  ok(`Route ${path} renders`, hasContent)
}
await page.goto(BASE + '/#/does-not-exist'); await page.waitForTimeout(200)
ok('Unknown route falls back to landing', await page.locator('#hero-section').isVisible())
await page.goto(BASE + '/#/pricing'); await page.waitForTimeout(200)
ok('Refresh keeps result (sessionStorage)', await page.locator('#pricing-summary').isVisible())
// browser back
await page.goto(BASE + '/#/product'); await page.waitForTimeout(100)
await page.goBack(); await page.waitForTimeout(200)
ok('Browser back works', page.url().endsWith('#/pricing') && await page.locator('#pricing-summary').isVisible())

// ── AI failure path (simulate 502) ────────────────────────
await page.goto(BASE + '/#/product'); await page.waitForSelector('#product-title')
await page.route('**/api/product', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: "Herizon couldn't generate this right now. Please try again." }) }))
await page.click('#product-regen-btn')
await page.waitForSelector('[role="alert"]', { timeout: 10000 })
ok('AI failure shows spec message', (await page.textContent('[role="alert"]')).includes("Herizon couldn't generate this right now. Please try again."))
ok('Previous product preserved after failure', await page.locator('#product-title').isVisible())
await page.unroute('**/api/product')
await page.goto(BASE + '/#/promotion'); await page.waitForSelector('#fb-post')
await page.route('**/api/promotion', (r) => r.abort())
await page.click('#fb-post-card .promo-regen-btn')
await page.waitForSelector('[role="alert"]', { timeout: 10000 })
ok('Network failure on promotion shows spec message', (await page.textContent('[role="alert"]')).includes("Herizon couldn't generate this right now"))
ok('Facebook post still visible after failure', await page.locator('#fb-post').isVisible())
await page.unroute('**/api/promotion')

// ── Empty state guard (fresh session) ─────────────────────
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const p2 = await ctx2.newPage()
await p2.goto(BASE + '/#/pricing'); await p2.waitForSelector('#login-form')
ok('Result page in a fresh browser → login', p2.url().endsWith('#/login'))
await signUp(p2, 'Fresh User')
await p2.goto(BASE + '/#/pricing'); await p2.waitForTimeout(300)
ok('Result page without data shows empty state', await p2.locator('#empty-demo-btn').isVisible())
await ctx2.close()

// ── Mobile ────────────────────────────────────────────────
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
const m = await mctx.newPage()
m.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('[mobile] ' + msg.text()) })
m.on('pageerror', (e) => pageErrors.push('[mobile] ' + e.message))
await signUp(m, 'Mobile User')
await m.goto(BASE + '/', { waitUntil: 'networkidle' })
const noHScroll = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
ok('Mobile landing: no horizontal overflow', noHScroll, `scrollWidth=${await m.evaluate(() => document.documentElement.scrollWidth)}`)
ok('Mobile: Try Demo visible', await m.locator('#hero-demo-btn').isVisible())
await m.tap('#hero-demo-btn')
await m.waitForSelector('#product-title', { timeout: 60000 })
ok('Mobile: demo completes', m.url().endsWith('#/product'))
ok('Mobile: step nav (mobile) visible', await m.locator('#step-nav-mobile').isVisible())
for (const path of ['/product', '/pricing', '/promotion', '/opportunities', '/story']) {
  await m.goto(BASE + '/#' + path); await m.waitForTimeout(300)
  const w = await m.evaluate(() => document.documentElement.scrollWidth)
  ok(`Mobile ${path}: no horizontal overflow`, w <= 376, `scrollWidth=${w}`)
}
await m.goto(BASE + '/#/pricing'); await m.waitForSelector('#pricing-summary')
ok('Mobile pricing: comparison table scrolls not overflows', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 376)
await m.screenshot({ path: '/tmp/qa/mobile-pricing.png', fullPage: true })
await mctx.close()

// Tablet
const tctx = await browser.newContext({ viewport: { width: 820, height: 1180 } })
const t = await tctx.newPage()
await t.goto(BASE + '/', { waitUntil: 'networkidle' })
ok('Tablet landing: no horizontal overflow', await t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
await tctx.close()

// ── Console / network ─────────────────────────────────────
const realConsoleErrors = consoleErrors.filter((e) => !/tailwindcss|status of 502|ERR_FAILED/.test(e))
ok('No console errors', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '))
ok('No uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
const realFailed = failedRequests.filter((u) => !/api\/(product|promotion)/.test(u)) // we deliberately failed those
ok('No failed static/network requests', realFailed.length === 0, realFailed.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) { console.log('FAILED:'); failed.forEach((f) => console.log(' -', f.name, f.detail ? `(${f.detail})` : '')) }
