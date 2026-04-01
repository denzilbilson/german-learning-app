const BASE = '/api'

async function req(method, path, body) {
  const opts = { method, headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    let msg
    try { msg = (await res.json()).error } catch { msg = await res.text() }
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json()
}

// For file-download endpoints that return binary/text blobs instead of JSON
async function download(method, path, body) {
  const opts = { method, headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    let msg
    try { msg = (await res.json()).error } catch { msg = await res.text() }
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

  // ── Analysis (Phase 3) ────────────────────────────────────────
  analyzeText:   (body)       => req('POST', '/analyze', body),
  addFromAnalysis: (body)     => req('POST', '/analyze/add', body),
  getAnalyses:   ()           => req('GET',  '/analysis'),
  getAnalysis:   (name)       => req('GET',  `/analysis/${name}`),

  // ── Anki (Phase 4) ────────────────────────────────────────────
  exportAnki:    (body)       => download('POST', '/anki/export', body),

  // ── Practice (Phase 5) ───────────────────────────────────────
  generatePractice: (body)   => req('POST', '/practice/generate', body),
  checkAnswer:   (body)       => req('POST', '/practice/check', body),

  // ── Progress / Dashboard (Phase 6) ───────────────────────────
  getProgress:   ()           => req('GET',  '/progress'),
  logProgress:   (body)       => req('POST', '/progress', body),
  getDashboard:  ()           => req('GET',  '/dashboard'),
}
