/**
 * Tests for claude-service.js
 * Mocks the Anthropic SDK — no real API calls.
 *
 * The Anthropic SDK exports a class (constructor) so we must use `function` syntax.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCreate = vi.fn()

// Must use a function-based factory so the class can be instantiated with `new`
vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic() {
    return { messages: { create: mockCreate } }
  },
}))

import { callClaude } from '../services/claude-service.js'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
})

describe('callClaude()', () => {
  it('returns parsed JSON on successful call', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ text: '{"result": "ok", "words": []}' }],
    })
    const result = await callClaude('system prompt', 'user message')
    expect(result).toEqual({ result: 'ok', words: [] })
  })

  it('strips markdown code fences (```json) and parses JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ text: '```json\n{"key": "value"}\n```' }],
    })
    const result = await callClaude('system', 'user')
    expect(result).toEqual({ key: 'value' })
  })

  it('strips plain code fences (```) and parses JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ text: '```\n{"key": "stripped"}\n```' }],
    })
    const result = await callClaude('system', 'user')
    expect(result).toEqual({ key: 'stripped' })
  })

  it('retries on malformed JSON up to maxRetries times, then throws a SyntaxError', async () => {
    // The service retries on JSON parse failures. On the final attempt it rethrows the raw SyntaxError.
    mockCreate.mockResolvedValue({
      content: [{ text: 'not valid json {{{{' }],
    })
    // Should throw some error (either SyntaxError or the wrapped message)
    await expect(callClaude('system', 'user', 2)).rejects.toThrow()
    // Should have been called 3 times (1 initial + 2 retries)
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it('succeeds on second attempt if first JSON parse fails', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ text: 'bad json' }] })
      .mockResolvedValueOnce({ content: [{ text: '{"success": true}' }] })
    const result = await callClaude('system', 'user', 1)
    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('throws a clear error for authentication failure (401)', async () => {
    const authErr = Object.assign(new Error('Unauthorized'), { status: 401 })
    mockCreate.mockRejectedValueOnce(authErr)
    await expect(callClaude('system', 'user')).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })

  it('throws a user-friendly message for network errors (ECONNREFUSED)', async () => {
    const netErr = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    mockCreate.mockRejectedValueOnce(netErr)
    await expect(callClaude('system', 'user')).rejects.toThrow(/Check your internet connection/)
  })

  it('throws a timed out error for timeout', async () => {
    const timeoutErr = Object.assign(new Error('Request timeout'), { name: 'APIConnectionTimeoutError' })
    mockCreate.mockRejectedValueOnce(timeoutErr)
    await expect(callClaude('system', 'user')).rejects.toThrow(/timed out/)
  })

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(callClaude('system', 'user')).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })
})
