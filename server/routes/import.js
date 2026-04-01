/**
 * CSV/TSV import routes
 *
 * POST /api/import/csv     — upload a CSV or TSV file and get a column-mapping preview
 *   Multipart/form-data, field name: "file", max 5 MB, accepts .csv/.tsv/.txt
 *   Auto-detects delimiter (tab > comma > semicolon)
 *   Response: { headers, vocabMapping, phraseMapping, unmapped, totalRows, preview, data }
 *
 * POST /api/import/confirm — commit the mapped rows to vocabulary or phrases
 *   Body: { data: object[], mapping: { raw, schema }[], target: 'vocabulary'|'phrases' }
 *   Deduplicates by primary key (Word / Phrase), normalises dates, fills default Level.
 *   Response: { added, duplicatesSkipped, errors, errorDetails }
 */
import { Router }  from 'express'
import multer       from 'multer'
import { parse }    from 'csv-parse/sync'
import { resolve }  from 'path'
import * as store   from '../services/markdown-store.js'

const VOCAB_FILE   = resolve(store.DATA_DIR, 'vocabulary.md')
const PHRASES_FILE = resolve(store.DATA_DIR, 'phrases.md')
const router       = Router()

// ── multer: memory storage, 5 MB limit ────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /\.(csv|tsv|txt)$/i.test(file.originalname) ||
               ['text/csv', 'text/tab-separated-values', 'text/plain', 'application/csv'].includes(file.mimetype)
    if (ok) return cb(null, true)
    const err = new Error('Only CSV or TSV files are accepted')
    err.status = 400
    cb(err)
  },
})

// ── Column aliases → canonical schema keys ─────────────────────────
const VOCAB_ALIASES = {
  word:             'Word',
  wort:             'Word',
  german:           'Word',
  german_word:      'Word',
  deutscheswort:    'Word',
  literal:          'Literal Meaning',
  literalmeaning:   'Literal Meaning',
  literal_meaning:  'Literal Meaning',
  wörtlich:         'Literal Meaning',
  meaning:          'Intended Meaning',
  intendedmeaning:  'Intended Meaning',
  intended_meaning: 'Intended Meaning',
  english:          'Intended Meaning',
  translation:      'Intended Meaning',
  bedeutung:        'Intended Meaning',
  pos:              'Part of Speech',
  partofspeech:     'Part of Speech',
  part_of_speech:   'Part of Speech',
  wordtype:         'Part of Speech',
  type:             'Part of Speech',
  wortart:          'Part of Speech',
  caseexamples:     'Case Examples',
  case_examples:    'Case Examples',
  examples:         'Case Examples',
  beispiele:        'Case Examples',
  level:            'Level',
  stufe:            'Level',
  source:           'Source',
  quelle:           'Source',
  dateadded:        'Date Added',
  date_added:       'Date Added',
  date:             'Date Added',
  datum:            'Date Added',
}

const PHRASE_ALIASES = {
  phrase:          'Phrase',
  satz:            'Phrase',
  ausdruck:        'Phrase',
  german:          'Phrase',
  english:         'English Meaning',
  englishmeaning:  'English Meaning',
  english_meaning: 'English Meaning',
  meaning:         'English Meaning',
  translation:     'English Meaning',
  level:           'Level',
  source:          'Source',
  dateadded:       'Date Added',
  date_added:      'Date Added',
  date:            'Date Added',
}

// ── Detect delimiter ───────────────────────────────────────────────
function detectDelimiter(text) {
  const sample = text.slice(0, 2000)
  const tabs    = (sample.match(/\t/g)    || []).length
  const commas  = (sample.match(/,/g)     || []).length
  const semis   = (sample.match(/;/g)     || []).length
  if (tabs >= commas && tabs >= semis) return '\t'
  if (semis > commas)                  return ';'
  return ','
}

// ── Normalize alias key ────────────────────────────────────────────
function aliasKey(header) {
  return header.toLowerCase().replace(/[\s_-]/g, '')
}

// ── Map raw headers → schema field (or null) ───────────────────────
function mapHeaders(headers, aliases) {
  return headers.map(h => {
    const key = aliasKey(h)
    return aliases[key] || null
  })
}

// ── Normalize dates to YYYY-MM-DD ──────────────────────────────────
function normalizeDate(val) {
  if (!val) return ''
  // Already ISO: 2024-03-15
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  // US: 03/15/2024 or 3/15/24
  const us = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (us) {
    const y = us[3].length === 2 ? '20' + us[3] : us[3]
    return `${y}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`
  }
  // EU: 15.03.2024
  const eu = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (eu) {
    const y = eu[3].length === 2 ? '20' + eu[3] : eu[3]
    return `${y}-${eu[2].padStart(2,'0')}-${eu[1].padStart(2,'0')}`
  }
  // Notion: March 15, 2024
  try {
    const d = new Date(val)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  } catch {}
  return val
}

// ── Notion multi-select: "tag1, tag2" → keep as string ────────────
function sanitizeField(key, val) {
  if (key === 'Date Added') return normalizeDate(val)
  // Strip leading/trailing whitespace from quoted Notion fields
  return String(val ?? '').trim()
}

// ── Parse CSV/TSV buffer to rows ───────────────────────────────────
function parseBuffer(buffer) {
  const text      = buffer.toString('utf-8')
  const delimiter = detectDelimiter(text)

  let records
  try {
    records = parse(text, {
      delimiter,
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
      relax_column_count: true,
      bom:              true,
    })
  } catch (e) {
    // Try to extract row number from csv-parse error
    const rowMatch = e.message.match(/record (\d+)/i)
    const row = rowMatch ? ` (row ${rowMatch[1]})` : ''
    throw Object.assign(new Error(`CSV parse error${row}: ${e.message}`), { status: 400 })
  }

  if (!records.length) {
    throw Object.assign(new Error('File is empty or has no data rows'), { status: 400 })
  }

  return { records, headers: Object.keys(records[0]) }
}

// ── POST /api/import/csv — preview ────────────────────────────────
router.post('/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { records, headers } = parseBuffer(req.file.buffer)

    const vocabMapping  = mapHeaders(headers, VOCAB_ALIASES)
    const phraseMapping = mapHeaders(headers, PHRASE_ALIASES)

    const unmapped = headers.filter((_, i) => !vocabMapping[i] && !phraseMapping[i])

    const preview = records.slice(0, 10).map((rec, rowIdx) => {
      const row = {}
      headers.forEach(h => { row[h] = rec[h] ?? '' })
      row._row = rowIdx + 2 // 1-indexed, +1 for header
      return row
    })

    res.json({
      headers,
      vocabMapping,
      phraseMapping,
      unmapped,
      totalRows: records.length,
      preview,
      // Pass encoded data so confirm doesn't re-upload
      data: records,
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// ── POST /api/import/confirm — commit ─────────────────────────────
router.post('/confirm', async (req, res) => {
  try {
    const { data, mapping, target } = req.body
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'No data provided' })
    }
    if (!mapping || !Array.isArray(mapping)) {
      return res.status(400).json({ error: 'No column mapping provided' })
    }
    if (!['vocabulary', 'phrases'].includes(target)) {
      return res.status(400).json({ error: 'target must be "vocabulary" or "phrases"' })
    }

    const file    = target === 'vocabulary' ? VOCAB_FILE : PHRASES_FILE
    const aliases = target === 'vocabulary' ? VOCAB_ALIASES : PHRASE_ALIASES

    // Build the list of [rawHeader, schemaKey] pairs
    // mapping is array of { raw, schema } objects sent from frontend
    const headerMap = {}
    for (const { raw, schema } of mapping) {
      if (schema) headerMap[raw] = schema
    }

    // Load existing entries for duplicate detection
    const existing = await store.getAll(file)
    const dupeKey  = target === 'vocabulary' ? 'Word' : 'Phrase'
    const existingKeys = new Set(
      existing.map(r => String(r[dupeKey] || '').toLowerCase().trim())
    )

    const toAdd  = []
    const errors = []
    let dupsSkipped = 0

    for (let i = 0; i < data.length; i++) {
      try {
        const rawRow = data[i]
        const entry  = {}

        for (const [rawHeader, schemaKey] of Object.entries(headerMap)) {
          entry[schemaKey] = sanitizeField(schemaKey, rawRow[rawHeader])
        }

        // Require primary key
        const pk = entry[dupeKey]
        if (!pk) continue

        if (existingKeys.has(pk.toLowerCase().trim())) {
          dupsSkipped++
          continue
        }

        // Fill defaults
        if (!entry['Date Added']) {
          entry['Date Added'] = new Date().toISOString().slice(0, 10)
        }
        if (!entry['Level']) entry['Level'] = 'B1'

        toAdd.push(entry)
        existingKeys.add(pk.toLowerCase().trim()) // prevent dupes within this batch
      } catch (e) {
        errors.push({ row: i + 2, message: e.message })
      }
    }

    if (toAdd.length > 0) {
      await store.add(file, toAdd)
    }

    res.json({
      added:            toAdd.length,
      duplicatesSkipped: dupsSkipped,
      errors:           errors.length,
      errorDetails:     errors.slice(0, 10),
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
