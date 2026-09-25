/* ═══════════════════════════════════════════════════════════════
   Herizon — Frontend SPA
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
    hourlyLaborRate: '',
    businessGoal: '',
    location: '',
  },
  result: null,
  loading: false,
  error: null,
  busy: { product: false, promotion: null },   // promotion: null | 'facebook' | 'whatsapp' | 'all'
  editingProduct: false,
  aiError: { product: null, promotion: null },
  seed: 0,
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
  businessGoal: 'find_buyers',
  location: 'Dhaka',
}

// Persist across reloads so a refresh doesn't lose work
try {
  const saved = JSON.parse(sessionStorage.getItem('herizon') || 'null')
  if (saved) { state.input = saved.input || state.input; state.result = saved.result || null }
} catch (_) {}
function persist() { try { sessionStorage.setItem('herizon', JSON.stringify({ input: state.input, result: state.result })) } catch (_) {} }

// ── API ────────────────────────────────────────────────────────
const AI_FAIL_MSG = "Herizon couldn't generate this right now. Please try again."
const api = {
  generate: (input) => axios.post('/api/generate', input).then((r) => r.data),
  /** Fresh AI product listing (strict — surfaces failure instead of a template) */
  regenerateProduct: (input, seed) => axios.post('/api/product', { ...input, regenerate: true, seed }).then((r) => r.data),
  /** Promotion for the current (possibly edited) product. channel: 'facebook' | 'whatsapp' | undefined (= both) */
  promotion: (input, product, opts = {}) => axios.post('/api/promotion', { ...input, product, ...opts }).then((r) => r.data),
  /** Re-match opportunities for the current (possibly edited) product */
  opportunities: (input, product) => axios.post('/api/opportunities', { ...input, product }).then((r) => r.data),
}

// ── Business goals (Opportunity matching) ──────────────────────
const GOAL_LABELS = {
  find_buyers: 'Find buyers / customers',
  sell_online: 'Sell online (Facebook, WhatsApp)',
  find_suppliers: 'Find cheaper suppliers / materials',
  learn_skills: 'Learn new business skills',
  get_mentor: 'Get a mentor',
  grow_network: 'Meet other women entrepreneurs',
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
/** Bangladeshi taka formatting: ৳5,400 or ৳899.50 */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const taka = (n) => `৳${fmt(n)}`

function toast(msg) {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2200)
}

async function copyText(text, btn) {
  let ok = false
  try { await navigator.clipboard.writeText(text); ok = true }
  catch (_) {
    // Fallback for browsers without async clipboard (or non-secure contexts)
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta)
    } catch (_) { ok = false }
  }
  if (!ok) { toast('Could not copy — please select and copy manually.'); return }
  toast('Copied!')
  if (btn) {
    const original = btn.innerHTML
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!'
    btn.classList.add('text-emerald-700', 'bg-emerald-50')
    btn.disabled = true
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('text-emerald-700', 'bg-emerald-50'); btn.disabled = false }, 1800)
  }
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

  aiLoading: (msg, stepIndex, title) => `
    <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${C.pageHeader(title, '', stepIndex)}
      <div class="card flex flex-col items-center justify-center text-center py-16 fade-up">
        <div class="spinner mb-5"></div>
        <p class="text-lg font-semibold text-gray-800">${msg}</p>
        <p class="text-sm text-gray-500 mt-1">This usually takes a few seconds.</p>
      </div>
    </section>`,

  aiError: (key) => state.aiError[key] ? `
    <div class="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-start gap-2 fade-up" role="alert">
      <i class="fas fa-triangle-exclamation mt-0.5"></i><span>${esc(state.aiError[key])}</span>
    </div>` : '',

  sourceBadge: (source) => `<span class="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${source === 'ai' ? 'bg-plum-500/10 text-plum-600' : 'bg-sand-100 text-gray-500'}" title="${source === 'ai' ? 'Written by Herizon AI from your description' : 'Template text (AI unavailable)'}"><i class="fas ${source === 'ai' ? 'fa-wand-magic-sparkles' : 'fa-file-lines'} mr-1"></i>${source === 'ai' ? 'AI generated' : 'Template'}</span>`,

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
    const stories = [
      { img: 'baking', label: 'Home baking', name: 'Cakes for every celebration' },
      { img: 'tailoring', label: 'Tailoring', name: 'Custom stitching & alterations' },
      { img: 'handicrafts', label: 'Handicrafts', name: 'Nakshi kantha & handmade crafts' },
      { img: 'food', label: 'Food production', name: 'Homemade pickles & spice blends' },
      { img: 'shop', label: 'Small local business', name: 'Neighbourhood shops & products' },
    ]
    return `
    <!-- HERO: desktop = text left / photo right; mobile = stacked -->
    <section id="hero-section" class="relative overflow-hidden bg-gradient-to-br from-sand-50 via-white to-brand-50">
      <div class="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-12 lg:pt-20 lg:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div class="lg:col-span-6 fade-up">
          <span class="chip mb-4"><i class="fas fa-hands-holding-circle mr-1"></i> Built for women makers & entrepreneurs</span>
          <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] text-gray-900">
            Your Story.<br><span class="text-brand-600">Your Skill.</span><br>Your Market.
          </h1>
          <p class="mt-6 max-w-xl text-lg lg:text-xl text-gray-600 leading-relaxed">
            “Tell us what you make. Herizon helps you present it, price it, promote it, and find opportunities.”
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="#/story" class="btn-primary text-lg px-8" id="hero-start-btn"><i class="fas fa-pen-nib"></i> Start Your Story</a>
            <button class="btn-secondary text-lg px-8" id="hero-demo-btn"><i class="fas fa-play"></i> Try Demo</button>
          </div>
          <dl class="mt-10 grid grid-cols-3 gap-4 max-w-md text-center sm:text-left">
            <div><dt class="text-2xl lg:text-3xl font-extrabold text-gray-900">2 min</dt><dd class="text-xs lg:text-sm text-gray-500">to a full listing</dd></div>
            <div><dt class="text-2xl lg:text-3xl font-extrabold text-gray-900">0 BDT</dt><dd class="text-xs lg:text-sm text-gray-500">free to use</dd></div>
            <div><dt class="text-2xl lg:text-3xl font-extrabold text-gray-900">4 in 1</dt><dd class="text-xs lg:text-sm text-gray-500">listing · price · promo · opportunities</dd></div>
          </dl>
        </div>

        <figure class="lg:col-span-6 relative fade-up" style="animation-delay:120ms">
          <div class="photo-card group aspect-[4/3] lg:aspect-[5/4]">
            <img src="/static/img/baking.jpg" alt="A smiling middle-aged woman decorating a homemade chocolate cake in her home kitchen" loading="eager" fetchpriority="high">
            <figcaption class="photo-caption">
              <p class="text-xs uppercase tracking-wider opacity-80">Home baker · Dhaka</p>
              <p class="font-semibold">“I used to guess my price. Now I know exactly what my cakes are worth.”</p>
            </figcaption>
          </div>
          <div class="hidden md:block absolute -bottom-6 -left-6 lg:-left-10 w-40 lg:w-52 photo-card group aspect-[4/3] ring-4 ring-white">
            <img src="/static/img/tailoring.jpg" alt="An older woman working at a sewing machine in her tailoring shop" loading="lazy">
          </div>
          <div class="hidden md:flex absolute -top-5 -right-3 lg:-right-6 items-center gap-3 bg-white rounded-2xl shadow-lg px-4 py-3 border border-sand-200">
            <span class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center"><i class="fas fa-arrow-trend-up"></i></span>
            <div><p class="text-xs text-gray-500">Recommended price</p><p class="font-extrabold text-gray-900">৳900</p></div>
          </div>
        </figure>
      </div>
    </section>

    <!-- WHO WE SERVE: photo strip -->
    <section id="who-we-serve" class="max-w-7xl mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <header class="max-w-2xl mb-8 lg:mb-10">
        <p class="text-sm font-semibold text-brand-600 uppercase tracking-wide">Who Herizon is for</p>
        <h2 class="section-title mt-1">Real women. Real skills. Real businesses.</h2>
        <p class="section-subtitle">Whether you bake, stitch, craft, cook or run a small shop — if you make something, you have a market.</p>
      </header>
      <ul class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
        ${stories.map((s, i) => `
          <li class="photo-card group aspect-[3/4] fade-up ${i === 4 ? 'col-span-2 md:col-span-1' : ''}" style="animation-delay:${i * 70}ms">
            <img src="/static/img/${s.img}.jpg" alt="${s.label} — ${s.name}" loading="lazy">
            <div class="photo-caption">
              <p class="text-xs uppercase tracking-wider opacity-80">${s.label}</p>
              <p class="font-semibold text-sm lg:text-base leading-snug">${s.name}</p>
            </div>
          </li>`).join('')}
      </ul>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how-it-works" class="bg-white border-y border-sand-200">
      <div class="max-w-7xl mx-auto px-4 lg:px-8 py-14 lg:py-20">
        <header class="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <p class="text-sm font-semibold text-brand-600 uppercase tracking-wide">How it works</p>
          <h2 class="section-title mt-1">From your words to your market in four steps</h2>
        </header>
        <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          ${steps.map((s, i) => `
            <li class="card relative fade-up hover:shadow-md transition" style="animation-delay:${i * 80}ms">
              <span class="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-brand-600 text-white text-sm font-bold grid place-items-center shadow">${i + 1}</span>
              <div class="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 grid place-items-center text-xl mb-4"><i class="fas ${s.icon}"></i></div>
              <h3 class="font-bold text-lg">${s.title}</h3>
              <p class="text-gray-500 text-sm mt-1 leading-relaxed">${s.text}</p>
            </li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- COMMUNITY / TRUST -->
    <section id="community-section" class="max-w-7xl mx-auto px-4 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      <div class="photo-card group aspect-[4/3] order-2 lg:order-1">
        <img src="/static/img/food.jpg" alt="Two women preparing jars of homemade pickles together" loading="lazy">
      </div>
      <div class="order-1 lg:order-2">
        <p class="text-sm font-semibold text-brand-600 uppercase tracking-wide">Community-focused</p>
        <h2 class="section-title mt-1">You already have the skill. We help with the business side.</h2>
        <ul class="mt-6 space-y-4">
          ${[
            ['fa-language', 'Simple words in', 'No business jargon. Bangla-English mix is fine — just say what you make.'],
            ['fa-wand-magic-sparkles', 'Professional results out', 'A listing, a fair price, ready-to-post promotions and matched opportunities.'],
            ['fa-shield-heart', 'Trustworthy guidance', 'Transparent cost breakdowns — you always see how a number was calculated.'],
            ['fa-mobile-screen', 'Works on any device', 'Designed for the desktop browser and fully responsive on tablets and phones.'],
          ].map(([icon, t, d]) => `
            <li class="flex gap-4">
              <span class="shrink-0 w-11 h-11 rounded-xl bg-white border border-sand-200 shadow-sm text-brand-600 grid place-items-center text-lg"><i class="fas ${icon}"></i></span>
              <div><h3 class="font-bold">${t}</h3><p class="text-gray-500 text-sm">${d}</p></div>
            </li>`).join('')}
        </ul>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section id="cta-section" class="max-w-7xl mx-auto px-4 lg:px-8 pb-16 lg:pb-24">
      <div class="relative overflow-hidden rounded-3xl bg-plum-600 text-white px-6 py-12 lg:px-16 lg:py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div class="lg:col-span-2">
          <h2 class="font-display text-3xl lg:text-4xl font-bold">Ready to tell your story?</h2>
          <p class="mt-3 text-white/80 text-lg max-w-xl">It takes two minutes. You'll walk away with a product page, a price you can defend, and posts you can share today.</p>
        </div>
        <div class="flex flex-col sm:flex-row lg:flex-col gap-3 lg:justify-self-end">
          <a href="#/story" class="btn-primary bg-white text-plum-700 hover:bg-sand-100 text-lg px-8" id="cta-start-btn"><i class="fas fa-pen-nib"></i> Start Your Story</a>
          <button class="btn-secondary bg-transparent text-white border-white/40 hover:bg-white/10 hover:border-white text-lg px-8" id="cta-demo-btn"><i class="fas fa-play"></i> Try Demo</button>
        </div>
      </div>
    </section>`
  },

  story() {
    const i = state.input
    return `
    <section class="max-w-4xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${C.pageHeader('Tell Us What You Make', 'Describe your product, skill, or small business in your own words.', 1)}
      <form id="story-form" class="grid grid-cols-1 lg:grid-cols-5 gap-6 fade-up" novalidate>
        <div class="card lg:col-span-3">
          <label class="label" for="f-description">Describe your product, skill, or small business <span class="text-brand-600">*</span></label>
          <textarea id="f-description" name="description" rows="6" class="input text-lg resize-none" placeholder="e.g. I make homemade chocolate cakes for birthdays and small events." required>${esc(i.description)}</textarea>
          <p class="text-xs text-gray-400 mt-2"><i class="fas fa-info-circle"></i> Write like you'd tell a friend. Bangla-English mix is fine.</p>
          <div class="mt-4">
            <label class="label" for="f-productName">Product name <span class="text-gray-400 font-normal">(optional)</span></label>
            <input id="f-productName" name="productName" type="text" class="input" placeholder="e.g. Homemade Chocolate Cake" value="${esc(i.productName)}">
          </div>
        </div>

        <div class="card lg:col-span-2">
          <h2 class="font-bold text-lg mb-1 flex items-center gap-2"><i class="fas fa-calculator text-brand-600"></i> Your numbers</h2>
          <p class="text-sm text-gray-500 mb-4">Rough estimates are fine — we'll do the math.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            ${C.field('productionCost', 'Production / buying cost', '500', 'BDT', i.productionCost)}
            ${C.field('packagingCost', 'Packaging cost', '50', 'BDT', i.packagingCost)}
            ${C.field('deliveryCost', 'Delivery cost', '80', 'BDT', i.deliveryCost)}
            ${C.field('timeHours', 'Time required', '3', 'hours', i.timeHours)}
            ${C.field('monthlyCapacity', 'Monthly capacity', '20', 'units', i.monthlyCapacity)}
            ${C.field('profitMargin', 'Desired profit margin (of selling price)', '30', '%', i.profitMargin)}
          </div>
          <details class="mt-4 group">
            <summary class="text-sm font-semibold text-brand-700 cursor-pointer select-none"><i class="fas fa-plus-circle mr-1 group-open:hidden"></i><i class="fas fa-minus-circle mr-1 hidden group-open:inline"></i>Include my time in the cost (optional)</summary>
            <div class="mt-3">
              ${C.field('hourlyLaborRate', 'Hourly labor rate', 'e.g. 60', 'BDT / hour', i.hourlyLaborRate || '')}
              <p class="text-xs text-gray-400 mt-1">Leave blank to keep your time out of the price. Only used together with “Time required”.</p>
            </div>
          </details>
          <div id="field-errors" class="hidden mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"></div>
        </div>

        <div class="card lg:col-span-5">
          <h2 class="font-bold text-lg mb-1 flex items-center gap-2"><i class="fas fa-compass text-brand-600"></i> What would help you most right now? <span class="text-gray-400 text-sm font-normal">(optional — used to match opportunities)</span></h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label class="label" for="f-businessGoal">My main goal</label>
              <select id="f-businessGoal" name="businessGoal" class="input">
                <option value="">Not sure yet</option>
                ${Object.entries(GOAL_LABELS).map(([v, l]) => `<option value="${v}" ${i.businessGoal === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label" for="f-location">My area / region</label>
              <input id="f-location" name="location" type="text" class="input" placeholder="e.g. Dhaka" maxlength="60" value="${esc(i.location)}">
            </div>
          </div>
        </div>

        <div id="form-error" class="lg:col-span-5 hidden rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"></div>

        <div class="lg:col-span-5 flex flex-col sm:flex-row gap-3">
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
      <p class="text-gray-500 mt-2" id="loading-msg">Herizon is preparing your product…</p>
    </section>`
  },

  product() {
    if (!state.result) return C.emptyState()
    const p = state.result.product
    const busy = state.busy.product
    const editing = state.editingProduct

    if (busy) return C.aiLoading('Herizon is preparing your product…', 2, 'Your Product')

    const body = editing
      ? `
        <form id="product-edit-form" class="space-y-4">
          <div>
            <label class="label" for="pe-title">Product name</label>
            <input id="pe-title" name="title" class="input font-bold text-xl" value="${esc(p.title)}" maxlength="80" required>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="label" for="pe-category">Category</label><input id="pe-category" name="category" class="input" value="${esc(p.category)}" maxlength="80"></div>
            <div><label class="label" for="pe-tagline">Tagline</label><input id="pe-tagline" name="tagline" class="input" value="${esc(p.tagline)}" maxlength="120"></div>
          </div>
          <div>
            <label class="label" for="pe-description">Short professional description</label>
            <textarea id="pe-description" name="description" rows="4" class="input resize-none" maxlength="600" required>${esc(p.description)}</textarea>
            <p class="text-xs text-gray-400 mt-1">Tip: keep it honest — only include facts that are true about your product.</p>
          </div>
          <div>
            <label class="label" for="pe-features">Key features <span class="text-gray-400 font-normal">(one per line)</span></label>
            <textarea id="pe-features" name="features" rows="4" class="input resize-none">${esc(p.features.join('\n'))}</textarea>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" class="btn-primary" id="product-save-btn"><i class="fas fa-check"></i> Save changes</button>
            <button type="button" class="btn-secondary" id="product-cancel-btn">Cancel</button>
          </div>
        </form>`
      : `
        <span class="chip">${esc(p.category)}</span>
        <h2 class="text-3xl font-extrabold mt-3" id="product-title">${esc(p.title)}</h2>
        <p class="text-brand-600 font-medium mt-1 italic">${esc(p.tagline)}</p>
        <p class="mt-4 text-gray-700 leading-relaxed" id="product-description">${esc(p.description)}</p>
        <div class="mt-5 flex gap-2 flex-wrap">
          <button class="btn-ghost copy-btn" data-copy-text="${esc(p.title + '\n\n' + p.description)}"><i class="far fa-copy"></i> Copy listing</button>
          <button class="btn-ghost" id="product-edit-btn"><i class="fas fa-pen"></i> Edit</button>
          <button class="btn-ghost" id="product-regen-btn"><i class="fas fa-rotate"></i> Regenerate</button>
        </div>
        <h3 class="font-bold mt-6 mb-2">Key features</h3>
        ${C.list(p.features)}`

    return `
    <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${C.pageHeader('Your Product', 'A professional listing generated from your story. Edit anything you like.', 2)}
      ${C.aiError('product')}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-up">
        <article class="card lg:col-span-2 relative">
          ${C.sourceBadge(p.source)}
          ${body}
        </article>
        <aside class="space-y-4">
          <div class="card"><h3 class="font-bold mb-2 flex items-center gap-2"><i class="fas fa-users text-brand-600"></i> Who might buy this</h3>${C.list(p.targetCustomers, 'fa-user', 'text-plum-500')}</div>
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
    const header = C.pageHeader('Pricing & Profit', 'Deterministic Cost → Price → Profit → Monthly Profit. No guesswork.', 3)

    // ── Invalid input: show issues instead of numbers ──
    if (!pr.valid) {
      return `
      <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
        ${header}
        <article class="card border-red-200 bg-red-50 fade-up">
          <h3 class="font-bold text-lg text-red-700 flex items-center gap-2"><i class="fas fa-triangle-exclamation"></i> We can't calculate a price yet</h3>
          <ul class="mt-3 space-y-1 text-sm text-red-700">${pr.issues.map((i) => `<li><i class="fas fa-circle-xmark mr-1"></i>${esc(i.message)}</li>`).join('')}</ul>
          <a href="#/story" class="btn-primary mt-5"><i class="fas fa-pen"></i> Fix my numbers</a>
        </article>
      </section>`
    }

    const total = c.totalCostPerUnit || 1
    const bars = [
      ['Production / buying', c.production, 'bg-brand-500'],
      ['Packaging', c.packaging, 'bg-plum-500'],
      ['Delivery', c.delivery, 'bg-amber-400'],
    ]
    if (c.laborIncluded) bars.push([`Your time (${c.timeHours} h × ${taka(c.hourlyLaborRate)}/h)`, c.labor, 'bg-emerald-500'])

    return `
    <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${header}

      <!-- Required display: Total Cost · Recommended Selling Price · Profit Per Unit · Profit Margin · Estimated Monthly Profit -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 fade-up" id="pricing-summary">
        ${C.stat('Total cost', taka(c.totalCostPerUnit), 'from-gray-600 to-gray-800', 'fa-receipt')}
        ${C.stat('Recommended selling price', taka(pr.recommendedPrice), 'from-brand-500 to-brand-700', 'fa-tag')}
        ${C.stat('Profit per unit', taka(pr.profitPerUnit), 'from-emerald-500 to-emerald-700', 'fa-arrow-trend-up')}
        ${C.stat('Profit margin', `${fmt(pr.profitMarginPercent)}%`, 'from-sky-500 to-sky-700', 'fa-percent')}
        ${C.stat('Est. monthly profit', taka(pr.monthly.profit), 'from-plum-500 to-plum-700', 'fa-calendar-check')}
      </div>

      <!-- Selling-price comparison -->
      <article class="card mt-6 fade-up" id="price-comparison">
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 class="font-bold text-lg"><i class="fas fa-scale-balanced text-brand-600 mr-2"></i>Selling-price comparison</h3>
          <p class="text-xs text-gray-500">Based on ${pr.monthly.capacity} units / month · cost ${taka(c.totalCostPerUnit)} per unit</p>
        </header>
        <div class="overflow-x-auto -mx-5 md:mx-0">
          <table class="w-full text-sm min-w-[520px]">
            <thead>
              <tr class="text-left text-gray-500 border-b border-sand-200">
                <th class="py-2 px-5 md:px-3 font-semibold">Selling price</th>
                <th class="py-2 px-3 font-semibold">Profit / unit</th>
                <th class="py-2 px-3 font-semibold">Margin</th>
                <th class="py-2 px-3 font-semibold">Monthly profit</th>
                <th class="py-2 px-5 md:px-3"></th>
              </tr>
            </thead>
            <tbody>
              ${pr.comparison.map((s) => `
                <tr class="${s.recommended ? 'bg-brand-50 font-bold text-brand-800' : 'text-gray-700'} border-b border-sand-100 last:border-0">
                  <td class="py-3 px-5 md:px-3 text-lg">${taka(s.price)}</td>
                  <td class="py-3 px-3">${taka(s.profitPerUnit)}</td>
                  <td class="py-3 px-3">${fmt(s.marginPercent)}%</td>
                  <td class="py-3 px-3">${taka(s.monthlyProfit)}</td>
                  <td class="py-3 px-5 md:px-3 text-right">${s.recommended ? '<span class="chip"><i class="fas fa-star mr-1"></i>Recommended</span>' : ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </article>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 fade-up">
        <!-- Cost breakdown -->
        <article class="card">
          <h3 class="font-bold text-lg mb-4"><i class="fas fa-chart-pie text-brand-600 mr-2"></i>Where your cost goes</h3>
          <div class="h-4 w-full rounded-full overflow-hidden flex bg-gray-100">
            ${bars.map(([, v, cls]) => `<div class="${cls}" style="width:${(v / total) * 100}%"></div>`).join('')}
          </div>
          <ul class="mt-4 space-y-2 text-sm">
            ${bars.map(([l, v, cls]) => `<li class="flex items-center justify-between gap-2"><span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${cls} shrink-0"></span>${l}</span><strong>${taka(v)}</strong></li>`).join('')}
            <li class="flex items-center justify-between border-t pt-2 mt-2 font-bold"><span>Total cost per unit</span><span>${taka(c.totalCostPerUnit)}</span></li>
          </ul>
          ${!c.laborIncluded && c.timeHours > 0 ? `<p class="mt-3 text-xs text-gray-500 bg-sand-50 rounded-lg p-2"><i class="fas fa-clock mr-1"></i>Your ${c.timeHours} h of work per unit is <strong>not</strong> included in cost. Add an hourly rate in “Tell Us” to include it.</p>` : ''}
        </article>

        <!-- How we calculated -->
        <article class="card">
          <h3 class="font-bold text-lg mb-4"><i class="fas fa-calculator text-brand-600 mr-2"></i>How we calculated</h3>
          <ol class="space-y-3 text-sm">
            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold grid place-items-center shrink-0">1</span><div><p class="text-gray-500">Total cost</p><p class="font-mono">${fmt(c.production)} + ${fmt(c.packaging)} + ${fmt(c.delivery)}${c.laborIncluded ? ` + ${fmt(c.labor)}` : ''} = <strong>${fmt(c.totalCostPerUnit)}</strong></p></div></li>
            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold grid place-items-center shrink-0">2</span><div><p class="text-gray-500">Selling price (margin ${fmt(pr.targetMarginPercent)}% of price)</p><p class="font-mono">${fmt(c.totalCostPerUnit)} ÷ (1 − ${fmt(pr.targetMarginPercent / 100)}) = <strong>${fmt(pr.recommendedPrice)}</strong></p></div></li>
            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold grid place-items-center shrink-0">3</span><div><p class="text-gray-500">Profit per unit</p><p class="font-mono">${fmt(pr.recommendedPrice)} − ${fmt(c.totalCostPerUnit)} = <strong>${fmt(pr.profitPerUnit)}</strong></p></div></li>
            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold grid place-items-center shrink-0">4</span><div><p class="text-gray-500">Monthly profit</p><p class="font-mono">${fmt(pr.profitPerUnit)} × ${pr.monthly.capacity} = <strong>${fmt(pr.monthly.profit)}</strong></p></div></li>
          </ol>
          <p class="mt-4 text-xs text-gray-500">Markup on cost: ${fmt(pr.markupPercent)}% · Monthly revenue: ${taka(pr.monthly.revenue)} · Monthly cost: ${taka(pr.monthly.totalCost)}</p>
        </article>

        <!-- Tips -->
        <article class="card">
          <h3 class="font-bold text-lg mb-3"><i class="fas fa-lightbulb text-amber-500 mr-2"></i>Smart tips</h3>
          ${pr.tips.length ? C.list(pr.tips, 'fa-star', 'text-amber-500') : '<p class="text-sm text-gray-500">Your numbers look healthy.</p>'}
        </article>
      </div>
      ${C.stepFooter('/product', '/promotion', 'Promote it')}
    </section>`
  },

  promotion() {
    if (!state.result) return C.emptyState()
    const pm = state.result.promotion
    const pr = state.result.pricing
    const wa = `https://wa.me/?text=${encodeURIComponent(pm.whatsappMessage)}`

    if (state.busy.promotion === 'all') return C.aiLoading('Herizon is creating your promotion…', 4, 'Promotion')

    const channelCard = (id, key, title, icon, text, channel, extra = '') => `
      <article class="card relative" id="${id}-card">
        <header class="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 class="font-bold text-lg flex items-center gap-2"><i class="${icon} text-brand-600"></i>${title}</h3>
          <div class="flex gap-1">
            <button class="btn-ghost copy-btn" data-copy="${id}" ${state.busy.promotion === channel ? 'disabled' : ''}><i class="far fa-copy"></i> Copy ${title.split(' ')[0]} ${channel === 'facebook' ? 'Post' : 'Message'}</button>
            <button class="btn-ghost promo-regen-btn" data-channel="${channel}" ${state.busy.promotion ? 'disabled' : ''}><i class="fas fa-rotate ${state.busy.promotion === channel ? 'fa-spin' : ''}"></i> Regenerate</button>
          </div>
        </header>
        ${state.busy.promotion === channel
          ? `<div class="copy-box flex items-center gap-3 text-gray-500 min-h-[120px]"><span class="spinner !w-6 !h-6 !border-2"></span> Herizon is creating your promotion…</div>`
          : `<pre id="${id}" class="copy-box font-sans">${esc(text)}</pre>`}
        ${extra}
      </article>`

    return `
    <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${C.pageHeader('Promotion', `Ready-to-post content for Facebook and WhatsApp${pr.valid ? ` at your price of ${taka(pr.recommendedPrice)}` : ''}. Nothing is posted automatically — you copy and share.`, 4)}
      ${C.aiError('promotion')}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-up">
        ${channelCard('fb-post', 'facebookPost', 'Facebook post', 'fab fa-facebook', pm.facebookPost, 'facebook')}
        <div class="space-y-6">
          ${channelCard('wa-msg', 'whatsappMessage', 'WhatsApp message', 'fab fa-whatsapp', pm.whatsappMessage, 'whatsapp')}
          <a href="${wa}" target="_blank" rel="noopener" class="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"><i class="fab fa-whatsapp text-xl"></i> Open in WhatsApp to send</a>
        </div>
        ${C.copyBox('short-cap', 'Short caption (Instagram / story)', pm.shortCaption, 'fas fa-quote-left')}
        <article class="card relative">
          ${C.sourceBadge(pm.source)}
          <h3 class="font-bold text-lg mb-3 flex items-center gap-2"><i class="fas fa-hashtag text-brand-600"></i>Hashtags</h3>
          ${C.chips(pm.hashtags)}
          <button class="btn-ghost copy-btn mt-3" data-copy-text="${esc(pm.hashtags.join(' '))}"><i class="far fa-copy"></i> Copy all</button>
          <h3 class="font-bold mt-5 mb-1">Call to action</h3>
          <p class="text-gray-700">${esc(pm.callToAction)}</p>
          <button class="btn-ghost promo-regen-btn mt-4" data-channel="all" ${state.busy.promotion ? 'disabled' : ''}><i class="fas fa-rotate"></i> Regenerate everything</button>
        </article>
      </div>
      ${C.stepFooter('/pricing', '/opportunities', 'Find opportunities')}
    </section>`
  },

  opportunities() {
    if (!state.result) return C.emptyState()
    const ops = state.result.opportunities
    const inp = state.result.input
    const typeStyle = {
      'Buyer': ['fa-handshake', 'bg-emerald-100 text-emerald-700'],
      'Supplier opportunity': ['fa-boxes-stacked', 'bg-amber-100 text-amber-700'],
      'Mentor': ['fa-user-graduate', 'bg-blue-100 text-blue-700'],
      'Women entrepreneur network': ['fa-people-group', 'bg-brand-100 text-brand-700'],
      'Workshop': ['fa-chalkboard-user', 'bg-sky-100 text-sky-700'],
      'Business community': ['fa-users', 'bg-plum-500/10 text-plum-600'],
      'Market opportunity': ['fa-store', 'bg-rose-100 text-rose-700'],
    }
    const goalText = inp.businessGoal ? GOAL_LABELS[inp.businessGoal] : null
    return `
    <section class="max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 lg:py-16">
      ${C.pageHeader('Opportunities', 'Your top 3 matches, based on your product, goal, capacity and area.', 5)}

      <div class="mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm flex items-start gap-2 fade-up" role="note">
        <i class="fas fa-flask mt-0.5"></i>
        <span><strong>Demo data.</strong> These are sample opportunities created for this hackathon prototype to show how matching works. The buyers, mentors, organisations and programmes listed are <strong>not real</strong>.</span>
      </div>

      <p class="text-sm text-gray-500 mb-4 fade-up"><i class="fas fa-filter mr-1"></i>Matched on: <span class="chip-gray">${esc(state.result.product.category)}</span>${goalText ? ` <span class="chip-gray">Goal: ${esc(goalText)}</span>` : ''} <span class="chip-gray">${inp.monthlyCapacity} / month</span>${inp.location ? ` <span class="chip-gray">${esc(inp.location)}</span>` : ''}</p>

      ${ops.length === 0 ? `<div class="card text-center text-gray-500 py-10">No demo opportunities matched yet. Try setting a goal in “Tell Us”.</div>` : ''}
      <ol class="grid grid-cols-1 md:grid-cols-3 gap-5 fade-up" id="opportunity-list">
        ${ops.map((o, idx) => {
          const [icon, cls] = typeStyle[o.type] || ['fa-star', 'bg-gray-100 text-gray-700']
          return `
          <li class="card flex flex-col relative">
            <span class="absolute -top-3 left-4 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold tracking-wider px-3 py-1 shadow"><i class="fas fa-flask mr-1"></i>DEMO OPPORTUNITY</span>
            <header class="flex items-start justify-between gap-3 mt-3">
              <span class="inline-flex items-center gap-1 rounded-full ${cls} text-xs font-semibold px-3 py-1"><i class="fas ${icon}"></i> ${esc(o.type)}</span>
              <span class="text-xs font-bold text-gray-400">#${idx + 1}</span>
            </header>
            <h3 class="font-bold text-lg mt-3 leading-snug">${esc(o.title)}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${esc(o.category)}${o.region ? ` · ${esc(o.region)}` : ''}</p>
            <p class="text-sm text-gray-700 mt-3 flex-1">“${esc(o.description)}”</p>
            <div class="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-3">
              <p class="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1"><i class="fas fa-circle-check mr-1"></i>Why this matches you</p>
              <p class="text-sm text-gray-800">${esc(o.matchReason)}</p>
            </div>
          </li>`
        }).join('')}
      </ol>

      <section class="card mt-8 text-center bg-gradient-to-br from-brand-50 to-purple-50 fade-up">
        <h3 class="text-xl font-extrabold">🎉 Your story is ready!</h3>
        <p class="text-gray-600 mt-1">You now have a product listing, a fair price, promotion content and matched opportunities.</p>
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
  state.editingProduct = false
  state.aiError = { product: null, promotion: null }
  const msgs = ['Herizon is preparing your product…', 'Calculating your price…', 'Herizon is creating your promotion…', 'Matching opportunities…']
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

// ── AI actions (Member 3) ──────────────────────────────────────
async function regenerateProduct() {
  if (!state.result || state.busy.product) return
  state.busy.product = true
  state.aiError.product = null
  state.editingProduct = false
  route()
  try {
    const product = await api.regenerateProduct(state.result.input, ++state.seed)
    state.result.product = product
    // product changed → refresh promotion + opportunities to match (non-blocking for the user)
    refreshPromotion('all', { silent: true })
    refreshOpportunities()
    persist()
    toast('New version ready')
  } catch (e) {
    state.aiError.product = e?.response?.data?.error || AI_FAIL_MSG
  } finally {
    state.busy.product = false
    route()
  }
}

/** Product changed (edit / regenerate) → keep opportunities in sync. Silent; failures leave the old list. */
async function refreshOpportunities() {
  if (!state.result) return
  try {
    const ops = await api.opportunities(state.result.input, state.result.product)
    if (Array.isArray(ops)) { state.result.opportunities = ops; persist(); if (currentPath() === '/opportunities') route() }
  } catch (_) { /* keep previous matches */ }
}

async function refreshPromotion(channel = 'all', { silent = false } = {}) {
  if (!state.result || state.busy.promotion) return
  state.busy.promotion = channel
  state.aiError.promotion = null
  if (!silent) route()
  try {
    const promotion = await api.promotion(state.result.input, state.result.product, {
      regenerate: true,
      seed: ++state.seed,
      channel: channel === 'all' ? undefined : channel,
      previous: state.result.promotion,
    })
    state.result.promotion = promotion
    persist()
    if (!silent) toast(channel === 'all' ? 'Promotion refreshed' : 'New version ready')
  } catch (e) {
    state.aiError.promotion = e?.response?.data?.error || AI_FAIL_MSG
  } finally {
    state.busy.promotion = null
    if (!silent || currentPath() === '/promotion') route()
  }
}

function saveProductEdits(form) {
  const fd = new FormData(form)
  const p = state.result.product
  const title = String(fd.get('title') || '').trim()
  const description = String(fd.get('description') || '').trim()
  if (!title || !description) { toast('Name and description are required.'); return }
  state.result.product = {
    ...p,
    title,
    category: String(fd.get('category') || '').trim() || p.category,
    tagline: String(fd.get('tagline') || '').trim(),
    description,
    features: String(fd.get('features') || '').split('\n').map((f) => f.trim()).filter(Boolean).slice(0, 6),
  }
  state.editingProduct = false
  persist()
  route()
  toast('Saved — updating your promotion…')
  refreshPromotion('all', { silent: true })
  refreshOpportunities()
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
    `Herizon Summary — ${r.product.title}`,
    `Generated: ${new Date(r.generatedAt).toLocaleString()}`,
    '',
    '== PRODUCT ==', r.product.title, r.product.tagline, '', r.product.description, '',
    'Features:', ...r.product.features.map((f) => ` - ${f}`), '',
    '== PRICING ==',
    `Total cost per unit: ${r.pricing.costs.totalCostPerUnit} BDT`,
    `Recommended selling price: ${r.pricing.recommendedPrice} BDT`,
    `Profit per unit: ${r.pricing.profitPerUnit} BDT`,
    `Profit margin: ${r.pricing.profitMarginPercent}%`,
    `Estimated monthly profit (${r.pricing.monthly.capacity} units): ${r.pricing.monthly.profit} BDT`, '',
    'Price comparison:', ...(r.pricing.comparison || []).map((s) => ` - ${s.price} BDT → ${s.profitPerUnit} profit/unit → ${s.monthlyProfit}/month${s.recommended ? ' (recommended)' : ''}`), '',
    '== FACEBOOK POST ==', r.promotion.facebookPost, '',
    '== WHATSAPP MESSAGE ==', r.promotion.whatsappMessage, '',
    '== OPPORTUNITIES (DEMO — not real organisations) ==', ...r.opportunities.map((o) => ` - [DEMO] ${o.title} — ${o.type}\n   ${o.description}\n   Why: ${o.matchReason}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `herizon-${r.product.title.toLowerCase().replace(/\s+/g, '-')}.txt`
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
  if (t.id === 'hero-demo-btn' || t.id === 'empty-demo-btn' || t.id === 'cta-demo-btn') { e.preventDefault(); runDemo() }
  if (t.id === 'story-demo-btn') { e.preventDefault(); fillDemo() }
  if (t.id === 'export-btn') { e.preventDefault(); exportSummary() }
  if (t.classList.contains('copy-btn')) {
    e.preventDefault()
    const text = t.dataset.copyText ?? (t.dataset.copy ? $('#' + t.dataset.copy)?.textContent : '')
    copyText(text || '', t)
  }
  if (t.id === 'product-edit-btn') { e.preventDefault(); state.editingProduct = true; state.aiError.product = null; route(); $('#pe-title')?.focus() }
  if (t.id === 'product-cancel-btn') { e.preventDefault(); state.editingProduct = false; route() }
  if (t.id === 'product-regen-btn') { e.preventDefault(); regenerateProduct() }
  if (t.classList.contains('promo-regen-btn')) { e.preventDefault(); refreshPromotion(t.dataset.channel || 'all') }
})

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'product-edit-form') return
  e.preventDefault()
  saveProductEdits(e.target)
})

/** Mirrors src/modules/pricing.ts validation so users get instant feedback before submit. */
function validateNumbers(d) {
  const n = (v) => { const t = String(v ?? '').trim().replace(/,/g, ''); if (t === '') return 0; const x = Number(t); return Number.isFinite(x) ? x : NaN }
  const errs = []
  const fields = [['productionCost', 'Production cost'], ['packagingCost', 'Packaging cost'], ['deliveryCost', 'Delivery cost'], ['monthlyCapacity', 'Monthly capacity'], ['timeHours', 'Time required'], ['hourlyLaborRate', 'Hourly labor rate']]
  for (const [k, label] of fields) {
    const v = n(d[k])
    if (Number.isNaN(v)) errs.push({ field: k, msg: `${label} must be a number.` })
    else if (v < 0) errs.push({ field: k, msg: `${label} cannot be negative.` })
  }
  const m = n(d.profitMargin)
  if (Number.isNaN(m)) errs.push({ field: 'profitMargin', msg: 'Profit margin must be a number.' })
  else if (m < 0) errs.push({ field: 'profitMargin', msg: 'Profit margin cannot be negative.' })
  else if (m >= 100) errs.push({ field: 'profitMargin', msg: 'Profit margin must be below 100%.' })
  if ((n(d.productionCost) || 0) + (n(d.packagingCost) || 0) + (n(d.deliveryCost) || 0) <= 0 && !(n(d.hourlyLaborRate) > 0 && n(d.timeHours) > 0)) {
    errs.push({ field: 'productionCost', msg: 'Enter at least one cost so we can calculate a price.' })
  }
  return errs
}

function showFieldErrors(errs) {
  document.querySelectorAll('#story-form .input').forEach((el) => el.classList.remove('ring-2', 'ring-red-400', 'border-red-400'))
  const box = $('#field-errors')
  if (!box) return
  if (!errs.length) { box.classList.add('hidden'); return }
  box.innerHTML = `<ul class="space-y-1">${errs.map((e) => `<li><i class="fas fa-circle-xmark mr-1"></i>${esc(e.msg)}</li>`).join('')}</ul>`
  box.classList.remove('hidden')
  errs.forEach((e) => $('#f-' + e.field)?.classList.add('ring-2', 'ring-red-400', 'border-red-400'))
}

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'story-form') return
  e.preventDefault()
  const data = readForm(e.target)
  if (!data.description || data.description.trim().length < 5) {
    showFormError('Please describe your product or skill first.')
    $('#f-description')?.focus()
    return
  }
  const errs = validateNumbers(data)
  showFieldErrors(errs)
  if (errs.length) { $('#f-' + errs[0].field)?.focus(); return }
  generate(data)
})

// Keep state.input in sync while typing (so navigation back keeps values)
document.addEventListener('input', (e) => {
  const el = e.target
  if (el.closest && el.closest('#story-form') && el.name) {
    state.input[el.name] = el.value
    if (el.type === 'number' && !$('#field-errors')?.classList.contains('hidden')) showFieldErrors(validateNumbers(readForm(el.form)))
  }
})

document.addEventListener('change', (e) => {
  const el = e.target
  if (el.closest && el.closest('#story-form') && el.name) state.input[el.name] = el.value
})

window.addEventListener('hashchange', route)
route()
