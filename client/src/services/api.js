const BASE       = '/api'
const TIMEOUT_MS = 30_000

function makeAbortSignal(ms) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, clear: () => clearTimeout(timer) }
}

async function req(method, path, body, retrying = false) {
  const { signal, clear } = makeAbortSignal(TIMEOUT_MS)
  const opts = { method, headers: {}, signal }

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch (err) {
    clear()
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — the server took too long to respond.')
    }
    throw new Error('Server not reachable — is the backend running on port 3001?')
  }
  clear()

  // 5xx — retry once after 2 seconds
  if (res.status >= 500 && !retrying) {
    await new Promise(r => setTimeout(r, 2000))
    return req(method, path, body, true)
  }

  // Parse response
  let data
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      throw new Error('Unexpected server response — could not parse JSON.')
    }
  } else if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (!res.ok) {
    // Use server's message if available
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  return data
}

// For file-download endpoints that return binary/text blobs
async function download(method, path, body) {
  const { signal, clear } = makeAbortSignal(120_000) // longer timeout for enriched exports
  const opts = { method, headers: {}, signal }

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch (err) {
    clear()
    if (err.name === 'AbortError') {
      throw new Error('Export timed out — try without AI enrichment for faster results.')
    }
    throw new Error('Server not reachable — is the backend running on port 3001?')
  }
  clear()

  if (!res.ok) {
    let msg
    try { msg = (await res.json()).message || (await res.json()).error } catch {
      msg = await res.text().catch(() => '')
    }
    throw new Error(msg || `HTTP ${res.status}`)
  }

  return res.blob()
}

function qs(params) {
  if (!params) return ''
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  )
  const s = new URLSearchParams(clean).toString()
  return s ? '?' + s : ''
}

export const api = {
  // ── Vocabulary ────────────────────────────────────────────────
  getVocabulary:    (query)      => req('GET',    '/vocabulary' + qs(query)),
  addVocabulary:    (entries)    => req('POST',   '/vocabulary', entries),
  updateVocabulary: (idx, data)  => req('PUT',    `/vocabulary/${idx}`, data),
  deleteVocabulary: (idx)        => req('DELETE', `/vocabulary/${idx}`),

  // ── Phrases ───────────────────────────────────────────────────
  getPhrases:    (query)      => req('GET',    '/phrases' + qs(query)),
  addPhrases:    (entries)    => req('POST',   '/phrases', entries),
  updatePhrase:  (idx, data)  => req('PUT',    `/phrases/${idx}`, data),
  deletePhrase:  (idx)        => req('DELETE', `/phrases/${idx}`),

  // ── Analysis ─────────────────────────────────────────────────
  analyzeText:     (body)     => req('POST', '/analyze', body),
  addFromAnalysis: (body)     => req('POST', '/analyze/add', body),
  getAnalyses:     ()         => req('GET',  '/analysis'),
  getAnalysis:     (name)     => req('GET',  `/analysis/${name}`),

  // ── Anki ──────────────────────────────────────────────────────
  exportAnki:    (body)       => download('POST', '/anki/export', body),

  // ── Practice ─────────────────────────────────────────────────
  generatePractice: (body)   => req('POST', '/practice/generate', body),
  checkAnswer:   (body)       => req('POST', '/practice/check', body),

  // ── Progress / Dashboard ──────────────────────────────────────
  getProgress:   ()           => req('GET',  '/progress'),
  logProgress:   (body)       => req('POST', '/progress', body),
  getDashboard:  ()           => req('GET',  '/dashboard'),

  // ── Import ────────────────────────────────────────────────────
  importCsv: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const { signal, clear } = makeAbortSignal(30_000)
    let res
    try {
      res = await fetch('/api/import/csv', { method: 'POST', body: form, signal })
    } catch (err) {
      clear()
      if (err.name === 'AbortError') throw new Error('Upload timed out')
      throw new Error('Server not reachable — is the backend running on port 3001?')
    }
    clear()
    const data = await res.json().catch(() => { throw new Error(`HTTP ${res.status}`) })
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  },
  importConfirm: (body)     => req('POST', '/import/confirm', body),

  // ── Conjugation ───────────────────────────────────────────────
  conjugateVerb: (verb)     => req('POST', '/vocabulary/conjugate', { verb }),
}
