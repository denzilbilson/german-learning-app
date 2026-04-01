/**
 * Tests for practice routes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const state = vi.hoisted(() => ({ vocabFile: '' }))

vi.mock('../services/markdown-store.js', async () => {
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

const claudeMock = vi.hoisted(() => ({ callClaude: vi.fn() }))
vi.mock('../services/claude-service.js', () => claudeMock)

vi.mock('../prompts/generate-practice.js', () => ({
  buildGeneratePrompt: vi.fn((mode, vocab, count) => ({
    system: 'generate system',
    user: `Generate ${count} ${mode} questions`,
  })),
}))

vi.mock('../prompts/check-answer.js', () => ({
  CHECK_ANSWER_SYSTEM: 'check answer system',
  buildCheckMessage: vi.fn((question, userAnswer, correctAnswer, mode) =>
    `Check: ${userAnswer} vs ${correctAnswer}`
  ),
}))

import practiceRouter from '../routes/practice.js'

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

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'practice-route-test-'))
  state.vocabFile = join(tmpDir, 'vocabulary.md')
  claudeMock.callClaude.mockClear()

  app = express()
  app.use(express.json())
  app.use('/api/practice', practiceRouter)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
  vi.clearAllMocks()
})

const SAMPLE_VOCAB = [
  { Word: 'Hund', 'Literal Meaning': 'dog', 'Intended Meaning': 'dog', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
  { Word: 'Katze', 'Literal Meaning': 'cat', 'Intended Meaning': 'cat', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'A1', Source: '', 'Date Added': '2024-01-01' },
  { Word: 'Haus', 'Literal Meaning': 'house', 'Intended Meaning': 'house', 'Part of Speech': 'Nomen', 'Case Examples': '', Level: 'B1', Source: '', 'Date Added': '2024-01-01' },
]

describe('POST /api/practice/generate', () => {
  it('returns 400 when mode is missing', async () => {
    await seedVocab(SAMPLE_VOCAB)
    const res = await request(app).post('/api/practice/generate').send({ count: 5 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('mode')
  })

  it('returns 400 when vocabulary is empty', async () => {
    await seedVocab([])
    const res = await request(app).post('/api/practice/generate').send({ mode: 'flashcard', count: 5 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('vocabulary')
  })

  it('flashcard mode returns questions without calling Claude', async () => {
    await seedVocab(SAMPLE_VOCAB)
    const res = await request(app).post('/api/practice/generate').send({ mode: 'flashcard', count: 3 })
    expect(res.status).toBe(200)
    expect(res.body.questions).toBeDefined()
    expect(Array.isArray(res.body.questions)).toBe(true)
    expect(claudeMock.callClaude).not.toHaveBeenCalled()
    expect(res.body.questions[0].type).toBe('flashcard')
    expect(res.body.questions[0].front).toBeTruthy()
  })

  it('quiz mode calls Claude and returns questions from its response', async () => {
    await seedVocab(SAMPLE_VOCAB)
    claudeMock.callClaude.mockResolvedValueOnce({
      questions: [
        { id: 0, type: 'quiz', question: 'What does Hund mean?', options: ['cat', 'dog', 'house', 'tree'], answer: 'dog' },
      ],
    })
    const res = await request(app).post('/api/practice/generate').send({ mode: 'quiz', count: 1 })
    expect(res.status).toBe(200)
    expect(res.body.questions).toHaveLength(1)
    expect(claudeMock.callClaude).toHaveBeenCalled()
  })
})

describe('POST /api/practice/check', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/practice/check').send({ question: 'Test' })
    expect(res.status).toBe(400)
  })

  it('returns feedback from Claude for a correct answer', async () => {
    claudeMock.callClaude.mockResolvedValueOnce({
      correct: true,
      explanation: 'Great job!',
      score: 1,
    })
    const res = await request(app).post('/api/practice/check').send({
      question: 'What does Hund mean?',
      userAnswer: 'dog',
      correctAnswer: 'dog',
      mode: 'translation',
    })
    expect(res.status).toBe(200)
    expect(res.body.correct).toBe(true)
    expect(res.body.explanation).toBe('Great job!')
  })

  it('returns feedback from Claude for a wrong answer', async () => {
    claudeMock.callClaude.mockResolvedValueOnce({
      correct: false,
      explanation: 'Not quite. Hund means dog, not cat.',
      score: 0,
    })
    const res = await request(app).post('/api/practice/check').send({
      question: 'What does Hund mean?',
      userAnswer: 'cat',
      correctAnswer: 'dog',
      mode: 'translation',
    })
    expect(res.status).toBe(200)
    expect(res.body.correct).toBe(false)
  })
})
