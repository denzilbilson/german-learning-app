import { readFile as fsRead, writeFile as fsWrite } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = resolve(__dirname, '../../data')

// ── Parsing helpers ───────────────────────────────────────────────

function splitRow(line) {
  return line.split('|').slice(1, -1).map(c => c.trim())
}

function isSeparator(cells) {
  return cells.length > 0 && cells.every(c => /^[-: ]+$/.test(c))
}

function parse(content) {
  const tableLines = content.split('\n').filter(l => l.trim().startsWith('|'))
  if (tableLines.length < 2) return { headers: [], rows: [] }

  const headers = splitRow(tableLines[0])
  const rows = []

  for (const line of tableLines.slice(1)) {
    const cells = splitRow(line)
    if (isSeparator(cells)) continue
    if (cells.length !== headers.length) continue
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] })
    rows.push(obj)
  }

  return { headers, rows }
}

function preambleOf(content) {
  const lines = content.split('\n')
  const idx = lines.findIndex(l => l.trim().startsWith('|'))
  return idx > 0 ? lines.slice(0, idx).join('\n') : ''
}

function serialize(headers, rows) {
  const hRow  = '| ' + headers.join(' | ') + ' |'
  const sep   = '|' + headers.map(h => '-'.repeat(h.length + 2)).join('|') + '|'
  const dRows = rows.map(r =>
    '| ' + headers.map(h => String(r[h] ?? '')).join(' | ') + ' |'
  )
  return [hRow, sep, ...dRows].join('\n')
}

// ── Internal I/O ──────────────────────────────────────────────────

async function readMd(filepath) {
  const content = await fsRead(filepath, 'utf-8')
  const preamble = preambleOf(content)
  const { headers, rows } = parse(content)
  return { preamble, headers, rows }
}

async function writeMd(filepath, preamble, headers, rows) {
  const body = serialize(headers, rows)
  await fsWrite(filepath, (preamble ? preamble + '\n' : '') + body + '\n', 'utf-8')
}

const today = () => new Date().toISOString().slice(0, 10)

// ── Public CRUD API ───────────────────────────────────────────────

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

export async function getByIndex(filepath, idx) {
  const { rows } = await readMd(filepath)
  return (idx >= 0 && idx < rows.length) ? rows[idx] : null
}

export async function add(filepath, entries) {
  const { preamble, headers, rows } = await readMd(filepath)
  const list = Array.isArray(entries) ? entries : [entries]

  const newRows = list.map(e => {
    const r = {}
    headers.forEach(h => { r[h] = e[h] ?? '' })
    if (headers.includes('Date Added') && !r['Date Added']) r['Date Added'] = today()
    return r
  })

  await writeMd(filepath, preamble, headers, [...rows, ...newRows])
  return newRows
}

export async function update(filepath, idx, data) {
  const { preamble, headers, rows } = await readMd(filepath)
  if (idx < 0 || idx >= rows.length) throw new Error(`Row ${idx} out of range`)
  rows[idx] = { ...rows[idx], ...data }
  await writeMd(filepath, preamble, headers, rows)
  return rows[idx]
}

export async function remove(filepath, idx) {
  const { preamble, headers, rows } = await readMd(filepath)
  if (idx < 0 || idx >= rows.length) throw new Error(`Row ${idx} out of range`)
  const [removed] = rows.splice(idx, 1)
  await writeMd(filepath, preamble, headers, rows)
  return removed
}
