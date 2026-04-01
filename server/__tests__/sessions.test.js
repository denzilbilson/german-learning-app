/**
 * Tests for sessions routes.
 *
 * The sessions route computes SESSIONS_DIR from DATA_DIR at module load time.
 * We mock fs/promises to redirect all session file operations to a temp dir.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, mkdir, writeFile as realWriteFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// We'll keep a reference to the sessions dir to use in mocks
let sessionsDir = ''

const fsMock = vi.hoisted(() => ({
  sessionsDir: '',
}))

// Mock fs/promises to redirect session file operations
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises')
  return {
    ...actual,
    readFile: (path, enc) => {
      if (fsMock.sessionsDir && path.includes('sessions')) {
        const fname = path.split('/').pop()
        return actual.readFile(join(fsMock.sessionsDir, fname), enc)
      }
      return actual.readFile(path, enc)
    },
    readdir: (path) => {
      if (fsMock.sessionsDir && path.includes('sessions')) {
        return actual.readdir(fsMock.sessionsDir)
      }
      return actual.readdir(path)
    },
    unlink: (path) => {
      if (fsMock.sessionsDir && path.includes('sessions')) {
        const fname = path.split('/').pop()
        return actual.unlink(join(fsMock.sessionsDir, fname))
      }
      return actual.unlink(path)
    },
    mkdir: (path, opts) => actual.mkdir(path, opts),
    writeFile: (path, data, enc) => {
      if (fsMock.sessionsDir && path.includes('sessions')) {
        const fname = path.split('/').pop()
        return actual.writeFile(join(fsMock.sessionsDir, fname), data, enc)
      }
      return actual.writeFile(path, data, enc)
    },
  }
})

vi.mock('../services/markdown-store.js', async () => {
  const actual = await vi.importActual('../services/markdown-store.js')
  return { ...actual, DATA_DIR: '/tmp' }
})

import sessionsRouter from '../routes/sessions.js'

let tmpDir
let app

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'sessions-route-test-'))
  sessionsDir = join(tmpDir, 'sessions')
  fsMock.sessionsDir = sessionsDir
  await mkdir(sessionsDir, { recursive: true })

  app = express()
  app.use(express.json())
  app.use('/api/sessions', sessionsRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
  fsMock.sessionsDir = ''
})

function makeSession(id, overrides = {}) {
  return {
    id,
    datetime: new Date().toISOString(),
    mode: 'Flashcard',
    score: 8,
    totalQuestions: 10,
    durationMs: 60000,
    weakWords: ['Hund'],
    questions: [
      { word: 'Hund', question: 'What is Hund?', userAnswer: 'cat', correctAnswer: 'dog', correct: false, explanation: '', timeMs: 1000 },
      { word: 'Katze', question: 'What is Katze?', userAnswer: 'cat', correctAnswer: 'cat', correct: true, explanation: '', timeMs: 800 },
    ],
    ...overrides,
  }
}

describe('GET /api/sessions', () => {
  it('returns paginated sessions list with pagination metadata', async () => {
    await realWriteFile(join(sessionsDir, 'session-001.json'), JSON.stringify(makeSession('session-001')), 'utf-8')
    await realWriteFile(join(sessionsDir, 'session-002.json'), JSON.stringify(makeSession('session-002')), 'utf-8')

    const res = await request(app).get('/api/sessions')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.sessions)).toBe(true)
    expect(res.body.pagination).toBeDefined()
    expect(res.body.pagination.total).toBe(2)
  })

  it('returns empty sessions array when no sessions exist', async () => {
    const res = await request(app).get('/api/sessions')
    expect(res.status).toBe(200)
    expect(res.body.sessions).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })
})

describe('GET /api/sessions/:id', () => {
  it('returns full session data by id', async () => {
    const session = makeSession('test-session-123')
    await realWriteFile(join(sessionsDir, 'test-session-123.json'), JSON.stringify(session), 'utf-8')

    const res = await request(app).get('/api/sessions/test-session-123')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('test-session-123')
    expect(res.body.mode).toBe('Flashcard')
    expect(Array.isArray(res.body.questions)).toBe(true)
  })

  it('returns 404 for nonexistent session', async () => {
    const res = await request(app).get('/api/sessions/nonexistent-id')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/sessions/weak-words', () => {
  it('returns aggregated weak words across sessions', async () => {
    const s1 = makeSession('s1', {
      questions: [
        { word: 'Hund', correct: false },
        { word: 'Katze', correct: true },
      ],
    })
    const s2 = makeSession('s2', {
      questions: [
        { word: 'Hund', correct: false },
        { word: 'Haus', correct: false },
      ],
    })
    await realWriteFile(join(sessionsDir, 's1.json'), JSON.stringify(s1), 'utf-8')
    await realWriteFile(join(sessionsDir, 's2.json'), JSON.stringify(s2), 'utf-8')

    const res = await request(app).get('/api/sessions/weak-words')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const hund = res.body.find(w => w.word === 'Hund')
    expect(hund).toBeTruthy()
    expect(hund.timesWrong).toBe(2)
    expect(res.body.find(w => w.word === 'Katze')).toBeFalsy()
  })
})

describe('DELETE /api/sessions/:id', () => {
  it('deletes an existing session and returns ok', async () => {
    const session = makeSession('to-delete')
    await realWriteFile(join(sessionsDir, 'to-delete.json'), JSON.stringify(session), 'utf-8')

    const res = await request(app).delete('/api/sessions/to-delete')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const getRes = await request(app).get('/api/sessions/to-delete')
    expect(getRes.status).toBe(404)
  })

  it('returns 404 when trying to delete nonexistent session', async () => {
    const res = await request(app).delete('/api/sessions/does-not-exist')
    expect(res.status).toBe(404)
  })
})
