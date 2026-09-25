/** HTML shell for the Herizon single-page app. All UI logic lives in /static/app.js */
export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Herizon — Your Story. Your Skill. Your Market.</title>
  <meta name="description" content="Herizon helps women describe what they make and turns it into a professional product listing, pricing guidance, promotional content, and business opportunities.">
  <meta name="application-name" content="Herizon">
  <meta name="theme-color" content="#f7f1ec">
  <meta property="og:site_name" content="Herizon">
  <meta property="og:title" content="Herizon — Your Story. Your Skill. Your Market.">
  <meta property="og:description" content="Tell us what you make. Herizon helps you present it, price it, promote it, and find opportunities.">
  <meta property="og:type" content="website">
  <meta property="og:image" content="/static/img/hero.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            // Primary accent: dusty rose / muted berry — warm, feminine, professional
            brand: { 50:'#fbf5f4',100:'#f5e6e4',200:'#ebcdc9',300:'#dcaaa4',400:'#c9807a',500:'#b5615c',600:'#9e4a47',700:'#833c3b',800:'#6e3434',900:'#5c2e2e' },
            // Secondary: muted lavender / mauve
            plum:  { 50:'#f7f3f8',100:'#ece4ee',200:'#d9c9dd',300:'#bda4c4',400:'#9e7ea7',500:'#84658d',600:'#6d5175',700:'#5a4260' },
            // Neutrals: cream / ivory / warm greys
            sand:  { 50:'#fcfaf7',100:'#f7f1ec',200:'#ece3db',300:'#d9cdc2' },
            ink:   { 900:'#1f1a1c', 700:'#4a4246', 500:'#7a7074', 400:'#9a9094' }
          },
          fontFamily: {
            // Grotesk-style sans for UI, body and headings
            sans: ['"Schibsted Grotesk"','"Space Grotesk"','"Helvetica Neue"','Arial','ui-sans-serif','system-ui','sans-serif'],
            // Editorial serif for italic accents (closest open alternative to PP Editorial New)
            serif: ['"Instrument Serif"','"PP Editorial New"','"Playfair Display"','Georgia','serif']
          },
          boxShadow: {
            soft: '0 1px 2px rgba(31,26,28,.04), 0 8px 24px -12px rgba(31,26,28,.12)',
            lift: '0 2px 4px rgba(31,26,28,.05), 0 20px 40px -20px rgba(31,26,28,.18)'
          },
          borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
  <link href="/static/style.css" rel="stylesheet">
  <style type="text/tailwindcss">
    /* ── Buttons ── */
    .btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-ink-900 text-white font-semibold px-6 py-3 shadow-soft hover:bg-brand-700 hover:shadow-lift active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed; }
    .btn-secondary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-white/80 backdrop-blur text-ink-900 border border-sand-300 font-semibold px-6 py-3 hover:bg-white hover:border-brand-300 hover:shadow-soft active:scale-[0.98] transition-all duration-200; }
    .btn-ghost { @apply inline-flex items-center gap-2 rounded-full text-ink-700 font-medium px-4 py-2 hover:bg-brand-50 hover:text-brand-700 transition text-sm; }
    /* ── Surfaces ── */
    .card { @apply bg-white/85 backdrop-blur-sm rounded-2xl shadow-soft border border-white/70 ring-1 ring-sand-200/60 p-5 md:p-6; }
    .section-title { @apply text-2xl md:text-3xl lg:text-[2.5rem] lg:leading-[1.1] font-bold tracking-tight text-ink-900; }
    .section-subtitle { @apply text-ink-500 mt-2 lg:text-lg leading-relaxed; }
    .eyebrow { @apply text-xs font-semibold text-brand-600 uppercase tracking-[0.14em]; }
    .accent { @apply font-serif italic font-normal text-brand-600; }
    /* ── Forms ── */
    .label { @apply block text-sm font-semibold text-ink-700 mb-1.5; }
    .input { @apply w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition; }
    /* ── Chips / stats ── */
    .chip { @apply inline-flex items-center rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 ring-1 ring-brand-100; }
    .chip-gray { @apply inline-flex items-center rounded-full bg-sand-100 text-ink-700 text-xs font-medium px-3 py-1; }
    .stat { @apply rounded-2xl p-4 md:p-5 text-white shadow-soft; }
    .step-link { @apply px-3 py-1.5 rounded-full text-ink-500 hover:text-brand-700 hover:bg-brand-50 transition whitespace-nowrap; }
    .step-link.active { @apply bg-brand-50 text-brand-700 ring-1 ring-brand-100; }
    .step-link.disabled { @apply opacity-40 pointer-events-none; }
    .copy-box { @apply whitespace-pre-wrap rounded-xl bg-sand-50 border border-sand-200 p-4 text-sm text-ink-900 leading-relaxed; }
    /* ── Photos ── */
    .photo-card { @apply relative overflow-hidden rounded-2xl shadow-lift bg-sand-200; }
    .photo-card img { @apply w-full h-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]; }
    .photo-caption { @apply absolute inset-x-0 bottom-0 p-4 lg:p-5 text-white bg-gradient-to-t from-ink-900/75 via-ink-900/25 to-transparent; }
  </style>
</head>
<body class="app-bg text-ink-900 font-sans min-h-screen flex flex-col antialiased">

  <header id="site-header" class="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-[0_1px_0_rgba(31,26,28,.04)]">
    <nav class="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-[76px] flex items-center justify-between">
      <a href="#/" class="flex items-center gap-2.5 font-bold text-[1.35rem] tracking-tight text-ink-900" id="logo-link" aria-label="Herizon home">
        <img src="/static/favicon.svg" alt="" class="w-9 h-9 rounded-xl shadow-soft">
        Herizon
      </a>
      <ul id="step-nav" class="hidden md:flex items-center gap-1 text-sm font-medium"></ul>
      <div class="flex items-center gap-2">
        <span class="hidden lg:inline-flex"><a href="#/" class="btn-ghost" id="nav-home-btn">Home</a></span>
        <a href="#/story" class="btn-primary text-sm py-2 px-4 sm:px-5 whitespace-nowrap" id="nav-start-btn"><span class="sm:hidden">Start</span><span class="hidden sm:inline">Start Your Story</span></a>
      </div>
    </nav>
    <ul id="step-nav-mobile" class="md:hidden flex overflow-x-auto gap-1 px-3 pb-2 text-xs font-medium"></ul>
  </header>

  <main id="app" class="flex-1"></main>

  <footer class="border-t border-white/60 bg-white/50 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-ink-500">
      <div>
        <p class="font-bold text-xl tracking-tight text-ink-900">Herizon</p>
        <p class="mt-1 font-serif italic text-base text-ink-700">Your Story. Your Skill. Your Market.</p>
      </div>
      <p class="md:text-center self-center">Helping women present, price, promote and grow what they make.</p>
      <p class="md:text-right self-center">Hackathon MVP · Built for women entrepreneurs in Bangladesh</p>
    </div>
  </footer>

  <div id="toast" class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-sm px-4 py-2 rounded-full shadow-lift opacity-0 pointer-events-none transition"></div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}
