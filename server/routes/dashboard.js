import { Router } from 'express'
import { readdir, readFile, stat } from 'fs/promises'
import { resolve, join } from 'path'
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

// GET /api/dashboard
router.get('/', async (_req, res) => {
  try {
    // ── Vocabulary ────────────────────────────────────────────────
    const vocabContent = await readFile(resolve(DATA_DIR, 'vocabulary.md'), 'utf-8')
    const vocabRows = parseMdTable(vocabContent)

    // ── Phrases ───────────────────────────────────────────────────
    const phrasesContent = await readFile(resolve(DATA_DIR, 'phrases.md'), 'utf-8')
    const phrasesRows = parseMdTable(phrasesContent)

    // ── Level distribution ────────────────────────────────────────
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    const levelDistribution = Object.fromEntries(levels.map(l => [l, 0]))
    for (const row of vocabRows) {
      if (row.Level && levelDistribution[row.Level] !== undefined) {
        levelDistribution[row.Level]++
      }
    }

    // ── Words over time (cumulative) ──────────────────────────────
    const wordsByDate = {}
    for (const row of vocabRows) {
      const d = row['Date Added']
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        wordsByDate[d] = (wordsByDate[d] || 0) + 1
      }
    }
    const allDates = Object.keys(wordsByDate).sort()
    const wordsOverTime = []
    let cumulative = 0
    for (const d of allDates) {
      cumulative += wordsByDate[d]
      wordsOverTime.push({ date: d, count: cumulative })
    }

    // ── Days active ───────────────────────────────────────────────
    const now = new Date()
    let daysActive = 0
    if (allDates.length > 0) {
      const earliest = new Date(allDates[0])
      daysActive = Math.floor((now - earliest) / (1000 * 60 * 60 * 24)) + 1
    }

    // ── Added this week / month ───────────────────────────────────
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const addedThisWeek = vocabRows.filter(r => {
      const d = new Date(r['Date Added'] || '')
      return !isNaN(d) && d >= oneWeekAgo
    }).length
    const addedThisMonth = vocabRows.filter(r => {
      const d = new Date(r['Date Added'] || '')
      return !isNaN(d) && d >= oneMonthAgo
    }).length

    // ── Recent analyses ───────────────────────────────────────────
    const analysisDir = resolve(DATA_DIR, 'analysis')
    let recentAnalyses = []
    try {
      const files = await readdir(analysisDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))
      const withStats = await Promise.all(
        jsonFiles.map(async f => {
          const s = await stat(join(analysisDir, f))
          // Try to read the source field from the analysis file
          let source = ''
          try {
            const raw = await readFile(join(analysisDir, f), 'utf-8')
            const parsed = JSON.parse(raw)
            source = parsed.source || ''
          } catch {}
          return { filename: f, createdAt: s.mtime.toISOString(), source }
        })
      )
      recentAnalyses = withStats
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    } catch {}

    // ── Practice stats ────────────────────────────────────────────
    const progressContent = await readFile(resolve(DATA_DIR, 'progress/log.md'), 'utf-8')
    const progressRows = parseMdTable(progressContent)
    let practiceStats = { totalSessions: 0, avgScore: 0, lastSession: null }
    if (progressRows.length > 0) {
      const totalSessions = progressRows.length
      const avgScore = Math.round(
        progressRows.reduce((sum, r) => {
          const score = parseInt(r.Score, 10)
          const total = parseInt(r.Total, 10)
          return sum + (total > 0 ? (score / total) * 100 : 0)
        }, 0) / totalSessions
      )
      const lastSession = progressRows[progressRows.length - 1]?.Date || null
      practiceStats = { totalSessions, avgScore, lastSession }
    }

    res.json({
      totalVocab: vocabRows.length,
      totalPhrases: phrasesRows.length,
      daysActive,
      addedThisWeek,
      addedThisMonth,
      recentAnalyses,
      practiceStats,
      levelDistribution,
      wordsOverTime,
    })
  } catch (err) {
    console.error('[dashboard GET]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
