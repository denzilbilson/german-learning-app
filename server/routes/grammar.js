/**
 * Grammar routes
 *
 * GET /api/grammar — parse data/grammar/rules.md and return all grammar rules
 *   Response: array of { topic, explanation, examples, level }
 *   Keys are normalised to camelCase for the frontend.
 */
import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { DATA_DIR } from '../services/markdown-store.js'

const router = Router()

function parseMdTable(content) {
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'))
  if (lines.length < 2) return []
  const headers = lines[0].split('|').slice(1, -1).map(c => c.trim())
  const rows = []
  for (const line of lines.slice(1)) {
    const cells = line.split('|').slice(1, -1).map(c => c.trim())
    if (cells.every(c => /^[-: ]+$/.test(c))) continue
    if (cells.length !== headers.length) continue
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] })
    rows.push(obj)
  }
  return rows
}

// GET /api/grammar
router.get('/', async (_req, res) => {
  try {
    const content = await readFile(resolve(DATA_DIR, 'grammar/rules.md'), 'utf-8')
    const rows = parseMdTable(content)
    // Normalize to lowercase keys for frontend
    const normalized = rows.map(r => ({
      topic:       r.Topic       || r.topic       || '',
      explanation: r.Explanation || r.explanation || '',
      examples:    r.Examples    || r.examples    || '',
      level:       r.Level       || r.level       || '',
    }))
    res.json(normalized)
  } catch (err) {
    console.error('[grammar GET]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
