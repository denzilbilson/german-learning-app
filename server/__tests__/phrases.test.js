/**
 * Tests for phrases routes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const state = vi.hoisted(() => ({ phrasesFile: '' }))

vi.mock('../services/markdown-store.js', async () => {
  const actual = await vi.importActual('../services/markdown-store.js')
  return {
    ...actual,
    DATA_DIR: '/tmp',
    getAll:  (...args) => actual.getAll(state.phrasesFile, args[1]),
    add:     (...args) => actual.add(state.phrasesFile, args[1]),
    update:  (...args) => actual.update(state.phrasesFile, args[1], args[2]),
    remove:  (...args) => actual.remove(state.phrasesFile, args[1]),
  }
})

import phrasesRouter from '../routes/phrases.js'

let tmpDir
let app

function seedPhrasesFile(rows = []) {
  const headers = ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added']
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => (r[h] || '')).join(' | ') + ' |'
  )
  return writeFile(state.phrasesFile, [hRow, sep, ...dRows].join('\n') + '\n', 'utf-8')
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'phrases-route-test-'))
  state.phrasesFile = join(tmpDir, 'phrases.md')

  app = express()
  app.use(express.json())
  app.use('/api/phrases', phrasesRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('GET /api/phrases', () => {
  it('returns 200 and an array', async () => {
    await seedPhrasesFile()
    const res = await request(app).get('/api/phrases')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns seeded entries', async () => {
    await seedPhrasesFile([
      { Phrase: 'Guten Tag', 'English Meaning': 'Good day', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
      { Phrase: 'Auf Wiedersehen', 'English Meaning': 'Goodbye', Level: 'A1', Source: 'Test', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/phrases')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('?search= filters results correctly', async () => {
    await seedPhrasesFile([
      { Phrase: 'Guten Tag', 'English Meaning': 'Good day', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Phrase: 'Auf Wiedersehen', 'English Meaning': 'Goodbye', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/phrases?search=guten')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].Phrase).toBe('Guten Tag')
  })

  it('?level=B1 filters by level', async () => {
    await seedPhrasesFile([
      { Phrase: 'Guten Tag', 'English Meaning': 'Good day', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Phrase: 'Es tut mir leid', 'English Meaning': 'I am sorry', Level: 'B1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).get('/api/phrases?level=B1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].Level).toBe('B1')
  })
})

describe('POST /api/phrases', () => {
  it('adds entry and returns 201', async () => {
    await seedPhrasesFile()
    const entry = { Phrase: 'Wie bitte?', 'English Meaning': 'Pardon?', Level: 'A1', Source: 'Test' }
    const res = await request(app).post('/api/phrases').send(entry)
    expect(res.status).toBe(201)
    expect(res.body[0].Phrase).toBe('Wie bitte?')
  })

  it('returns 400 for empty array body', async () => {
    await seedPhrasesFile()
    const res = await request(app).post('/api/phrases').send([])
    expect(res.status).toBe(400)
  })

  it('adds multiple entries from array body', async () => {
    await seedPhrasesFile()
    const entries = [
      { Phrase: 'Guten Morgen', 'English Meaning': 'Good morning', Level: 'A1', Source: '' },
      { Phrase: 'Gute Nacht', 'English Meaning': 'Good night', Level: 'A1', Source: '' },
    ]
    const res = await request(app).post('/api/phrases').send(entries)
    expect(res.status).toBe(201)
    expect(res.body).toHaveLength(2)
  })

  it('changes persist after POST', async () => {
    await seedPhrasesFile()
    await request(app).post('/api/phrases').send({ Phrase: 'Bitte', 'English Meaning': 'Please', Level: 'A1', Source: '' })
    const getRes = await request(app).get('/api/phrases')
    expect(getRes.body.some(r => r.Phrase === 'Bitte')).toBe(true)
  })
})

describe('PUT /api/phrases/:index', () => {
  it('updates entry at valid index and returns 200', async () => {
    await seedPhrasesFile([
      { Phrase: 'Danke', 'English Meaning': 'Thanks', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).put('/api/phrases/0').send({ Level: 'A2' })
    expect(res.status).toBe(200)
    expect(res.body.Level).toBe('A2')
  })

  it('returns 404 for out-of-bounds index', async () => {
    await seedPhrasesFile([
      { Phrase: 'Danke', 'English Meaning': 'Thanks', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).put('/api/phrases/99').send({ Level: 'A2' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/phrases/:index', () => {
  it('deletes valid entry and returns 200', async () => {
    await seedPhrasesFile([
      { Phrase: 'Danke', 'English Meaning': 'Thanks', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    const res = await request(app).delete('/api/phrases/0')
    expect(res.status).toBe(200)
    expect(res.body.Phrase).toBe('Danke')
  })

  it('returns 404 for out-of-bounds delete', async () => {
    await seedPhrasesFile()
    const res = await request(app).delete('/api/phrases/99')
    expect(res.status).toBe(404)
  })

  it('changes persist after DELETE', async () => {
    await seedPhrasesFile([
      { Phrase: 'Hallo', 'English Meaning': 'Hello', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
      { Phrase: 'Tschüss', 'English Meaning': 'Bye', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
    ])
    await request(app).delete('/api/phrases/0')
    const getRes = await request(app).get('/api/phrases')
    expect(getRes.body).toHaveLength(1)
    expect(getRes.body[0].Phrase).toBe('Tschüss')
  })
})
