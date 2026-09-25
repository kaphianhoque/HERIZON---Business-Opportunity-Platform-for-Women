// ─────────────────────────────────────────────────────────────
// Shared AI client (Member 3)
// Fetch-based, OpenAI-compatible chat completions — works on Cloudflare
// Workers (no Node SDK). Returns parsed JSON or throws AiError.
// Credentials come from Worker env bindings (.dev.vars locally,
// `wrangler secret put` in production). Never exposed to the browser.
// ─────────────────────────────────────────────────────────────

export interface AiEnv {
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
  OPENAI_REASONING_EFFORT?: string
}

export class AiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AiError'
  }
}

export function aiAvailable(env: AiEnv | undefined): boolean {
  return Boolean(env?.OPENAI_API_KEY)
}

interface ChatJsonOptions {
  system: string
  user: string
  /** Higher = more varied; used for "Regenerate" */
  seed?: number
  timeoutMs?: number
}

/**
 * Call the chat completions endpoint and parse a JSON object from the reply.
 * Throws AiError on network failure, non-2xx, or unparsable output.
 */
export async function chatJson<T>(env: AiEnv, opts: ChatJsonOptions): Promise<T> {
  if (!env.OPENAI_API_KEY) throw new AiError('AI is not configured')
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = env.OPENAI_MODEL || 'gpt-5-mini'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000)

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        // Copywriting doesn't need chain-of-thought; minimal effort ≈ 3-5× faster responses.
        reasoning_effort: env.OPENAI_REASONING_EFFORT || 'minimal',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          {
            role: 'user',
            content: opts.user + (opts.seed ? `\n\n(Variation request #${opts.seed}: produce a noticeably different wording from earlier attempts while following every rule.)` : ''),
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new AiError(`AI request failed (${res.status})`, text.slice(0, 300))
    }

    const data = (await res.json()) as any
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    return parseJson<T>(content)
  } catch (e) {
    if (e instanceof AiError) throw e
    throw new AiError(e instanceof Error && e.name === 'AbortError' ? 'AI request timed out' : 'AI request failed', e)
  } finally {
    clearTimeout(timer)
  }
}

/** Tolerant JSON extraction (handles ```json fences or leading prose). */
function parseJson<T>(text: string): T {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0]) as T
      } catch {
        /* fall through */
      }
    }
    throw new AiError('AI returned an unreadable response')
  }
}

/** Guardrail: the AI must never invent these facts. Shared by both prompts. */
export const NO_INVENTION_RULES = `
STRICT RULES — you must NOT invent or imply any of the following unless the user's own description explicitly states it:
- years of experience, expertise level, or "trusted by" claims
- certifications, licences, awards, training, hygiene ratings
- named customers, buyers, testimonials, reviews, ratings
- revenue, sales volume, number of orders, popularity ("best-selling", "hundreds of happy customers")
- location, city, neighbourhood, delivery area
- achievements, media features, partnerships
- availability, opening hours, delivery times, "same-day", "24/7"
- ingredients, materials, or features that were not mentioned
If a detail is not in the description, leave it out. Prefer neutral, honest phrasing such as "prepared to order" over unverifiable claims. Write in warm, professional, plain English (no jargon, no ALL CAPS).`.trim()
