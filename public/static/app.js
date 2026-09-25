/* ═══════════════════════════════════════════════════════════════
   SheLink — Frontend SPA
   Structure:
     • state        — single source of truth (input + result)
     • api          — thin wrappers over /api/* (modules can be swapped server-side)
     • components   — small reusable render helpers (return HTML strings)
     • views        — one function per page/section
     • router       — hash-based navigation (#/, #/story, #/product, ...)
   ═══════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────
const state = {
  input: {
    productName: '',
    description: '',
    productionCost: '',
    packagingCost: '',
    deliveryCost: '',
    timeHours: '',
    monthlyCapacity: '',
    profitMargin: 30,
  },
  result: null,
  loading: false,
  error: null,
}

const DEMO = {
  productName: 'Homemade Chocolate Cake',
  description: 'I make homemade chocolate cakes for birthdays and small events.',
  productionCost: 500,
  packagingCost: 50,
  deliveryCost: 80,
  timeHours: 3,
  monthlyCapacity: 20,
  profitMargin: 30,
}

// Persist across reloads so a refresh doesn't lose work
try {
  const saved = JSON.parse(sessionStorage.getItem('shelink') || 'null')
  if (saved) { state.input = saved.input || state.input; state.result = saved.result || null }
} catch (_) {}
function persist() { try { sessionStorage.setItem('shelink', JSON.stringify({ input: state.input, result: state.result })) } catch (_) {} }

// ── API ────────────────────────────────────────────────────────
const api = {
  generate: (input) => axios.post('/api/generate', input).then((r) => r.data),
}

// ── Steps / Routes ─────────────────────────────────────────────
const STEPS = [
  { path: '/story',         label: 'Tell Us',        icon: 'fa-comment-dots', requiresResult: false },
  { path: '/product',       label: 'Product',        icon: 'fa-box-open',     requiresResult: true },
  { path: '/pricing',       label: 'Pricing',        icon: 'fa-coins',        requiresResult: true },
  { path: '/promotion',     label: 'Promotion',      icon: 'fa-bullhorn',     requiresResult: true },
  { path: '/opportunities', label: 'Opportunities',  icon: 'fa-compass',      requiresResult: true },
]

// ── Utilities ──────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const money = (n) => `${Number(n || 0).toLocaleString('en-BD')} BDT`

function toast(msg) {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2200)
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard!') }
  catch (_) { toast('Could not copy — please select and copy manually.') }
}

function navigate(path) { location.hash = '#' + path }

// ── Components (reusable HTML fragments) ───────────────────────
const C = {
  stat: (label, value, gradient, icon) => `
    <div class="stat bg-gradient-to-br ${gradient}">
      <div class="flex items-center justify-between opacity-90 text-sm"><span>${label}</span><i class="fas ${icon}"></i></div>
      <div class="text-2xl md:text-3xl font-extrabold mt-1">${value}</div>
    </div>`,

  copyBox: (id, title, text, icon) => `
    <article class="card">
      <header class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg flex items-center gap-2"><i class="${icon} text-brand-600"></i>${title}</h3>
        <button class="btn-ghost copy-btn" data-copy="${id}"><i class="far fa-copy"></i> Copy</button>
      </header>
      <pre id="${id}" class="copy-box font-sans">${esc(text)}</pre>
    </article>`,

  list: (items, icon = 'fa-check', color = 'text-brand-600') =>
    `<ul class="space-y-2">${items.map((i) => `<li class="flex gap-2"><i class="fas ${icon} ${color} mt-1"></i><span>${esc(i)}</span></li>`).join('')}</ul>`,

  chips: (items, cls = 'chip') => `<div class="flex flex-wrap gap-2">${items.map((i) => `<span class="${cls}">${esc(i)}</span>`).join('')}</div>`,

  pageHeader: (title, subtitle, stepIndex) => `
    <header class="mb-6 fade-up">
      <p class="text-sm font-semibold text-brand-600 uppercase tracking-wide">Step ${stepIndex} of 5</p>
      <h1 class="section-title">${title}</h1>
      <p class="section-subtitle">${subtitle}</p>
    </header>`,

  stepFooter: (prev, next, nextLabel) => `
    <nav class="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
      ${prev ? `<a href="#${prev}" class="btn-secondary w-full sm:w-auto"><i class="fas fa-arrow-left"></i> Back</a>` : '<span></span>'}
      ${next ? `<a href="#${next}" class="btn-primary w-full sm:w-auto">${nextLabel} <i class="fas fa-arrow-right"></i></a>` : ''}
    </nav>`,

  field: (name, label, placeholder, unit, value, type = 'number') => `
    <div>
      <label class="label" for="f-${name}">${label}</label>
      <div class="relative">
        <input id="f-${name}" name="${name}" type="${type}" min="0" step="any" class="input ${unit ? 'pr-16' : ''}" placeholder="${placeholder}" value="${esc(value)}">
        ${unit ? `<span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">${unit}</span>` : ''}
      </div>
    </div>`,

  emptyState: () => `
    <section class="max-w-xl mx-auto px-4 py-20 text-center fade-up">
      <div class="w-20 h-20 mx-auto rounded-full bg-brand-100 text-brand-600 grid place-items-center text-3xl mb-4"><i class="fas fa-lightbulb"></i></div>
      <h2 class="text-2xl font-extrabold">Tell us your story first</h2>
      <p class="text-gray-500 mt-2">Describe what you make and we'll build your product page, price, promotion and opportunities.</p>
      <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <a href="#/story" class="btn-primary">Start Your Story</a>
        <button class="btn-secondary" id="empty-demo-btn"><i class="fas fa-magic"></i> Try Demo</button>
      </div>
    </section>`,
}

// ── Views ──────────────────────────────────────────────────────
const views = {
  landing() {
    const steps = [
      { icon: 'fa-comment-dots', title: 'Tell us what you make', text: 'Describe your product or skill in your own simple words.' },
      { icon: 'fa-box-open', title: 'Build your product', text: 'Get a professional listing with title, description and features.' },
      { icon: 'fa-coins', title: 'Understand your price', text: 'See your true cost, a fair price, and your monthly profit.' },
      { icon: 'fa-bullhorn', title: 'Promote & discover', text: 'Ready-to-post Facebook & WhatsApp content and real opportunities.' },
    ]
    return `
    <section id="hero-section" class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-100 via-white to-purple-100 -z-10"></div>
      <div class="max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-24 md:pb-24 text-center fade-up">
        <span class="chip mb-4"><i class="fas fa-sparkles mr-1"></i> For women makers & entrepreneurs</span>
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 to-plum-600 bg-clip-text text-transparent">SheLink</h1>
        <p class="mt-3 text-xl md:text-2xl font-semibold text-gray-700">Your Story. Your Skill. Your Market.</p>
        <p class="mt-5 max-w-2xl mx-auto text-gray-600 text-lg leading-relaxed">“Tell us what you make. SheLink helps you present it, price it, promote it, and find opportunities.”</p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#/story" class="btn-primary text-lg" id="hero-start-btn"><i class="fas fa-pen-nib"></i> Start Your Story</a>
          <button class="btn-secondary text-lg" id="hero-demo-btn"><i class="fas fa-magic"></i> Try Demo</button>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
      <h2 class="text-center text-2xl md:text-3xl font-extrabold mb-8">How it works</h2>
      <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${steps.map((s, i) => `
          <li class="card relative fade-up" style="animation-delay:${i * 80}ms">
            <span class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-plum-600 text-white text-sm font-bold grid place-items-center shadow">${i + 1}</span>
            <div class="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 grid place-items-center text-xl mb-3"><i class="fas ${s.icon}"></i></div>
            <h3 class="font-bold text-lg">${s.title}</h3>
            <p class="text-gray-500 text-sm mt-1">${s.text}</p>
          </li>`).join('')}
      </ol>
    </section>

    <section id="value-props" class="bg-white border-y border-brand-100">
      <div class="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div><i class="fas fa-language text-3xl text-brand-500"></i><h3 class="font-bold mt-2">Simple words in</h3><p class="text-gray-500 text-sm">No business jargon. Just say what you make.</p></div>
        <div><i class="fas fa-wand-magic-sparkles text-3xl text-plum-500"></i><h3 class="font-bold mt-2">Professional results out</h3><p class="text-gray-500 text-sm">Listing, price, posts — all ready to use.</p></div>
        <div><i class="fas fa-mobile-screen text-3xl text-brand-500"></i><h3 class="font-bold mt-2">Works on any phone</h3><p class="text-gray-500 text-sm">Designed mobile-first for busy makers.</p></div>
      </div>
    </section>`
  },

  story() {
    const i = state.input
    return `
    <section class="max-w-3xl mx-auto px-4 py-8 md:py-12">
      ${C.pageHeader('Tell Us What You Make', 'Describe your product, skill, or small business in your own words.', 1)}
      <form id="story-form" class="space-y-6 fade-up" novalidate>
        <div class="card">
          <label class="label" for="f-description">Describe your product, skill, or small business <span class="text-brand-600">*</span></label>
          <textarea id="f-description" name="description" rows="4" class="input text-lg resize-none" placeholder="e.g. I make homemade chocolate cakes for birthdays and small events." required>${esc(i.description)}</textarea>
          <p class="text-xs text-gray-400 mt-2"><i class="fas fa-info-circle"></i> Write like you'd tell a friend. Bangla-English mix is fine.</p>
          <div class="mt-4">
            <label class="label" for="f-productName">Product name <span class="text-gray-400 font-normal">(optional)</span></label>
            <input id="f-productName" name="productName" type="text" class="input" placeholder="e.g. Homemade Chocolate Cake" value="${esc(i.productName)}">
          </div>
        </div>

        <div class="card">
          <h2 class="font-bold text-lg mb-1 flex items-center gap-2"><i class="fas fa-calculator text-brand-600"></i> Your numbers</h2>
          <p class="text-sm text-gray-500 mb-4">Rough estimates are fine — we'll do the math.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${C.field('productionCost', 'Production / buying cost', '500', 'BDT', i.productionCost)}
            ${C.field('packagingCost', 'Packaging cost', '50', 'BDT', i.packagingCost)}
            ${C.field('deliveryCost', 'Delivery cost', '80', 'BDT', i.deliveryCost)}
            ${C.field('timeHours', 'Time required', '3', 'hours', i.timeHours)}
            ${C.field('monthlyCapacity', 'Monthly capacity', '20', 'units', i.monthlyCapacity)}
            ${C.field('profitMargin', 'Desired profit margin', '30', '%', i.profitMargin)}
          </div>
        </div>

        <div id="form-error" class="hidden rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"></div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button type="submit" class="btn-primary text-lg flex-1" id="generate-btn"><i class="fas fa-wand-magic-sparkles"></i> Build My Product</button>
          <button type="button" class="btn-secondary" id="story-demo-btn"><i class="fas fa-magic"></i> Fill Demo</button>
        </div>
      </form>
    </section>`
  },

  loading() {
    return `
    <section class="max-w-xl mx-auto px-4 py-24 text-center fade-up">
      <div class="spinner mx-auto mb-6"></div>
      <h2 class="text-2xl font-extrabold">Building your story…</h2>
      <p class="text-gray-500 mt-2" id="loading-msg">Creating your product listing</p>
    </section>`
  },

  product() {
    if (!state.result) return C.emptyState()
    const p = state.result.product
    return `
    <section class="max-w-4xl mx-auto px-4 py-8 md:py-12">
      ${C.pageHeader('Your Product', 'A professional listing generated from your story.', 2)}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-up">
        <article class="card lg:col-span-2">
          <span class="chip">${esc(p.category)}</span>
          <h2 class="text-3xl font-extrabold mt-3">${esc(p.title)}</h2>
          <p class="text-brand-600 font-medium mt-1 italic">${esc(p.tagline)}</p>
          <p class="mt-4 text-gray-700 leading-relaxed" id="product-description">${esc(p.description)}</p>
          <div class="mt-5 flex gap-2 flex-wrap">
            <button class="btn-ghost copy-btn" data-copy-text="${esc(p.title + '\n\n' + p.description)}"><i class="far fa-copy"></i> Copy listing</button>
          </div>
          <h3 class="font-bold mt-6 mb-2">Key features</h3>
          ${C.list(p.features)}
        </article>
        <aside class="space-y-4">
          <div class="card"><h3 class="font-bold mb-2 flex items-center gap-2"><i class="fas fa-users text-brand-600"></i> Who will buy this</h3>${C.list(p.targetCustomers, 'fa-user', 'text-plum-500')}</div>
          <div class="card"><h3 class="font-bold mb-2 flex items-center gap-2"><i class="fas fa-tags text-brand-600"></i> Keywords</h3>${C.chips(p.keywords, 'chip-gray')}</div>
          <div class="card"><h3 class="font-bold mb-2 flex items-center gap-2"><i class="fas fa-camera text-brand-600"></i> Photos to take</h3>${C.list(p.suggestedImages, 'fa-image', 'text-gray-400')}</div>
        </aside>
      </div>
      ${C.stepFooter('/story', '/pricing', 'See my price')}
    </section>`
  },

  pricing() {
    if (!state.result) return C.emptyState()
    const pr = state.result.pricing
    const c = pr.costs
    const total = c.totalCostPerUnit || 1
    const bars = [
      ['Production', c.production, 'bg-brand-500'],
      ['Packaging', c.packaging, 'bg-plum-500'],
      ['Delivery', c.delivery, 'bg-amber-400'],
      [`Your time (${c.laborRatePerHour} BDT/hr)`, c.labor, 'bg-emerald-500'],
    ]
    return `
    <section class="max-w-4xl mx-auto px-4 py-8 md:py-12">
      ${C.pageHeader('Pricing & Profit', 'Know your true cost and charge what you deserve.', 3)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 fade-up">
        ${C.stat('Cost per unit', money(c.totalCostPerUnit), 'from-gray-600 to-gray-800', 'fa-receipt')}
        ${C.stat('Recommended price', money(pr.recommendedPrice), 'from-brand-500 to-brand-700', 'fa-tag')}
        ${C.stat('Profit per unit', money(pr.profitPerUnit), 'from-emerald-500 to-emerald-700', 'fa-arrow-trend-up')}
        ${C.stat('Monthly profit', money(pr.monthly.profit), 'from-plum-500 to-plum-700', 'fa-calendar-check')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 fade-up">
        <article class="card">
          <h3 class="font-bold text-lg mb-4"><i class="fas fa-chart-pie text-brand-600 mr-2"></i>Where your cost goes</h3>
          <div class="h-4 w-full rounded-full overflow-hidden flex bg-gray-100">
            ${bars.map(([, v, cls]) => `<div class="${cls}" style="width:${(v / total) * 100}%"></div>`).join('')}
          </div>
          <ul class="mt-4 space-y-2 text-sm">
            ${bars.map(([l, v, cls]) => `<li class="flex items-center justify-between"><span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${cls}"></span>${l}</span><strong>${money(v)}</strong></li>`).join('')}
            <li class="flex items-center justify-between border-t pt-2 mt-2 font-bold"><span>Total per unit</span><span>${money(c.totalCostPerUnit)}</span></li>
          </ul>
        </article>

        <article class="card">
          <h3 class="font-bold text-lg mb-4"><i class="fas fa-layer-group text-brand-600 mr-2"></i>Price options</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between rounded-xl border border-gray-200 p-3"><div><p class="font-semibold">Minimum (safety floor)</p><p class="text-xs text-gray-500">Never go below this</p></div><span class="text-xl font-extrabold text-gray-700">${money(pr.minimumPrice)}</span></div>
            <div class="flex items-center justify-between rounded-xl border-2 border-brand-400 bg-brand-50 p-3"><div><p class="font-semibold text-brand-700">Recommended <span class="chip ml-1">${pr.profitMarginPercent}% margin</span></p><p class="text-xs text-gray-500">Fair to you and your customer</p></div><span class="text-xl font-extrabold text-brand-700">${money(pr.recommendedPrice)}</span></div>
            <div class="flex items-center justify-between rounded-xl border border-gray-200 p-3"><div><p class="font-semibold">Premium</p><p class="text-xs text-gray-500">Custom / gift version</p></div><span class="text-xl font-extrabold text-plum-600">${money(pr.premiumPrice)}</span></div>
          </div>
        </article>

        <article class="card">
          <h3 class="font-bold text-lg mb-4"><i class="fas fa-calendar text-brand-600 mr-2"></i>Monthly outlook (${pr.monthly.capacity} units)</h3>
          <ul class="space-y-2 text-sm">
            <li class="flex justify-between"><span>Revenue</span><strong>${money(pr.monthly.revenue)}</strong></li>
            <li class="flex justify-between"><span>Total cost</span><strong>${money(pr.monthly.totalCost)}</strong></li>
            <li class="flex justify-between text-emerald-700 border-t pt-2 font-bold"><span>Profit</span><span>${money(pr.monthly.profit)}</span></li>
            <li class="flex justify-between text-gray-500 pt-1"><span>Break-even</span><span>${pr.breakEvenUnits} units</span></li>
          </ul>
        </article>

        <article class="card">
          <h3 class="font-bold text-lg mb-3"><i class="fas fa-lightbulb text-amber-500 mr-2"></i>Smart tips</h3>
          ${C.list(pr.tips, 'fa-star', 'text-amber-500')}
        </article>
      </div>
      ${C.stepFooter('/product', '/promotion', 'Promote it')}
    </section>`
  },

  promotion() {
    if (!state.result) return C.emptyState()
    const pm = state.result.promotion
    const wa = `https://wa.me/?text=${encodeURIComponent(pm.whatsappMessage)}`
    return `
    <section class="max-w-4xl mx-auto px-4 py-8 md:py-12">
      ${C.pageHeader('Promotion', 'Ready-to-post content for Facebook and WhatsApp.', 4)}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-up">
        ${C.copyBox('fb-post', 'Facebook post', pm.facebookPost, 'fab fa-facebook')}
        <div class="space-y-6">
          ${C.copyBox('wa-msg', 'WhatsApp message', pm.whatsappMessage, 'fab fa-whatsapp')}
          <a href="${wa}" target="_blank" rel="noopener" class="btn-primary w-full bg-gradient-to-r from-emerald-500 to-emerald-600"><i class="fab fa-whatsapp text-xl"></i> Share via WhatsApp</a>
        </div>
        ${C.copyBox('short-cap', 'Short caption (Instagram / story)', pm.shortCaption, 'fas fa-quote-left')}
        <article class="card">
          <h3 class="font-bold text-lg mb-3 flex items-center gap-2"><i class="fas fa-hashtag text-brand-600"></i>Hashtags</h3>
          ${C.chips(pm.hashtags)}
          <button class="btn-ghost copy-btn mt-3" data-copy-text="${esc(pm.hashtags.join(' '))}"><i class="far fa-copy"></i> Copy all</button>
          <h3 class="font-bold mt-5 mb-1">Call to action</h3>
          <p class="text-gray-700">${esc(pm.callToAction)}</p>
        </article>
      </div>
      ${C.stepFooter('/pricing', '/opportunities', 'Find opportunities')}
    </section>`
  },

  opportunities() {
    if (!state.result) return C.emptyState()
    const ops = state.result.opportunities
    const typeStyle = {
      training: ['fa-graduation-cap', 'bg-blue-100 text-blue-700'],
      grant: ['fa-hand-holding-dollar', 'bg-emerald-100 text-emerald-700'],
      market: ['fa-store', 'bg-amber-100 text-amber-700'],
      platform: ['fa-shop', 'bg-plum-500/10 text-plum-600'],
      community: ['fa-people-group', 'bg-brand-100 text-brand-700'],
      event: ['fa-calendar-star', 'bg-rose-100 text-rose-700'],
    }
    return `
    <section class="max-w-4xl mx-auto px-4 py-8 md:py-12">
      ${C.pageHeader('Opportunities', 'Programs, platforms and communities matched to your business.', 5)}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up">
        ${ops.map((o) => {
          const [icon, cls] = typeStyle[o.type] || ['fa-star', 'bg-gray-100 text-gray-700']
          return `
          <article class="card flex flex-col">
            <header class="flex items-start justify-between gap-3">
              <span class="inline-flex items-center gap-1 rounded-full ${cls} text-xs font-semibold px-3 py-1 capitalize"><i class="fas ${icon}"></i> ${o.type}</span>
              <span class="text-xs font-bold text-brand-700 bg-brand-50 rounded-full px-2 py-1"><i class="fas fa-bolt"></i> ${o.matchScore}% match</span>
            </header>
            <h3 class="font-bold text-lg mt-3">${esc(o.title)}</h3>
            <p class="text-sm text-gray-500">${esc(o.organization)}</p>
            <p class="text-sm text-gray-700 mt-2 flex-1">${esc(o.description)}</p>
            <p class="text-xs text-brand-700 mt-3"><i class="fas fa-check-circle"></i> ${esc(o.matchReason)}</p>
            <footer class="mt-3 flex items-center justify-between gap-2 flex-wrap">
              ${C.chips(o.tags, 'chip-gray')}
              ${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener" class="btn-ghost text-brand-700">Visit <i class="fas fa-arrow-up-right-from-square"></i></a>` : ''}
            </footer>
          </article>`
        }).join('')}
      </div>

      <section class="card mt-8 text-center bg-gradient-to-br from-brand-50 to-purple-50 fade-up">
        <h3 class="text-xl font-extrabold">🎉 Your story is ready!</h3>
        <p class="text-gray-600 mt-1">You now have a product listing, a fair price, promotion content and real opportunities.</p>
        <div class="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#/story" class="btn-secondary"><i class="fas fa-rotate"></i> Try another product</a>
          <button class="btn-primary" id="export-btn"><i class="fas fa-download"></i> Download summary</button>
        </div>
      </section>
      ${C.stepFooter('/promotion', null)}
    </section>`
  },
}

// ── Actions ────────────────────────────────────────────────────
function readForm(form) {
  const fd = new FormData(form)
  const obj = {}
  for (const [k, v] of fd.entries()) obj[k] = v
  return obj
}

async function generate(input) {
  state.input = { ...state.input, ...input }
  state.loading = true
  state.error = null
  render(views.loading())
  const msgs = ['Creating your product listing', 'Calculating a fair price', 'Writing your promotion', 'Matching opportunities']
  let i = 0
  const tick = setInterval(() => { const el = $('#loading-msg'); if (el) el.textContent = msgs[++i % msgs.length] }, 600)
  try {
    const result = await api.generate(input)
    state.result = result
    persist()
    navigate('/product')
  } catch (e) {
    state.error = e?.response?.data?.error || 'Something went wrong. Please try again.'
    navigate('/story')
    setTimeout(() => showFormError(state.error), 0)
  } finally {
    clearInterval(tick)
    state.loading = false
  }
}

function showFormError(msg) {
  const el = $('#form-error')
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
}

function runDemo() {
  state.input = { ...DEMO }
  generate({ ...DEMO })
}

function fillDemo() {
  state.input = { ...DEMO }
  render(views.story())
  toast('Demo values filled — click "Build My Product"')
}

function exportSummary() {
  const r = state.result
  if (!r) return
  const lines = [
    `SheLink Summary — ${r.product.title}`,
    `Generated: ${new Date(r.generatedAt).toLocaleString()}`,
    '',
    '== PRODUCT ==', r.product.title, r.product.tagline, '', r.product.description, '',
    'Features:', ...r.product.features.map((f) => ` - ${f}`), '',
    '== PRICING ==',
    `Cost per unit: ${r.pricing.costs.totalCostPerUnit} BDT`,
    `Recommended price: ${r.pricing.recommendedPrice} BDT`,
    `Profit per unit: ${r.pricing.profitPerUnit} BDT`,
    `Monthly profit (${r.pricing.monthly.capacity} units): ${r.pricing.monthly.profit} BDT`, '',
    '== FACEBOOK POST ==', r.promotion.facebookPost, '',
    '== WHATSAPP MESSAGE ==', r.promotion.whatsappMessage, '',
    '== OPPORTUNITIES ==', ...r.opportunities.map((o) => ` - ${o.title} (${o.organization})${o.url ? ' — ' + o.url : ''}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `shelink-${r.product.title.toLowerCase().replace(/\s+/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Router & Render ────────────────────────────────────────────
function currentPath() {
  const h = location.hash.replace(/^#/, '') || '/'
  return h.startsWith('/') ? h : '/' + h
}

function renderNav() {
  const path = currentPath()
  const html = STEPS.map((s) => {
    const disabled = s.requiresResult && !state.result
    return `<li><a href="#${s.path}" class="step-link ${path === s.path ? 'active' : ''} ${disabled ? 'disabled' : ''}"><i class="fas ${s.icon} mr-1"></i>${s.label}</a></li>`
  }).join('')
  $('#step-nav').innerHTML = html
  $('#step-nav-mobile').innerHTML = path === '/' ? '' : html
}

function render(html) {
  $('#app').innerHTML = html
  renderNav()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function route() {
  if (state.loading) return
  const path = currentPath()
  const map = { '/': views.landing, '/story': views.story, '/product': views.product, '/pricing': views.pricing, '/promotion': views.promotion, '/opportunities': views.opportunities }
  const view = map[path] || views.landing
  render(view())
}

// ── Global event delegation ────────────────────────────────────
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a')
  if (!t) return
  if (t.id === 'hero-demo-btn' || t.id === 'empty-demo-btn') { e.preventDefault(); runDemo() }
  if (t.id === 'story-demo-btn') { e.preventDefault(); fillDemo() }
  if (t.id === 'export-btn') { e.preventDefault(); exportSummary() }
  if (t.classList.contains('copy-btn')) {
    e.preventDefault()
    const text = t.dataset.copyText ?? (t.dataset.copy ? $('#' + t.dataset.copy)?.textContent : '')
    copyText(text || '')
  }
})

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'story-form') return
  e.preventDefault()
  const data = readForm(e.target)
  if (!data.description || data.description.trim().length < 5) {
    showFormError('Please describe your product or skill first.')
    $('#f-description')?.focus()
    return
  }
  generate(data)
})

// Keep state.input in sync while typing (so navigation back keeps values)
document.addEventListener('input', (e) => {
  const el = e.target
  if (el.closest && el.closest('#story-form') && el.name) state.input[el.name] = el.value
})

window.addEventListener('hashchange', route)
route()
