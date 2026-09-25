// ─────────────────────────────────────────────────────────────
// MODULE: Facebook / WhatsApp Promotion Generation
// Owner: (teammate) — swap template logic for an LLM call.
// Keep the function signature identical.
// ─────────────────────────────────────────────────────────────
import type { StoryInput, ProductListing, PricingResult, PromotionContent } from '../types'

function toHashtag(word: string): string {
  return '#' + word.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, (c) => c.toUpperCase())
}

export async function generatePromotion(
  input: StoryInput,
  product: ProductListing,
  pricing: PricingResult,
): Promise<PromotionContent> {
  const price = pricing.recommendedPrice
  const name = product.title
  const hashtags = Array.from(
    new Set([
      ...product.keywords.slice(0, 5).map(toHashtag),
      '#Herizon',
      '#WomenEntrepreneurs',
      '#MadeInBangladesh',
      '#SupportLocal',
      '#SmallBusiness',
    ]),
  )

  const featureLines = product.features.slice(0, 3).map((f) => `✨ ${f}`).join('\n')
  const cta = `Message us now to order — only ${input.monthlyCapacity} slots available this month!`

  const facebookPost =
    `🎉 Introducing ${name}! 🎉\n\n` +
    `${input.description.trim()}\n\n` +
    `${featureLines}\n\n` +
    `💰 Price: ${price} BDT\n` +
    `📦 Delivery available\n\n` +
    `${cta}\n\n` +
    hashtags.join(' ')

  const whatsappMessage =
    `Hello! 👋\n\n` +
    `I'm excited to share my ${name.toLowerCase()} with you. ${product.tagline}.\n\n` +
    `${product.features.slice(0, 2).map((f) => `✅ ${f}`).join('\n')}\n\n` +
    `💰 Only ${price} BDT\n` +
    `⏱️ Order ${Math.max(1, Math.ceil(input.timeHours / 8))} day(s) in advance\n\n` +
    `Reply to this message to place your order or ask questions. Thank you for supporting a small woman-owned business! 🙏`

  const shortCaption = `${name} — ${product.tagline}. ${price} BDT. DM to order! ${hashtags.slice(0, 3).join(' ')}`

  return {
    facebookPost,
    whatsappMessage,
    shortCaption,
    hashtags,
    callToAction: cta,
    source: 'template',
  }
}
