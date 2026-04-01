import { Router } from 'express'
import { resolve } from 'path'
import { DATA_DIR, getAll } from '../services/markdown-store.js'
import { callClaude } from '../services/claude-service.js'
import { buildGeneratePrompt } from '../prompts/generate-practice.js'
import { CHECK_ANSWER_SYSTEM, buildCheckMessage } from '../prompts/check-answer.js'

const router = Router()
const VOCAB_FILE = resolve(DATA_DIR, 'vocabulary.md')

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// POST /api/practice/generate
router.post('/generate', async (req, res) => {
  try {
    const { mode, count = 10, level } = req.body

    if (!mode) return res.status(400).json({ error: 'mode is required' })

    const query = level ? { level } : {}
    const vocabulary = await getAll(VOCAB_FILE, query)

    if (vocabulary.length === 0) {
      return res.status(400).json({ error: 'No vocabulary found. Add some words first.' })
    }

    // Flashcard: no Claude call — shuffle vocab and return directly
    if (mode === 'flashcard') {
      const cards = shuffle(vocabulary).slice(0, count)
      return res.json({
        questions: cards.map((w, i) => ({
          id: i,
          type: 'flashcard',
          front: w.Word,
          partOfSpeech: w['Part of Speech'] || '',
          back: w['Intended Meaning'] || '',
          literalMeaning: w['Literal Meaning'] || '',
          caseExamples: w['Case Examples'] || '',
          level: w.Level || '',
        })),
      })
    }

    // All other modes — generate with Claude
    const actualCount = Math.min(count, vocabulary.length * 2, 15)
    const { system, user } = buildGeneratePrompt(mode, vocabulary, actualCount)
    const result = await callClaude(system, user)

    // Ensure result has the expected shape
    if (!result.questions || !Array.isArray(result.questions)) {
      return res.status(500).json({ error: 'Claude returned an unexpected response structure.' })
    }

    return res.json(result)
  } catch (err) {
    console.error('[practice/generate]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/practice/check
router.post('/check', async (req, res) => {
  try {
    const { question, userAnswer, correctAnswer, mode } = req.body

    if (!userAnswer || !correctAnswer || !mode) {
      return res.status(400).json({ error: 'question, userAnswer, correctAnswer, and mode are required' })
    }

    const userMsg = buildCheckMessage(question, userAnswer, correctAnswer, mode)
    const result = await callClaude(CHECK_ANSWER_SYSTEM, userMsg)

    return res.json(result)
  } catch (err) {
    console.error('[practice/check]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
