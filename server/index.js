import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes (wired in later phases) ───────────────────────────────
// import vocabularyRouter from './routes/vocabulary.js'
// import phrasesRouter   from './routes/phrases.js'
// import analyzeRouter   from './routes/analyze.js'
// import ankiRouter      from './routes/anki.js'
// import practiceRouter  from './routes/practice.js'
// import progressRouter  from './routes/progress.js'
// import dashboardRouter from './routes/dashboard.js'

// app.use('/api/vocabulary', vocabularyRouter)
// app.use('/api/phrases',    phrasesRouter)
// app.use('/api/analyze',    analyzeRouter)
// app.use('/api/anki',       ankiRouter)
// app.use('/api/practice',   practiceRouter)
// app.use('/api/progress',   progressRouter)
// app.use('/api/dashboard',  dashboardRouter)

// ── Stub routes so the frontend can render without errors ─────────
app.get('/api/vocabulary', (_req, res) => res.json([]))
app.get('/api/phrases',    (_req, res) => res.json([]))
app.get('/api/grammar',    (_req, res) => res.json([]))
app.get('/api/dashboard',  (_req, res) => res.json({ vocab: 0, phrases: 0, daysActive: 0 }))

// ── 404 fallthrough ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
