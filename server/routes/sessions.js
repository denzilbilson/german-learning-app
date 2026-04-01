/**
 * Practice session routes
 *
 * GET    /api/sessions              — paginated list of sessions (query: ?page=1&limit=20)
 *   Response: { sessions: [...], pagination: { page, limit, total, pages } }
 *
 * GET    /api/sessions/weak-words   — aggregate words with errors across all sessions
 *   Response: [{ word, timesSeen, timesWrong, errorRate, lastMissedDate }] sorted by timesWrong
 *
 * GET    /api/sessions/:id          — full session detail including all question/answer pairs
 *
 * DELETE /api/sessions/:id          — permanently delete a session JSON file
 */
import { Router } from 'express'
import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises'
import { resolve, join } from 'path'
import { DATA_DIR } from '../services/markdown-store.js'

const router       = Router()
const SESSIONS_DIR = resolve(DATA_DIR, 'progress/sessions')

async function ensureSessionsDir() {
  await mkdir(SESSIONS_DIR, { recursive: true })
}

async function listSessionFiles() {
  await ensureSessionsDir()
  try {
    const files = await readdir(SESSIONS_DIR)
    return files.filter(f => f.endsWith('.json')).sort().reverse() // newest first
  } catch {
    return []
  }
}

// ── GET /api/sessions ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10))
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10))

    const files = await listSessionFiles()
    const total = files.length
    const paged = files.slice((page - 1) * limit, page * limit)

    const sessions = (
      await Promise.all(
        paged.map(async (file) => {
          try {
            const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8')
            const s   = JSON.parse(raw)
            return {
              id:             s.id,
              datetime:       s.datetime,
              mode:           s.mode,
              score:          s.score,
              totalQuestions: s.totalQuestions,
              durationMs:     s.durationMs,
              weakWords:      s.weakWords || [],
            }
          } catch {
            return null
          }
        })
      )
    ).filter(Boolean)

    res.json({
      sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[sessions GET /]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/sessions/weak-words ──────────────────────────────────
// Must be registered before /:id to avoid route shadowing
router.get('/weak-words', async (_req, res) => {
  try {
    const files   = await listSessionFiles()
    const wordMap = {}

    for (const file of files) {
      try {
        const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8')
        const s   = JSON.parse(raw)
        const sessionDate = s.datetime || ''

        for (const q of (s.questions || [])) {
          const word = q.word || ''
          if (!word) continue
          if (!wordMap[word]) {
            wordMap[word] = { word, timesSeen: 0, timesWrong: 0, lastMissedDate: null }
          }
          wordMap[word].timesSeen++
          if (!q.correct) {
            wordMap[word].timesWrong++
            if (!wordMap[word].lastMissedDate || sessionDate > wordMap[word].lastMissedDate) {
              wordMap[word].lastMissedDate = sessionDate
            }
          }
        }
      } catch { /* skip malformed file */ }
    }

    const result = Object.values(wordMap)
      .map(w => ({
        ...w,
        errorRate: w.timesSeen > 0 ? Math.round((w.timesWrong / w.timesSeen) * 100) : 0,
      }))
      .filter(w => w.timesWrong > 0)
      .sort((a, b) => b.timesWrong - a.timesWrong)

    res.json(result)
  } catch (err) {
    console.error('[sessions GET /weak-words]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/sessions/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!/^[\w-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid session id' })
    }
    const raw = await readFile(join(SESSIONS_DIR, `${id}.json`), 'utf-8')
    res.json(JSON.parse(raw))
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Session not found' })
    console.error('[sessions GET /:id]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/sessions/:id ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!/^[\w-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid session id' })
    }
    await unlink(join(SESSIONS_DIR, `${id}.json`))
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Session not found' })
    console.error('[sessions DELETE /:id]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
