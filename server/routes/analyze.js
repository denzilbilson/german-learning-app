import express from 'express'
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { callClaude } from '../services/claude-service.js'
import { analyzeTextPrompt } from '../prompts/analyze-text.js'
import * as store from '../services/markdown-store.js'

const router = express.Router()
const __dirname = dirname(fileURLToPath(import.meta.url))

const ANALYSIS_DIR = resolve(__dirname, '../../data/analysis')
const VOCAB_FILE   = resolve(__dirname, '../../data/vocabulary.md')
const PHRASES_FILE = resolve(__dirname, '../../data/phrases.md')

// Ensure analysis directory exists
mkdirSync(ANALYSIS_DIR, { recursive: true })

// ── POST /api/analyze ─────────────────────────────────────────────
// Submit German text for AI analysis
router.post('/', async (req, res) => {
  const { text, source } = req.body
  if (!text?.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const userMessage = source?.trim()
      ? `Analyze this German text (source: ${source.trim()}):\n\n${text.trim()}`
      : `Analyze this German text:\n\n${text.trim()}`

    const result = await callClaude(analyzeTextPrompt, userMessage)

    // Persist to disk
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename  = `analysis-${timestamp}.json`
    const payload   = {
      ...result,
      source:       source?.trim() || null,
      originalText: text.trim(),
      savedAt:      new Date().toISOString(),
    }
    writeFileSync(join(ANALYSIS_DIR, filename), JSON.stringify(payload, null, 2), 'utf-8')

    res.json({ ...payload, filename })
  } catch (err) {
    console.error('[POST /api/analyze]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/analyze/add ─────────────────────────────────────────
// Add selected items from an analysis to the markdown databases
router.post('/add', async (req, res) => {
  const { vocabulary = [], phrases = [], source } = req.body

  try {
    const [existingVocab, existingPhrases] = await Promise.all([
      store.getAll(VOCAB_FILE),
      store.getAll(PHRASES_FILE),
    ])

    const existingWords     = new Set(existingVocab.map(v  => v.Word?.toLowerCase().trim()))
    const existingPhraseSet = new Set(existingPhrases.map(p => p.Phrase?.toLowerCase().trim()))

    const newVocab   = vocabulary.filter(v => !existingWords.has(v.word?.toLowerCase().trim()))
    const newPhrases = phrases.filter(p   => !existingPhraseSet.has(p.phrase?.toLowerCase().trim()))

    if (newVocab.length > 0) {
      await store.add(
        VOCAB_FILE,
        newVocab.map(v => ({
          'Word':             v.word,
          'Literal Meaning':  v.literalMeaning,
          'Intended Meaning': v.intendedMeaning,
          'Part of Speech':   v.partOfSpeech,
          'Case Examples':    Array.isArray(v.caseExamples)
                                ? v.caseExamples.join('<br>')
                                : (v.caseExamples || ''),
          'Level':            v.level,
          'Source':           source?.trim() || 'Text Analysis',
        }))
      )
    }

    if (newPhrases.length > 0) {
      await store.add(
        PHRASES_FILE,
        newPhrases.map(p => ({
          'Phrase':          p.phrase,
          'English Meaning': p.englishMeaning,
          'Level':           p.level,
          'Source':          source?.trim() || 'Text Analysis',
        }))
      )
    }

    res.json({
      added:   { vocabulary: newVocab.length,                    phrases: newPhrases.length },
      skipped: { vocabulary: vocabulary.length - newVocab.length, phrases: phrases.length - newPhrases.length },
    })
  } catch (err) {
    console.error('[POST /api/analyze/add]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── GET / (mounted at /api/analysis) — list saved analyses ────────
router.get('/', (_req, res) => {
  try {
    const files = readdirSync(ANALYSIS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .map(filename => {
        try {
          const raw  = readFileSync(join(ANALYSIS_DIR, filename), 'utf-8')
          const data = JSON.parse(raw)
          return {
            filename,
            savedAt:      data.savedAt || statSync(join(ANALYSIS_DIR, filename)).mtime.toISOString(),
            source:       data.source  || null,
            vocabCount:   (data.vocabulary || []).length,
            phraseCount:  (data.phrases    || []).length,
            preview:      (data.originalText || '').slice(0, 120),
          }
        } catch {
          return { filename, savedAt: null, source: null, vocabCount: 0, phraseCount: 0, preview: '' }
        }
      })
    res.json(files)
  } catch {
    res.json([])
  }
})

// ── GET /:filename (mounted at /api/analysis) — get one analysis ──
router.get('/:filename', (req, res) => {
  const { filename } = req.params
  // Only allow safe filenames — alphanumeric, hyphens, and .json
  if (!/^[\w-]+\.json$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  try {
    const raw = readFileSync(join(ANALYSIS_DIR, filename), 'utf-8')
    res.json(JSON.parse(raw))
  } catch {
    res.status(404).json({ error: 'Analysis not found' })
  }
})

export default router
