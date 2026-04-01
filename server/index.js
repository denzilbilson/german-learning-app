import 'dotenv/config'
import express from 'express'
import cors    from 'cors'
import { mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import vocabularyRouter from './routes/vocabulary.js'
import phrasesRouter    from './routes/phrases.js'
import analyzeRouter    from './routes/analyze.js'
import ankiRouter       from './routes/anki.js'
import practiceRouter   from './routes/practice.js'
import progressRouter   from './routes/progress.js'
import dashboardRouter  from './routes/dashboard.js'
import grammarRouter    from './routes/grammar.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = resolve(__dirname, '../data')
const app  = express()
const PORT = process.env.PORT || 3001

// ── Startup validation ────────────────────────────────────────────
async function ensureDataDirs() {
  const dirs = [
    DATA_DIR,
    resolve(DATA_DIR, 'analysis'),
    resolve(DATA_DIR, 'anki'),
    resolve(DATA_DIR, 'grammar'),
    resolve(DATA_DIR, 'progress'),
  ]
  await Promise.all(dirs.map(d => mkdir(d, { recursive: true })))
}

// ── Request logger ────────────────────────────────────────────────
app.use((req, _res, next) => {
  req._startTime = Date.now()
  next()
})

app.use((req, res, next) => {
  const orig = res.json.bind(res)
  res.json = (...args) => {
    const ms = Date.now() - (req._startTime || Date.now())
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`)
    return orig(...args)
  }
  next()
})

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Phase 2 routes ────────────────────────────────────────────────
app.use('/api/vocabulary', vocabularyRouter)
app.use('/api/phrases',    phrasesRouter)

// ── Phase 3 routes ────────────────────────────────────────────────
app.use('/api/analyze',  analyzeRouter)
app.use('/api/analysis', analyzeRouter)

// ── Phase 4 routes ────────────────────────────────────────────────
app.use('/api/anki', ankiRouter)

// ── Phase 5 routes ────────────────────────────────────────────────
app.use('/api/practice', practiceRouter)
app.use('/api/progress', progressRouter)

// ── Phase 6 routes ────────────────────────────────────────────────
app.use('/api/dashboard', dashboardRouter)
app.use('/api/grammar',   grammarRouter)

// ── 404 fallthrough ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: true, message: 'Not found', code: 'NOT_FOUND' })
})

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const ts = new Date().toISOString()
  console.error(`[${ts}] Unhandled error on ${req.method} ${req.path}:`, err.message)
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error:   true,
    message: err.message || 'Internal server error',
    code:    err.code    || 'INTERNAL_ERROR',
  })
})

// ── Uncaught exceptions / rejections ─────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
  process.exit(1)
})

// ── Start server ──────────────────────────────────────────────────
ensureDataDirs()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`)
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[WARN] ANTHROPIC_API_KEY is not set — AI features will not work')
      }
    })
  })
  .catch(err => {
    console.error('[FATAL] Failed to initialize data directories:', err)
    process.exit(1)
  })
