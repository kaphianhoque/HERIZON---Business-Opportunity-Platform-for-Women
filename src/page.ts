/** HTML shell for the SheLink single-page app. All UI logic lives in /static/app.js */
export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SheLink — Your Story. Your Skill. Your Market.</title>
  <meta name="description" content="SheLink helps women describe what they make and turns it into a professional product listing, pricing guidance, promotional content, and business opportunities.">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d',800:'#9d174d',900:'#831843' },
            plum: { 500:'#7c3aed',600:'#6d28d9',700:'#5b21b6' }
          },
          fontFamily: { sans: ['Inter','ui-sans-serif','system-ui','sans-serif'] }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
  <link href="/static/style.css" rel="stylesheet">
  <style type="text/tailwindcss">
    .btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-plum-600 text-white font-semibold px-6 py-3 shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed; }
    .btn-secondary { @apply inline-flex items-center justify-center gap-2 rounded-full bg-white text-brand-700 border-2 border-brand-200 font-semibold px-6 py-3 hover:bg-brand-50 hover:border-brand-300 active:scale-[0.98] transition; }
    .btn-ghost { @apply inline-flex items-center gap-2 rounded-full text-gray-600 font-medium px-4 py-2 hover:bg-brand-100 hover:text-brand-700 transition text-sm; }
    .card { @apply bg-white rounded-2xl shadow-sm border border-brand-100 p-5 md:p-6; }
    .section-title { @apply text-2xl md:text-3xl font-extrabold text-gray-900; }
    .section-subtitle { @apply text-gray-500 mt-1; }
    .label { @apply block text-sm font-semibold text-gray-700 mb-1; }
    .input { @apply w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition; }
    .chip { @apply inline-flex items-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1; }
    .chip-gray { @apply inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1; }
    .stat { @apply rounded-2xl p-4 md:p-5 text-white; }
    .step-link { @apply px-3 py-1.5 rounded-full text-gray-500 hover:text-brand-700 hover:bg-brand-50 transition whitespace-nowrap; }
    .step-link.active { @apply bg-brand-100 text-brand-700; }
    .step-link.disabled { @apply opacity-40 pointer-events-none; }
    .copy-box { @apply whitespace-pre-wrap rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-800 leading-relaxed; }
  </style>
</head>
<body class="bg-brand-50 text-gray-800 font-sans min-h-screen flex flex-col">

  <header id="site-header" class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-brand-100">
    <nav class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="#/" class="flex items-center gap-2 font-extrabold text-xl text-brand-700" id="logo-link">
        <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-plum-600 text-white grid place-items-center"><i class="fas fa-heart"></i></span>
        SheLink
      </a>
      <ul id="step-nav" class="hidden md:flex items-center gap-1 text-sm font-medium"></ul>
      <a href="#/story" class="btn-primary text-sm py-2 px-4" id="nav-start-btn">Start</a>
    </nav>
    <ul id="step-nav-mobile" class="md:hidden flex overflow-x-auto gap-1 px-3 pb-2 text-xs font-medium"></ul>
  </header>

  <main id="app" class="flex-1"></main>

  <footer class="border-t border-brand-100 bg-white">
    <div class="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500 flex flex-col md:flex-row items-center justify-between gap-2">
      <span><strong class="text-brand-700">SheLink</strong> — Your Story. Your Skill. Your Market.</span>
      <span>Hackathon MVP · Built for women entrepreneurs in Bangladesh</span>
    </div>
  </footer>

  <div id="toast" class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg opacity-0 pointer-events-none transition"></div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}
