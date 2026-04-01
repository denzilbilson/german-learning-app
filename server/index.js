import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import vocabularyRouter from './routes/vocabulary.js'
import phrasesRouter    from './routes/phrases.js'
import analyzeRouter    from './routes/analyze.js'
import ankiRouter       from './routes/anki.js'
import practiceRouter   from './routes/practice.js'
import progressRouter   from './routes/progress.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Phase 2 routes ────────────────────────────────────────────────
app.use('/api/vocabulary', vocabularyRouter)
app.use('/api/phrases',    phrasesRouter)

// ── Phase 3 routes ────────────────────────────────────────────────
// POST /api/analyze, POST /api/analyze/add
app.use('/api/analyze',  analyzeRouter)
// GET /api/analysis, GET /api/analysis/:filename
app.use('/api/analysis', analyzeRouter)

// ── Phase 4 routes ────────────────────────────────────────────────
app.use('/api/anki', ankiRouter)

// ── Phase 5 routes ────────────────────────────────────────────────
app.use('/api/practice',  practiceRouter)
app.use('/api/progress',  progressRouter)

app.get('/api/grammar',   (_req, res) => res.json([]))
app.get('/api/dashboard', (_req, res) => res.json({ vocab: 0, phrases: 0, daysActive: 0 }))

// ── 404 fallthrough ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
