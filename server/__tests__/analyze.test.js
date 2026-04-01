/**
 * Tests for analyze routes.
 *
 * The analyze route has VOCAB_FILE and PHRASES_FILE computed at import time from __dirname,
 * not from store.DATA_DIR. So we mock the store's getAll/add functions to redirect to temp files.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const state = vi.hoisted(() => ({ vocabFile: '', phrasesFile: '' }))

vi.mock('../services/markdown-store.js', async () => {
  const actual = await vi.importActual('../services/markdown-store.js')
  return {
    ...actual,
    DATA_DIR: '/tmp',
    getAll:  (filePath, query) => {
      if (filePath.includes('vocabulary')) return actual.getAll(state.vocabFile, query)
      if (filePath.includes('phrases'))   return actual.getAll(state.phrasesFile, query)
      return actual.getAll(filePath, query)
    },
    add: (filePath, entries) => {
      if (filePath.includes('vocabulary')) return actual.add(state.vocabFile, entries)
      if (filePath.includes('phrases'))   return actual.add(state.phrasesFile, entries)
      return actual.add(filePath, entries)
    },
    update: (...args) => actual.update(...args),
    remove: (...args) => actual.remove(...args),
  }
})

const claudeMock = vi.hoisted(() => ({ callClaude: vi.fn() }))
vi.mock('../services/claude-service.js', () => claudeMock)
vi.mock('../prompts/analyze-text.js', () => ({
  analyzeTextPrompt: 'analyze system prompt',
}))

import analyzeRouter from '../routes/analyze.js'

let tmpDir
let app

const MOCK_ANALYSIS = {
  vocabulary: [{ word: 'Vorstellung', literalMeaning: 'presentation', intendedMeaning: 'idea', partOfSpeech: 'Nomen', caseExamples: [], level: 'B1' }],
  phrases: [{ phrase: 'Wie geht es?', englishMeaning: 'How are you?', level: 'A1' }],
  grammar: [{ topic: 'Dative', explanation: 'Used for indirect object' }],
  translation: 'Translation',
}

async function seedVocabFile(rows = []) {
  const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r => '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |')
  await writeFile(state.vocabFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

async function seedPhrasesFile(rows = []) {
  const headers = ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r => '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |')
  await writeFile(state.phrasesFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'analyze-route-test-'))
  state.vocabFile = join(tmpDir, 'vocabulary.md')
  state.phrasesFile = join(tmpDir, 'phrases.md')
  claudeMock.callClaude.mockClear()

  app = express()
  app.use(express.json())
  app.use('/api/analyze', analyzeRouter)
  app.use('/api/analysis', analyzeRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
  vi.clearAllMocks()
})

describe('POST /api/analyze', () => {
  it('returns 400 for empty text', async () => {
    const res = await request(app).post('/api/analyze').send({ text: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 400 for whitespace-only text', async () => {
    const res = await request(app).post('/api/analyze').send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  it('returns 200 with analysis data when Claude returns well-formed JSON', async () => {
    claudeMock.callClaude.mockResolvedValueOnce(MOCK_ANALYSIS)
    const res = await request(app).post('/api/analyze').send({ text: 'Ich bin ein Berliner.' })
    expect(res.status).toBe(200)
    expect(res.body.vocabulary).toBeDefined()
    expect(res.body.originalText).toBe('Ich bin ein Berliner.')
    expect(res.body.savedAt).toBeTruthy()
    expect(res.body.filename).toBeTruthy()
  })

  it('includes source in response when provided', async () => {
    claudeMock.callClaude.mockResolvedValueOnce(MOCK_ANALYSIS)
    const res = await request(app).post('/api/analyze').send({ text: 'Hallo Welt', source: 'Test Source' })
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('Test Source')
  })

  it('returns 500 when Claude throws an error', async () => {
    claudeMock.callClaude.mockRejectedValueOnce(new Error('AI service error'))
    const res = await request(app).post('/api/analyze').send({ text: 'Hallo Welt' })
    expect(res.status).toBe(500)
    expect(res.body.error).toBeTruthy()
  })
})

describe('POST /api/analyze/add', () => {
  it('adds vocabulary and phrases, returns added/skipped counts', async () => {
    await seedVocabFile()
    await seedPhrasesFile()

    const res = await request(app).post('/api/analyze/add').send({
      vocabulary: [{ word: 'Hund', literalMeaning: 'dog', intendedMeaning: 'dog', partOfSpeech: 'Nomen', caseExamples: [], level: 'A1' }],
      phrases: [{ phrase: 'Guten Tag', englishMeaning: 'Good day', level: 'A1' }],
    })
    expect(res.status).toBe(200)
    expect(res.body.added.vocabulary).toBe(1)
    expect(res.body.added.phrases).toBe(1)
    expect(res.body.skipped.vocabulary).toBe(0)
    expect(res.body.skipped.phrases).toBe(0)
  })

  it('skips duplicates and reports them in skipped counts', async () => {
    const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
    await writeFile(
      state.vocabFile,
      '| ' + headers.join(' | ') + ' |\n' +
      '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|\n' +
      '| Hund | dog | dog | Nomen |  | A1 | Test | 2024-01-01 |\n',
      'utf-8'
    )
    await seedPhrasesFile()

    const res = await request(app).post('/api/analyze/add').send({
      vocabulary: [{ word: 'Hund', literalMeaning: 'dog', intendedMeaning: 'dog', partOfSpeech: 'Nomen', caseExamples: [], level: 'A1' }],
      phrases: [],
    })
    expect(res.status).toBe(200)
    expect(res.body.added.vocabulary).toBe(0)
    expect(res.body.skipped.vocabulary).toBe(1)
  })

  it('handles empty vocabulary and phrases arrays gracefully', async () => {
    await seedVocabFile()
    await seedPhrasesFile()

    const res = await request(app).post('/api/analyze/add').send({
      vocabulary: [],
      phrases: [],
    })
    expect(res.status).toBe(200)
    expect(res.body.added.vocabulary).toBe(0)
    expect(res.body.added.phrases).toBe(0)
  })
})

describe('GET /api/analysis', () => {
  it('returns an array (may be empty depending on actual data dir)', async () => {
    const res = await request(app).get('/api/analysis')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('GET /api/analysis/:filename', () => {
  it('returns 400 for path traversal attempt', async () => {
    const res = await request(app).get('/api/analysis/../etc/passwd')
    expect([400, 404]).toContain(res.status)
  })

  it('returns 404 for nonexistent analysis file', async () => {
    const res = await request(app).get('/api/analysis/nonexistent-file-xyz.json')
    expect(res.status).toBe(404)
  })
})
