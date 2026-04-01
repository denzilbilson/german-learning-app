import Anthropic from '@anthropic-ai/sdk'

const MODEL   = 'claude-sonnet-4-20250514'
const TIMEOUT = 120_000  // 120 seconds

function log(level, msg, extra = '') {
  const ts = new Date().toISOString()
  console[level](`[${ts}] [claude-service] ${msg}${extra ? ' — ' + extra : ''}`)
}

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.')
  }
  return new Anthropic({
    apiKey:  process.env.ANTHROPIC_API_KEY,
    timeout: TIMEOUT,
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Call Claude with a system prompt + user message, returning parsed JSON.
 *
 * Retries:
 *  - Malformed JSON: up to `maxRetries` times immediately
 *  - Rate limit (429): exponential backoff 2s → 4s → 8s, up to 3 times
 *  - Network errors: throw with a user-friendly message
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxRetries  – max JSON-parse retries, default 2
 * @returns {Promise<object>}
 */
export async function callClaude(systemPrompt, userMessage, maxRetries = 2) {
  const client = getClient()
  let lastError
  let rateLimitAttempts = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model:      MODEL,
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      })

      const raw = response.content[0]?.text ?? ''

      // Strip markdown code fences if Claude wrapped the JSON
      const fenced  = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = fenced ? fenced[1].trim() : raw.trim()

      return JSON.parse(jsonStr)

    } catch (err) {
      lastError = err

      // ── Rate limit ───────────────────────────────────────────────
      if (err.status === 429 && rateLimitAttempts < 3) {
        rateLimitAttempts++
        const delay = Math.pow(2, rateLimitAttempts) * 1000 // 2s, 4s, 8s
        log('warn', `Rate limited — retrying in ${delay / 1000}s (attempt ${rateLimitAttempts}/3)`)
        await sleep(delay)
        attempt--  // don't consume a JSON-retry slot for rate limits
        continue
      }

      // ── Authentication / key errors ──────────────────────────────
      if (err.status === 401) {
        log('error', 'Authentication failed', err.message)
        throw new Error('Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.')
      }

      // ── Network / connectivity errors ────────────────────────────
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        log('error', 'Network error', err.message)
        throw new Error('Could not reach AI service. Check your internet connection.')
      }

      // ── Timeout ──────────────────────────────────────────────────
      if (err.message?.includes('timeout') || err.name === 'APIConnectionTimeoutError') {
        log('error', 'Request timed out')
        throw new Error('AI request timed out after 120 seconds. Try again with a shorter text.')
      }

      // ── Malformed JSON — retry ───────────────────────────────────
      if (err instanceof SyntaxError) {
        if (attempt < maxRetries) {
          log('warn', `JSON parse failed on attempt ${attempt + 1}, retrying…`)
          continue
        }
      }

      // ── Other API errors — don't retry ───────────────────────────
      if (err.status) {
        log('error', `API error ${err.status}`, err.message)
        throw new Error(`AI service error (${err.status}): ${err.message}`)
      }

      // Unknown error — rethrow
      log('error', 'Unexpected error', err.message)
      throw err
    }
  }

  log('error', `Failed after ${maxRetries + 1} attempts`, lastError?.message)
  throw new Error(
    `Claude returned invalid JSON after ${maxRetries + 1} attempts: ${lastError?.message}`
  )
}
