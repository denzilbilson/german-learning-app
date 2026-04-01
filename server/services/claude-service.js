import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-20250514'

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

/**
 * Call Claude with a system prompt + user message, returning parsed JSON.
 * Retries up to `maxRetries` times on malformed JSON responses.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxRetries  – default 2
 * @returns {Promise<object>}
 */
export async function callClaude(systemPrompt, userMessage, maxRetries = 2) {
  const client = getClient()
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const raw = response.content[0]?.text ?? ''

      // Strip markdown code fences if Claude wrapped the JSON
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = fenced ? fenced[1].trim() : raw.trim()

      return JSON.parse(jsonStr)
    } catch (err) {
      lastError = err

      if (err instanceof SyntaxError) {
        // Malformed JSON — retry
        if (attempt < maxRetries) {
          console.warn(`[claude-service] JSON parse failed on attempt ${attempt + 1}, retrying…`)
          continue
        }
      } else {
        // Network / API / auth error — don't retry
        throw err
      }
    }
  }

  throw new Error(
    `Claude returned invalid JSON after ${maxRetries + 1} attempts: ${lastError?.message}`
  )
}
