import { Router } from 'express'
import { readFile, readdir } from 'fs/promises'
import { resolve, join } from 'path'
import { DATA_DIR, getAll } from '../services/markdown-store.js'

const router = Router()

const VOCAB_FILE   = resolve(DATA_DIR, 'vocabulary.md')
const PHRASES_FILE = resolve(DATA_DIR, 'phrases.md')
const GRAMMAR_FILE = resolve(DATA_DIR, 'grammar/rules.md')
const ANALYSIS_DIR = resolve(DATA_DIR, 'analysis')

// ── German char equivalence normalization ─────────────────────────

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

// ── Relevance scoring: exact=3, starts-with=2, contains=1 ─────────

function matchScore(field, query) {
  const f = normalize(field)
  const q = normalize(query)
  if (!f || !q) return 0
  if (f === q)           return 3
  if (f.startsWith(q))  return 2
  if (f.includes(q))    return 1
  return 0
}

function bestScore(fields, query) {
  return Math.max(0, ...fields.map(f => matchScore(f || '', query)))
}

function snippet(text, query, maxLen = 120) {
  if (!text) return ''
  const q    = normalize(query)
  const tNorm = normalize(text)
  const idx  = tNorm.indexOf(q)
  if (idx === -1) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 30)
  const end   = Math.min(text.length, idx + query.length + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

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

// ── Per-type search functions ─────────────────────────────────────

async function searchVocabulary(query) {
  try {
    const rows = await getAll(VOCAB_FILE)
    const results = []
    for (const row of rows) {
      const fields = [row.Word, row['Intended Meaning'], row['Literal Meaning'], row['Case Examples']]
      const score  = bestScore(fields, query)
      if (score > 0) {
        results.push({
          type:    'vocabulary',
          title:   row.Word || '',
          snippet: snippet(row['Intended Meaning'] || row['Literal Meaning'] || '', query),
          meta:    row.Level || '',
          score,
          data:    row,
        })
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 20)
  } catch {
    return []
  }
}

async function searchPhrases(query) {
  try {
    const rows = await getAll(PHRASES_FILE)
    const results = []
    for (const row of rows) {
      const fields = [row.Phrase, row['English Meaning']]
      const score  = bestScore(fields, query)
      if (score > 0) {
        results.push({
          type:    'phrases',
          title:   row.Phrase || '',
          snippet: snippet(row['English Meaning'] || '', query),
          meta:    row.Level || '',
          score,
          data:    row,
        })
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 20)
  } catch {
    return []
  }
}

async function searchGrammar(query) {
  try {
    const content = await readFile(GRAMMAR_FILE, 'utf-8')
    const rows    = parseMdTable(content)
    const results = []
    for (const row of rows) {
      const topic       = row.Topic       || row.topic       || ''
      const explanation = row.Explanation || row.explanation || ''
      const examples    = row.Examples    || row.examples    || ''
      const level       = row.Level       || row.level       || ''
      const score       = bestScore([topic, explanation, examples], query)
      if (score > 0) {
        results.push({
          type:    'grammar',
          title:   topic,
          snippet: snippet(explanation, query),
          meta:    level,
          score,
          data:    { topic, explanation, examples, level },
        })
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 20)
  } catch {
    return []
  }
}

async function searchAnalyses(query) {
  try {
    const files   = await readdir(ANALYSIS_DIR)
    const results = []
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const content = await readFile(join(ANALYSIS_DIR, file), 'utf-8')
        const data    = JSON.parse(content)
        const origText  = (data.originalText || '').slice(0, 800)
        const source    = data.source || ''
        const vocabWords = (data.vocabulary || [])
          .map(v => v.word || v.Word || '').join(' ')
        const score = bestScore([origText, source, vocabWords], query)
        if (score > 0) {
          const displayTitle = source
            || file.replace(/^analysis-/, '').replace(/\.json$/, '').replace(/-/g, ' ')
          results.push({
            type:    'analysis',
            title:   displayTitle,
            snippet: snippet(origText, query),
            meta:    data.savedAt ? new Date(data.savedAt).toLocaleDateString() : '',
            score,
            data:    { filename: file, source, savedAt: data.savedAt },
          })
        }
      } catch { /* skip malformed file */ }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 20)
  } catch {
    return []
  }
}

// ── GET /api/search?q=&type=all|vocabulary|phrases|grammar|analysis ─

router.get('/', async (req, res) => {
  const { q, type = 'all' } = req.query

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required' })
  }

  const validTypes = ['all', 'vocabulary', 'phrases', 'grammar', 'analysis']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
  }

  const query = q.trim()

  try {
    const [vocabulary, phrases, grammar, analysis] = await Promise.all([
      (type === 'all' || type === 'vocabulary') ? searchVocabulary(query) : [],
      (type === 'all' || type === 'phrases')    ? searchPhrases(query)    : [],
      (type === 'all' || type === 'grammar')    ? searchGrammar(query)    : [],
      (type === 'all' || type === 'analysis')   ? searchAnalyses(query)   : [],
    ])

    const total = vocabulary.length + phrases.length + grammar.length + analysis.length

    res.json({ query, total, results: { vocabulary, phrases, grammar, analysis } })
  } catch (err) {
    console.error('[search GET]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
