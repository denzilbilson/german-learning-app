/**
 * Tests for search routes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const state = vi.hoisted(() => ({ vocabFile: '', phrasesFile: '' }))

vi.mock('../services/markdown-store.js', async () => {
  const actual = await vi.importActual('../services/markdown-store.js')
  return {
    ...actual,
    DATA_DIR: '/tmp',
    getAll:  (filePath, query) => {
      // Route calls getAll with a path containing 'vocabulary' or 'phrases'
      // We redirect to temp files based on what path is passed
      if (filePath.includes('vocabulary')) return actual.getAll(state.vocabFile, query)
      if (filePath.includes('phrases')) return actual.getAll(state.phrasesFile, query)
      return actual.getAll(filePath, query)
    },
    add:     (...args) => actual.add(state.vocabFile, args[1]),
    update:  (...args) => actual.update(state.vocabFile, args[1], args[2]),
    remove:  (...args) => actual.remove(state.vocabFile, args[1]),
  }
})

import searchRouter from '../routes/search.js'

let tmpDir
let app

async function seedVocab(rows = []) {
  const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  await writeFile(state.vocabFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

async function seedPhrases(rows = []) {
  const headers = ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  await writeFile(state.phrasesFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'search-route-test-'))
  state.vocabFile = join(tmpDir, 'vocabulary.md')
  state.phrasesFile = join(tmpDir, 'phrases.md')

  await mkdir(join(tmpDir, 'grammar'), { recursive: true })
  await mkdir(join(tmpDir, 'analysis'), { recursive: true })

  // Empty grammar file (search route reads from DATA_DIR/grammar/rules.md via direct fs)
  const grammarHeaders = ['Topic', 'Explanation', 'Examples', 'Level']
  await writeFile(
    join(tmpDir, 'grammar', 'rules.md'),
    '| ' + grammarHeaders.join(' | ') + ' |\n' +
    '|' + grammarHeaders.map(h => '-'.repeat(h.length + 2)).join('|') + '|\n',
    'utf-8'
  )

  app = express()
  app.use('/api/search', searchRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('GET /api/search', () => {
  it('returns 400 when query is missing', async () => {
    const res = await request(app).get('/api/search')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('returns 400 for empty query string', async () => {
    const res = await request(app).get('/api/search?q=')
    expect(res.status).toBe(400)
  })

  it('returns grouped results object with query, total, and results', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    await seedPhrases([])
    const res = await request(app).get('/api/search?q=hund')
    expect(res.status).toBe(200)
    expect(res.body.query).toBe('hund')
    expect(typeof res.body.total).toBe('number')
    expect(res.body.results).toBeDefined()
    expect(Array.isArray(res.body.results.vocabulary)).toBe(true)
    expect(Array.isArray(res.body.results.phrases)).toBe(true)
  })

  it('type=vocabulary returns only vocabulary results, phrases is empty', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    await seedPhrases([{ Phrase: 'Hund bellt', 'English Meaning': 'dog barks', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    const res = await request(app).get('/api/search?q=hund&type=vocabulary')
    expect(res.status).toBe(200)
    expect(res.body.results.vocabulary.length).toBeGreaterThan(0)
    expect(res.body.results.phrases).toEqual([])
  })

  it('search is case insensitive', async () => {
    await seedVocab([{ Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    await seedPhrases([])
    const res = await request(app).get('/api/search?q=HUND')
    expect(res.status).toBe(200)
    expect(res.body.results.vocabulary.length).toBeGreaterThan(0)
    expect(res.body.results.vocabulary[0].title).toBe('Hund')
  })

  it('search results include title, snippet, and score fields', async () => {
    await seedVocab([{ Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    await seedPhrases([])
    const res = await request(app).get('/api/search?q=katze')
    expect(res.status).toBe(200)
    const result = res.body.results.vocabulary[0]
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('snippet')
    expect(result).toHaveProperty('score')
  })

  it('ä matches ae in search (German character normalization)', async () => {
    await seedVocab([{ Word: 'Mädchen', 'Literal Meaning': 'girl', 'Intended Meaning': 'girl', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' }])
    await seedPhrases([])
    const res = await request(app).get('/api/search?q=maedchen')
    expect(res.status).toBe(200)
    expect(res.body.results.vocabulary.length).toBeGreaterThan(0)
  })
})
