/**
 * Phrases routes
 *
 * GET    /api/phrases          — list all phrase entries (query: ?level=, ?search=, ?since=)
 * POST   /api/phrases          — add one or more phrases
 * PUT    /api/phrases/:index   — update phrase at row index
 * DELETE /api/phrases/:index   — delete phrase at row index
 */
import { Router } from 'express'
import { resolve } from 'path'
import * as store from '../services/markdown-store.js'

const PHRASES_FILE = resolve(store.DATA_DIR, 'phrases.md')
const router = Router()

router.get('/', async (req, res) => {
  try {
    res.json(await store.getAll(PHRASES_FILE, req.query))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body
    if (!body || (Array.isArray(body) && body.length === 0))
      return res.status(400).json({ error: 'No entries provided' })
    res.status(201).json(await store.add(PHRASES_FILE, body))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (isNaN(idx)) return res.status(400).json({ error: 'Invalid index' })
    res.json(await store.update(PHRASES_FILE, idx, req.body))
  } catch (e) {
    res.status(e.message.includes('out of range') ? 404 : 500).json({ error: e.message })
  }
})

router.delete('/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (isNaN(idx)) return res.status(400).json({ error: 'Invalid index' })
    res.json(await store.remove(PHRASES_FILE, idx))
  } catch (e) {
    res.status(e.message.includes('out of range') ? 404 : 500).json({ error: e.message })
  }
})

export default router
