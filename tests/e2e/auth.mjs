// Herizon E2E — simple user login / signup + per-user data isolation.
// Run against a live dev server: npm run build && pm2 start ecosystem.config.cjs && node tests/e2e/auth.mjs
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const R = []
const ok = (n, c, d = '') => { R.push({ n, c: !!c, d }); console.log(`${c ? '✅' : '❌'} ${n}${d ? '  — ' + d : ''}`) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await ctx.newPage()
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))

const A = { name: 'Ayesha Rahman', email: `ayesha+${Date.now()}@example.com`, password: 'secret123' }
const B = { name: 'Nusrat Jahan', email: `nusrat+${Date.now()}@example.com`, password: 'another456' }

// ── 1. Logged out: landing shows Log in / Create Account, no step nav ────────
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
ok('Landing renders when logged out', await page.locator('#hero-section').isVisible())
ok('Header shows Log in + Create Account when logged out', await page.locator('#nav-login-btn').isVisible() && await page.locator('#nav-signup-btn').isVisible())
ok('No Log out button when logged out', (await page.locator('#nav-logout-btn').count()) === 0)
ok('Step nav hidden when logged out', (await page.locator('#step-nav li').count()) === 0)

// ── 2. Protected routes redirect to login ───────────────────────────────────
await page.click('#hero-start-btn'); await page.waitForSelector('#login-form')
ok('Start Your Story (logged out) → #/login', page.url().endsWith('#/login'))
await page.goto(BASE + '/#/pricing'); await page.waitForSelector('#login-form')
ok('Direct #/pricing (logged out) → #/login', page.url().endsWith('#/login'))
ok('Login screen has Email, Password, Login button', await page.locator('#a-email').isVisible() && await page.locator('#a-password').isVisible() && await page.locator('#login-btn').isVisible())

// ── 3. Login validation ─────────────────────────────────────────────────────
await page.click('#login-btn'); await page.waitForTimeout(200)
ok('Empty login shows error', await page.locator('#auth-error').isVisible(), await page.textContent('#auth-error'))
await page.fill('#a-email', 'nobody@example.com'); await page.fill('#a-password', 'whatever'); await page.click('#login-btn'); await page.waitForTimeout(300)
ok('Unknown account → "Incorrect email or password."', (await page.textContent('#auth-error')).includes('Incorrect email or password'))
ok('Still on login after failed attempt', page.url().endsWith('#/login'))

// ── 4. Switch to Sign Up + validation ──────────────────────────────────────
await page.click('#to-signup-link'); await page.waitForSelector('#signup-form')
ok('Login → Sign Up link works', page.url().endsWith('#/signup'))
ok('Sign Up has Name, Email, Password, Create Account', await page.locator('#a-name').isVisible() && await page.locator('#a-email').isVisible() && await page.locator('#a-password').isVisible() && await page.locator('#signup-btn').isVisible())
await page.fill('#a-name', 'A'); await page.fill('#a-email', 'bad-email'); await page.fill('#a-password', '123'); await page.click('#signup-btn'); await page.waitForTimeout(200)
ok('Short name rejected', (await page.textContent('#auth-error')).includes('name'))
await page.fill('#a-name', A.name); await page.click('#signup-btn'); await page.waitForTimeout(200)
ok('Invalid email rejected', (await page.textContent('#auth-error')).includes('valid email'))
await page.fill('#a-email', A.email); await page.click('#signup-btn'); await page.waitForTimeout(200)
ok('Short password rejected', (await page.textContent('#auth-error')).includes('6 characters'))

// ── 5. Sign up → redirected into Herizon (#/story) ─────────────────────────
await page.fill('#a-password', A.password); await page.click('#signup-btn')
await page.waitForSelector('#story-form', { timeout: 5000 })
ok('Create Account → redirected to Herizon (#/story)', page.url().endsWith('#/story'))
ok('Header shows user name after signup', (await page.textContent('#nav-user')).includes('Ayesha'))
ok('Header shows Log out after signup', await page.locator('#nav-logout-btn').isVisible())
ok('Header shows Start Your Story after signup', await page.locator('#nav-start-btn').isVisible())
ok('Step nav visible after signup', (await page.locator('#step-nav li').count()) === 5)

// ── 6. Passwords are never stored in plain text ────────────────────────────
const users = await page.evaluate(() => localStorage.getItem('herizon.users') || '')
ok('Users store exists', users.includes(A.email))
ok('Plain password NOT stored', !users.includes(A.password))
ok('Password hash stored (sha256)', users.includes('sha256:'))

// ── 7. User A generates a product; data is saved under her account ─────────
await page.click('#story-demo-btn'); await page.click('#generate-btn')
await page.waitForSelector('#product-title', { timeout: 60000 })
ok('User A generates a product', page.url().endsWith('#/product'))
const titleA = (await page.textContent('#product-title')).trim()
const uidA = await page.evaluate(() => JSON.parse(localStorage.getItem('herizon.session')).userId)
ok('Data saved under user A\'s own key', await page.evaluate((uid) => !!localStorage.getItem(`herizon.data.${uid}`), uidA))

// ── 8. Session persists across reload ──────────────────────────────────────
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(300)
ok('Still logged in after reload', await page.locator('#nav-logout-btn').isVisible())
ok('Result restored after reload', await page.locator('#product-title').isVisible())

// ── 9. Log out clears the screen; protected pages need login again ─────────
await page.click('#nav-logout-btn'); await page.waitForTimeout(300)
ok('Log out → landing', page.url().endsWith('#/') && await page.locator('#hero-section').isVisible())
ok('Header back to Log in / Create Account', await page.locator('#nav-login-btn').isVisible())
await page.goto(BASE + '/#/product'); await page.waitForSelector('#login-form')
ok('#/product after logout → #/login', page.url().endsWith('#/login'))
ok('User A\'s data still stored (not wiped on logout)', await page.evaluate((uid) => !!localStorage.getItem(`herizon.data.${uid}`), uidA))

// ── 10. User B signs up on the same device → sees nothing of A ─────────────
await page.goto(BASE + '/#/signup'); await page.waitForSelector('#signup-form')
await page.fill('#a-name', B.name); await page.fill('#a-email', B.email); await page.fill('#a-password', B.password); await page.click('#signup-btn')
await page.waitForSelector('#story-form', { timeout: 5000 })
ok('User B signup → #/story', page.url().endsWith('#/story'))
ok('User B sees an empty story form (no A data)', (await page.inputValue('#f-description')) === '' && (await page.inputValue('#f-productionCost')) === '')
ok('Result steps disabled for B (no A result leak)', (await page.locator('#step-nav .step-link.disabled').count()) === 4)
await page.goto(BASE + '/#/product'); await page.waitForTimeout(300)
ok('#/product for B shows empty state, not A\'s product', await page.locator('#empty-demo-btn').isVisible() && (await page.locator('#product-title').count()) === 0)

// ── 11. Duplicate email blocked; log out B ─────────────────────────────────
await page.click('#nav-logout-btn'); await page.waitForTimeout(200)
await page.goto(BASE + '/#/signup'); await page.waitForSelector('#signup-form')
await page.fill('#a-name', 'Someone'); await page.fill('#a-email', A.email.toUpperCase()); await page.fill('#a-password', 'xxxxxx'); await page.click('#signup-btn'); await page.waitForTimeout(300)
ok('Duplicate email (case-insensitive) rejected', (await page.textContent('#auth-error')).includes('already exists'))

// ── 12. User A logs back in → her product is right where she left it ───────
await page.click('#to-login-link'); await page.waitForSelector('#login-form')
await page.fill('#a-email', A.email); await page.fill('#a-password', 'wrong-password'); await page.click('#login-btn'); await page.waitForTimeout(300)
ok('Wrong password rejected', (await page.textContent('#auth-error')).includes('Incorrect email or password'))
await page.fill('#a-password', A.password); await page.click('#login-btn')
await page.waitForSelector('#story-form', { timeout: 5000 })
ok('Correct login → #/story', page.url().endsWith('#/story'))
ok('A\'s story values restored', (await page.inputValue('#f-productionCost')) === '500')
await page.goto(BASE + '/#/product'); await page.waitForSelector('#product-title')
ok('A\'s product restored after re-login', (await page.textContent('#product-title')).trim() === titleA)

// ── 13. Redirect back to the intended page after login ─────────────────────
await page.click('#nav-logout-btn'); await page.waitForTimeout(200)
await page.goto(BASE + '/#/pricing'); await page.waitForSelector('#login-form')
await page.fill('#a-email', A.email); await page.fill('#a-password', A.password); await page.click('#login-btn')
await page.waitForSelector('#pricing-summary', { timeout: 5000 })
ok('Login returns user to the page they wanted (#/pricing)', page.url().endsWith('#/pricing'))

// ── 14. Auth pages forward to the app when already logged in ───────────────
await page.goto(BASE + '/#/login'); await page.waitForTimeout(300)
ok('#/login while logged in → #/story', page.url().endsWith('#/story'))

// ── 15. Try Demo while logged out → login → demo runs ──────────────────────
await page.click('#nav-logout-btn'); await page.waitForTimeout(200)
await page.goto(BASE + '/'); await page.click('#hero-demo-btn'); await page.waitForSelector('#login-form')
ok('Try Demo (logged out) → #/login', page.url().endsWith('#/login'))
await page.fill('#a-email', B.email); await page.fill('#a-password', B.password); await page.click('#login-btn')
await page.waitForSelector('#product-title', { timeout: 60000 })
ok('Pending demo runs right after login → #/product', page.url().endsWith('#/product'))

// ── 16. Mobile: auth screens have no horizontal overflow ───────────────────
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
const m = await mctx.newPage()
for (const p of ['/login', '/signup']) {
  await m.goto(BASE + '/#' + p); await m.waitForSelector('#a-email')
  const w = await m.evaluate(() => document.documentElement.scrollWidth)
  ok(`Mobile ${p}: no horizontal overflow`, w <= 376, `scrollWidth=${w}`)
}
await mctx.close()

// ── Console ────────────────────────────────────────────────────────────────
const real = errs.filter((e) => !/tailwindcss/.test(e))
ok('No console / page errors', real.length === 0, real.slice(0, 3).join(' | '))

await browser.close()
const passed = R.filter((r) => r.c).length
console.log(`\n${passed}/${R.length} auth checks passed`)
if (passed !== R.length) process.exit(1)
