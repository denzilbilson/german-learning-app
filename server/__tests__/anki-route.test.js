/**
 * Tests for anki route: POST /api/anki/export
 * Mocks claude-service for enrichment tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock claude and enrich prompt — not needed for basic export tests
vi.mock('../services/claude-service.js', () => ({ callClaude: vi.fn() }))
vi.mock('../prompts/enrich-anki.js', () => ({
  ENRICH_ANKI_SYSTEM: 'enrich system',
  buildEnrichMessage: vi.fn(() => 'enrich user msg'),
}))

import ankiRouter from '../routes/anki.js'

let app

beforeEach(() => {
  app = express()
  app.use(express.json())
  app.use('/api/anki', ankiRouter)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/anki/export', () => {
  it('returns TSV response with vocabulary data', async () => {
    const vocab = [{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1' }]
    const res = await request(app).post('/api/anki/export').send({ vocabulary: vocab, phrases: [] })
    expect(res.status).toBe(200)
    expect(res.text).toContain('#separator:tab')
    expect(res.text).toContain('Hund')
  })

  it('returns TSV response with phrase data', async () => {
    const phrases = [{ Phrase: 'Guten Tag', 'English Meaning': 'Good day', Level: 'A1', Source: '' }]
    const res = await request(app).post('/api/anki/export').send({ vocabulary: [], phrases })
    expect(res.status).toBe(200)
    expect(res.text).toContain('Guten Tag')
  })

  it('returns empty body (just headers) for empty input', async () => {
    const res = await request(app).post('/api/anki/export').send({ vocabulary: [], phrases: [] })
    expect(res.status).toBe(200)
    // Just the TSV file headers, no data rows
    const lines = res.text.split('\n').filter(Boolean)
    expect(lines).toHaveLength(3) // #separator, #html, Front\tBack\tTags
  })

  it('sets Content-Disposition attachment header', async () => {
    const res = await request(app).post('/api/anki/export').send({ vocabulary: [], phrases: [] })
    expect(res.headers['content-disposition']).toContain('attachment')
  })

  it('sets Content-Type to text/tab-separated-values', async () => {
    const res = await request(app).post('/api/anki/export').send({ vocabulary: [], phrases: [] })
    expect(res.headers['content-type']).toContain('text/tab-separated-values')
  })

  it('handles mixed vocabulary + phrases in single export', async () => {
    const vocab = [{ Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1' }]
    const phrases = [{ Phrase: 'Wie bitte?', 'English Meaning': 'Pardon?', Level: 'A1', Source: '' }]
    const res = await request(app).post('/api/anki/export').send({ vocabulary: vocab, phrases })
    expect(res.status).toBe(200)
    expect(res.text).toContain('Katze')
    expect(res.text).toContain('Wie bitte?')
  })
})
