/**
 * Tests for vocabulary routes.
 *
 * Strategy: fully mock the store with real implementations obtained via vi.importActual.
 * Each test redirects calls to a temp-dir vocabulary file.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// These hold references to real (unhoisted) functions — set in beforeEach via importActual
let realGetAll, realAdd, realUpdate, realRemove

const state = vi.hoisted(() => ({ vocabFile: '' }))

vi.mock('../services/markdown-store.js', async () => {
  // importActual inside mock factory gives us the real module
  const actual = await vi.importActual('../services/markdown-store.js')
  return {
    ...actual,
    DATA_DIR: '/tmp',
    getAll:  (...args) => actual.getAll(state.vocabFile, args[1]),
    add:     (...args) => actual.add(state.vocabFile, args[1]),
    update:  (...args) => actual.update(state.vocabFile, args[1], args[2]),
    remove:  (...args) => actual.remove(state.vocabFile, args[1]),
  }
})

vi.mock('../prompts/conjugate-verb.js', () => ({
  buildConjugatePrompt: vi.fn(() => ({ system: 'sys', user: 'usr' })),
}))
vi.mock('../services/claude-service.js', () => ({
  callClaude: vi.fn(),
}))

import vocabRouter from '../routes/vocabulary.js'

let tmpDir
let app

function seedVocabFile(rows = []) {
  const headers = ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  return writeFile(state.vocabFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'vocab-route-test-'))
  state.vocabFile = join(tmpDir, 'vocabulary.md')

  app = express()
  app.use(express.json())
  app.use('/api/vocabulary', vocabRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('GET /api/vocabulary', () => {
  it('returns 200 and an array', async () => {
    await seedVocabFile()
    const res = await request(app).get('/api/vocabulary')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns seeded entries', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: 'Test', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/vocabulary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('?search= filters results correctly', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/vocabulary?search=hund')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].Word).toBe('Hund')
  })

  it('?level=B1 filters by level', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/vocabulary?level=B1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].Level).toBe('B1')
  })
})

describe('POST /api/vocabulary', () => {
  it('adds entry and returns 201 with created data', async () => {
    await seedVocabFile()
    const entry = { Word: 'Schule', 'Literal Meaning': 'school', 'Intended Meaning': 'school', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: 'Test' }
    const res = await request(app).post('/api/vocabulary').send(entry)
    expect(res.status).toBe(201)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].Word).toBe('Schule')
  })

  it('returns 400 for empty array body', async () => {
    await seedVocabFile()
    const res = await request(app).post('/api/vocabulary').send([])
    expect(res.status).toBe(400)
  })

  it('adds multiple entries from array body', async () => {
    await seedVocabFile()
    const entries = [
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '' },
    ]
    const res = await request(app).post('/api/vocabulary').send(entries)
    expect(res.status).toBe(201)
    expect(res.body).toHaveLength(2)
  })

  it('changes persist after POST', async () => {
    await seedVocabFile()
    await request(app).post('/api/vocabulary').send({ Word: 'Haus', 'Literal Meaning': 'house', 'Intended Meaning': 'house', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: '' })
    const getRes = await request(app).get('/api/vocabulary')
    expect(getRes.body.some(r => r.Word === 'Haus')).toBe(true)
  })
})

describe('PUT /api/vocabulary/:index', () => {
  it('updates entry at valid index and returns 200', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).put('/api/vocabulary/0').send({ Level: 'B2' })
    expect(res.status).toBe(200)
    expect(res.body.Level).toBe('B2')
  })

  it('returns 404 for out-of-bounds index', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).put('/api/vocabulary/99').send({ Level: 'B2' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/vocabulary/:index', () => {
  it('deletes valid entry and returns 200 with the deleted row', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).delete('/api/vocabulary/0')
    expect(res.status).toBe(200)
    expect(res.body.Word).toBe('Hund')
  })

  it('returns 404 for out-of-bounds delete', async () => {
    await seedVocabFile()
    const res = await request(app).delete('/api/vocabulary/99')
    expect(res.status).toBe(404)
  })

  it('changes persist after DELETE', async () => {
    await seedVocabFile([
      { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    await request(app).delete('/api/vocabulary/0')
    const getRes = await request(app).get('/api/vocabulary')
    expect(getRes.body).toHaveLength(1)
    expect(getRes.body[0].Word).toBe('Katze')
  })
})
