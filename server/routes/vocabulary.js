/**
 * Vocabulary routes
 *
 * GET    /api/vocabulary              — list all entries (query: ?level=, ?search=, ?since=)
 * POST   /api/vocabulary              — add one or more entries
 * PUT    /api/vocabulary/:index       — update entry at row index
 * DELETE /api/vocabulary/:index       — delete entry at row index
 * POST   /api/vocabulary/conjugate    — conjugate a verb via Claude (result cached to disk)
 */
import { Router }  from 'express'
import { resolve }  from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import * as store   from '../services/markdown-store.js'
import { callClaude } from '../services/claude-service.js'
import { buildConjugatePrompt } from '../prompts/conjugate-verb.js'

const VOCAB_FILE       = resolve(store.DATA_DIR, 'vocabulary.md')
const CONJUGATIONS_DIR = resolve(store.DATA_DIR, 'conjugations')
const router = Router()

router.get('/', async (req, res) => {
  try {
    res.json(await store.getAll(VOCAB_FILE, req.query))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body
    if (!body || (Array.isArray(body) && body.length === 0))
      return res.status(400).json({ error: 'No entries provided' })
    res.status(201).json(await store.add(VOCAB_FILE, body))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (isNaN(idx)) return res.status(400).json({ error: 'Invalid index' })
    res.json(await store.update(VOCAB_FILE, idx, req.body))
  } catch (e) {
    res.status(e.message.includes('out of range') ? 404 : 500).json({ error: e.message })
  }
})

router.delete('/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (isNaN(idx)) return res.status(400).json({ error: 'Invalid index' })
    res.json(await store.remove(VOCAB_FILE, idx))
  } catch (e) {
    res.status(e.message.includes('out of range') ? 404 : 500).json({ error: e.message })
  }
})

// ── POST /api/vocabulary/conjugate ────────────────────────────────
router.post('/conjugate', async (req, res) => {
  try {
    const { verb } = req.body
    if (!verb || typeof verb !== 'string') {
      return res.status(400).json({ error: 'verb is required' })
    }
    const cleaned = verb.trim().toLowerCase()

    // Cache check
    await mkdir(CONJUGATIONS_DIR, { recursive: true })
    const cacheFile = resolve(CONJUGATIONS_DIR, `${cleaned.replace(/[^a-züäöß]/g, '_')}.json`)
    try {
      const cached = await readFile(cacheFile, 'utf-8')
      return res.json(JSON.parse(cached))
    } catch {}

    // Call Claude
    const prompt = buildConjugatePrompt(cleaned)
    const result = await callClaude(prompt.system, prompt.user)

    // Write cache
    await writeFile(cacheFile, JSON.stringify(result, null, 2), 'utf-8')

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
