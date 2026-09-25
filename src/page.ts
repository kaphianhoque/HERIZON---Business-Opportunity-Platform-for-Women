/** HTML shell for the Herizon single-page app. All UI logic lives in /static/app.js */
export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Herizon — Your Story. Your Skill. Your Market.</title>
  <meta name="description" content="Herizon helps women describe what they make and turns it into a professional product listing, pricing guidance, promotional content, and business opportunities.">
  <meta property="og:title" content="Herizon — Your Story. Your Skill. Your Market.">
  <meta property="og:description" content="Tell us what you make. Herizon helps you present it, price it, promote it, and find opportunities.">
  <meta property="og:image" content="/static/img/baking.jpg">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50:'#fdf4f0',100:'#fbe6dc',200:'#f6c9b6',300:'#efa387',400:'#e67a58',500:'#d95a35',600:'#c2432a',700:'#a13423',800:'#832e21',900:'#6a291f' },
            plum:  { 500:'#7a3b69',600:'#652f57',700:'#512546' },
            sand:  { 50:'#fbf8f3',100:'#f4ede2',200:'#e8dac6' }
          },
          fontFamily: { sans: ['Inter','ui-sans-serif','system-ui','sans-serif'], display: ['"Playfair Display"','Georgia','serif'] }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
  <link href="/static/style.css" rel="stylesheet">
  <style type="text/tailwindcss">
    .btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 text-white font-semibold px-6 py-3 shadow-md hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed; }
    .btn-secondary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-white text-brand-700 border-2 border-brand-200 font-semibold px-6 py-3 hover:bg-brand-50 hover:border-brand-300 active:scale-[0.98] transition; }
    .btn-ghost { @apply inline-flex items-center gap-2 rounded-full text-gray-600 font-medium px-4 py-2 hover:bg-brand-100 hover:text-brand-700 transition text-sm; }
    .card { @apply bg-white rounded-2xl shadow-sm border border-sand-200 p-5 md:p-6; }
    .section-title { @apply text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 font-display; }
    .section-subtitle { @apply text-gray-500 mt-1 lg:text-lg; }
    .label { @apply block text-sm font-semibold text-gray-700 mb-1; }
    .input { @apply w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition; }
    .chip { @apply inline-flex items-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1; }
    .chip-gray { @apply inline-flex items-center rounded-full bg-sand-100 text-gray-600 text-xs font-medium px-3 py-1; }
    .stat { @apply rounded-2xl p-4 md:p-5 text-white; }
    .step-link { @apply px-3 py-1.5 rounded-full text-gray-500 hover:text-brand-700 hover:bg-brand-50 transition whitespace-nowrap; }
    .step-link.active { @apply bg-brand-100 text-brand-700; }
    .step-link.disabled { @apply opacity-40 pointer-events-none; }
    .copy-box { @apply whitespace-pre-wrap rounded-xl bg-sand-50 border border-sand-200 p-4 text-sm text-gray-800 leading-relaxed; }
    .photo-card { @apply relative overflow-hidden rounded-2xl shadow-md bg-sand-100; }
    .photo-card img { @apply w-full h-full object-cover transition duration-500 group-hover:scale-105; }
    .photo-caption { @apply absolute inset-x-0 bottom-0 p-4 text-white bg-gradient-to-t from-black/70 via-black/30 to-transparent; }
  </style>
</head>
<body class="bg-sand-50 text-gray-800 font-sans min-h-screen flex flex-col">

  <header id="site-header" class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-sand-200">
    <nav class="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between">
      <a href="#/" class="flex items-center gap-2.5 font-display font-bold text-2xl text-gray-900" id="logo-link">
        <img src="/static/favicon.svg" alt="" class="w-9 h-9 rounded-xl shadow-sm">
        Herizon
      </a>
      <ul id="step-nav" class="hidden md:flex items-center gap-1 text-sm font-medium"></ul>
      <div class="flex items-center gap-2">
        <a href="#/" class="btn-ghost hidden lg:inline-flex" id="nav-home-btn">Home</a>
        <a href="#/story" class="btn-primary text-sm py-2 px-5" id="nav-start-btn">Start Your Story</a>
      </div>
    </nav>
    <ul id="step-nav-mobile" class="md:hidden flex overflow-x-auto gap-1 px-3 pb-2 text-xs font-medium"></ul>
  </header>

  <main id="app" class="flex-1"></main>

  <footer class="border-t border-sand-200 bg-white">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500">
      <div>
        <p class="font-display font-bold text-xl text-gray-900">Herizon</p>
        <p class="mt-1">Your Story. Your Skill. Your Market.</p>
      </div>
      <p class="md:text-center self-center">Helping women present, price, promote and grow what they make.</p>
      <p class="md:text-right self-center">Hackathon MVP · Built for women entrepreneurs in Bangladesh</p>
    </div>
  </footer>

  <div id="toast" class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg opacity-0 pointer-events-none transition"></div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}
