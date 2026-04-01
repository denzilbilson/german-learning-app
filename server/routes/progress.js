import { Router } from 'express'
import { resolve, join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { DATA_DIR } from '../services/markdown-store.js'

const router       = Router()
const LOG_FILE     = resolve(DATA_DIR, 'progress/log.md')
const SESSIONS_DIR = resolve(DATA_DIR, 'progress/sessions')

async function ensureSessionsDir() {
  await mkdir(SESSIONS_DIR, { recursive: true })
}

// GET /api/progress
router.get('/', async (_req, res) => {
  try {
    const content = await readFile(LOG_FILE, 'utf-8')
    const lines   = content.split('\n').filter(l => l.trim().startsWith('|'))
    if (lines.length < 2) return res.json([])

    const headers = lines[0].split('|').slice(1, -1).map(c => c.trim())
    const rows    = []

    for (const line of lines.slice(2)) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (cells.length !== headers.length) continue
      const obj = {}
      headers.forEach((h, i) => { obj[h] = cells[i] })
      rows.push(obj)
    }

    res.json(rows)
  } catch (err) {
    console.error('[progress GET]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/progress
// Body: { mode, score, total, duration?, notes?, durationMs?, questions?, weakWords? }
router.post('/', async (req, res) => {
  try {
    const {
      mode,
      score,
      total,
      duration,
      notes     = '',
      durationMs,
      questions = [],
      weakWords = [],
    } = req.body

    if (score == null || total == null || !mode) {
      return res.status(400).json({ error: 'mode, score, and total are required' })
    }

    // ── Build session id from current timestamp ───────────────────
    const now     = new Date()
    const date    = now.toISOString().slice(0, 10)
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '')
    const id      = `${date}-${timeStr}`

    // ── Persist full session JSON ─────────────────────────────────
    await ensureSessionsDir()
    const session = {
      id,
      datetime:       now.toISOString(),
      mode,
      score,
      totalQuestions: total,
      durationMs:     durationMs ?? (duration != null ? duration * 60_000 : null),
      weakWords,
      questions,
    }
    await writeFile(
      join(SESSIONS_DIR, `${id}.json`),
      JSON.stringify(session, null, 2),
      'utf-8'
    )

    // ── Append summary row to log.md ──────────────────────────────
    const row     = `| ${date} | ${mode} | ${score} | ${total} | ${duration ?? ''} | ${notes} |`
    const current = await readFile(LOG_FILE, 'utf-8').catch(() =>
      '| Date | Mode | Score | Total | Duration | Notes |\n|------|------|-------|-------|----------|-------|\n'
    )
    await writeFile(LOG_FILE, current.trimEnd() + '\n' + row + '\n', 'utf-8')

    res.json({ ok: true, id })
  } catch (err) {
    console.error('[progress POST]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
