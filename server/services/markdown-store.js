import { readFile as fsRead, writeFile as fsWrite, access, mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, resolve, basename } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = resolve(__dirname, '../../data')

// ── Default headers by filename ───────────────────────────────────

const DEFAULT_HEADERS = {
  'vocabulary.md': ['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Case Examples', 'Level', 'Source', 'Date Added'],
  'phrases.md':    ['Phrase', 'English Meaning', 'Level', 'Source', 'Date Added'],
  'log.md':        ['Date', 'Mode', 'Score', 'Total', 'Duration', 'Notes'],
}

function headersFor(filepath) {
  const name = basename(filepath)
  return DEFAULT_HEADERS[name] || ['Item', 'Value']
}

function emptyTable(headers) {
  const hRow = '| ' + headers.join(' | ') + ' |'
  const sep  = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  return hRow + '\n' + sep + '\n'
}

// ── Parsing helpers ───────────────────────────────────────────────

function splitRow(line) {
  return line.split('|').slice(1, -1).map(c => c.trim())
}

function isSeparator(cells) {
  return cells.length > 0 && cells.every(c => /^[-: ]+$/.test(c))
}

function parse(content, filepath) {
  const tableLines = content.split('\n').filter(l => l.trim().startsWith('|'))
  if (tableLines.length < 2) return { headers: headersFor(filepath), rows: [] }

  const headers = splitRow(tableLines[0])
  const rows = []

  for (const line of tableLines.slice(1)) {
    const cells = splitRow(line)
    if (isSeparator(cells)) continue
    if (cells.length !== headers.length) {
      console.warn(`[markdown-store] Skipping malformed row in ${basename(filepath)}: "${line.slice(0, 60)}…"`)
      continue
    }
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] })
    rows.push(obj)
  }

  return { headers, rows }
}

function preambleOf(content) {
  const lines = content.split('\n')
  const idx   = lines.findIndex(l => l.trim().startsWith('|'))
  return idx > 0 ? lines.slice(0, idx).join('\n') : ''
}

function serialize(headers, rows) {
  const escapeCell = (v) => String(v ?? '').replace(/\|/g, '\\|')
  const hRow  = '| ' + headers.join(' | ') + ' |'
  const sep   = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => escapeCell(r[h])).join(' | ') + ' |'
  )
  return [hRow, sep, ...dRows].join('\n')
}

// ── Internal I/O with auto-create ─────────────────────────────────

async function ensureDir(filepath) {
  const dir = dirname(filepath)
  await mkdir(dir, { recursive: true })
}

async function readMd(filepath) {
  try {
    const content  = await fsRead(filepath, 'utf-8')
    const preamble = preambleOf(content)
    const { headers, rows } = parse(content, filepath)
    return { preamble, headers, rows }
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File not found — auto-create with correct headers
      const headers = headersFor(filepath)
      await ensureDir(filepath)
      await fsWrite(filepath, emptyTable(headers), 'utf-8')
      console.log(`[markdown-store] Created missing file: ${basename(filepath)}`)
      return { preamble: '', headers, rows: [] }
    }
    throw err
  }
}

async function writeMd(filepath, preamble, headers, rows) {
  await ensureDir(filepath)
  const body = serialize(headers, rows)
  await fsWrite(filepath, (preamble ? preamble + '\n' : '') + body + '\n', 'utf-8')
}

const today = () => new Date().toISOString().slice(0, 10)

// ── Validation ────────────────────────────────────────────────────

function validateEntry(headers, entry) {
  for (const h of headers) {
    if (entry[h] === undefined) continue
    if (typeof entry[h] !== 'string' && typeof entry[h] !== 'number') {
      throw new Error(`Field "${h}" must be a string (got ${typeof entry[h]})`)
    }
  }
}

// ── Public CRUD API ───────────────────────────────────────────────

/**
 * Read all rows from a Markdown table file, with optional filtering.
 *
 * @param {string} filepath - Absolute path to the .md file
 * @param {{ level?: string, search?: string, since?: string }} [query={}]
 *   - level:  filter rows where the `Level` column equals this value (e.g. "B1")
 *   - search: case-insensitive substring match across all column values
 *   - since:  ISO date string; only rows with `Date Added` >= this date are returned
 * @returns {Promise<object[]>} Array of row objects keyed by column header
 */
export async function getAll(filepath, query = {}) {
  const { rows } = await readMd(filepath)
  let out = rows

  if (query.level) {
    out = out.filter(r => r.Level === query.level)
  }
  if (query.search) {
    const s = query.search.toLowerCase()
    out = out.filter(r => Object.values(r).some(v => v.toLowerCase().includes(s)))
  }
  if (query.since) {
    const since = new Date(query.since)
    out = out.filter(r => {
      const d = new Date(r['Date Added'] || '')
      return !isNaN(d.getTime()) && d >= since
    })
  }

  return out
}

/**
 * Get a single row by its 0-based row index.
 *
 * @param {string} filepath - Absolute path to the .md file
 * @param {number} idx      - 0-based row index
 * @returns {Promise<object|null>} Row object, or null if index is out of range
 */
export async function getByIndex(filepath, idx) {
  const { rows } = await readMd(filepath)
  if (idx < 0 || idx >= rows.length) return null
  return rows[idx]
}

/**
 * Append one or more rows to a Markdown table file.
 * Missing `Date Added` values are auto-filled with today's date.
 * Unknown keys in an entry are silently ignored.
 *
 * @param {string}          filepath - Absolute path to the .md file
 * @param {object|object[]} entries  - Row object or array of row objects. Keys must
 *                                     match the column headers of the target file.
 * @returns {Promise<object[]>} The newly appended row objects
 * @throws {Error} If a field value is not a string or number
 */
export async function add(filepath, entries) {
  const { preamble, headers, rows } = await readMd(filepath)
  const list = Array.isArray(entries) ? entries : [entries]

  const newRows = list.map(e => {
    validateEntry(headers, e)
    const r = {}
    headers.forEach(h => { r[h] = e[h] != null ? String(e[h]) : '' })
    if (headers.includes('Date Added') && !r['Date Added']) r['Date Added'] = today()
    return r
  })

  await writeMd(filepath, preamble, headers, [...rows, ...newRows])
  return newRows
}

/**
 * Update a row in a Markdown table file by merging `data` into the existing row.
 *
 * @param {string} filepath - Absolute path to the .md file
 * @param {number} idx      - 0-based row index to update
 * @param {object} data     - Partial row object; only provided keys are overwritten
 * @returns {Promise<object>} The updated row object
 * @throws {Error} If `idx` is out of range
 */
export async function update(filepath, idx, data) {
  const { preamble, headers, rows } = await readMd(filepath)
  if (idx < 0 || idx >= rows.length) {
    throw new Error(`Row ${idx} is out of range (${rows.length} rows in ${basename(filepath)})`)
  }
  validateEntry(headers, data)
  rows[idx] = { ...rows[idx], ...data }
  await writeMd(filepath, preamble, headers, rows)
  return rows[idx]
}

/**
 * Delete a row from a Markdown table file by its 0-based index.
 *
 * @param {string} filepath - Absolute path to the .md file
 * @param {number} idx      - 0-based row index to remove
 * @returns {Promise<object>} The deleted row object
 * @throws {Error} If `idx` is out of range
 */
export async function remove(filepath, idx) {
  const { preamble, headers, rows } = await readMd(filepath)
  if (idx < 0 || idx >= rows.length) {
    throw new Error(`Row ${idx} is out of range (${rows.length} rows in ${basename(filepath)})`)
  }
  const [removed] = rows.splice(idx, 1)
  await writeMd(filepath, preamble, headers, rows)
  return removed
}
