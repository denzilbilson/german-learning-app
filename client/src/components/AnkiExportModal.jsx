import { useState, useEffect, useMemo } from 'react'
import { api } from '../services/api.js'

const ALL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AnkiExportModal({ vocabRows = [], phraseRows = [], onClose, onSuccess }) {
  const hasVocab   = vocabRows.length > 0
  const hasPhrases = phraseRows.length > 0

  const [includeVocab,   setIncludeVocab]   = useState(hasVocab)
  const [includePhrases, setIncludePhrases] = useState(hasPhrases)

  const availableLevels = useMemo(() => {
    const levels = new Set()
    for (const e of vocabRows)  { const l = e.Level || e.level; if (l) levels.add(l) }
    for (const e of phraseRows) { const l = e.Level || e.level; if (l) levels.add(l) }
    return ALL_LEVELS.filter(l => levels.has(l))
  }, [vocabRows, phraseRows])

  const [selectedLevels, setSelectedLevels] = useState(() => new Set(availableLevels))
  const [enrich,  setEnrich]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function toggleLevel(level) {
    setSelectedLevels(prev => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  function allLevelsSelected() {
    return availableLevels.every(l => selectedLevels.has(l))
  }

  function toggleAllLevels() {
    if (allLevelsSelected()) setSelectedLevels(new Set())
    else setSelectedLevels(new Set(availableLevels))
  }

  const filteredVocab = useMemo(() =>
    includeVocab
      ? vocabRows.filter(e => { const l = e.Level || e.level; return !l || selectedLevels.has(l) })
      : [],
  [vocabRows, includeVocab, selectedLevels])

  const filteredPhrases = useMemo(() =>
    includePhrases
      ? phraseRows.filter(e => { const l = e.Level || e.level; return !l || selectedLevels.has(l) })
      : [],
  [phraseRows, includePhrases, selectedLevels])

  const totalCards = filteredVocab.length + filteredPhrases.length

  async function handleExport() {
    if (totalCards === 0) return
    setLoading(true)
    setError(null)
    try {
      const blob = await api.exportAnki({ vocabulary: filteredVocab, phrases: filteredPhrases, enrich })
      const filename = `anki-export-${new Date().toISOString().slice(0, 10)}.tsv`
      triggerDownload(blob, filename)
      onSuccess ? onSuccess() : onClose()
    } catch (err) {
      setError(err.message || 'Export failed')
      setLoading(false)
    }
  }

  const toggleCls = (active) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer select-none ${
      active
        ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/30'
        : 'bg-tertiary text-secondary border-warm-700 hover:text-primary'
    }`

  const inputCls = 'bg-tertiary border border-warm-700 rounded-lg px-3 py-2 text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-secondary border border-warm-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">

        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-800">
          <div>
            <h2 className="font-display text-lg text-primary">Export to Anki</h2>
            <p className="text-secondary text-xs mt-0.5">Downloads a .tsv file ready for Anki import</p>
          </div>
          <button onClick={onClose} className="text-warm-600 hover:text-warm-300 text-lg leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {hasVocab && hasPhrases && (
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-2.5 font-medium">
                Include
              </label>
              <div className="flex gap-2">
                <button onClick={() => setIncludeVocab(v => !v)} className={toggleCls(includeVocab)}>
                  Vocabulary ({vocabRows.length})
                </button>
                <button onClick={() => setIncludePhrases(v => !v)} className={toggleCls(includePhrases)}>
                  Phrases ({phraseRows.length})
                </button>
              </div>
            </div>
          )}

          {availableLevels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs text-secondary uppercase tracking-wider font-medium">Levels</label>
                <button onClick={toggleAllLevels} className="text-xs text-warm-600 hover:text-secondary">
                  {allLevelsSelected() ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableLevels.map(level => (
                  <button key={level} onClick={() => toggleLevel(level)} className={toggleCls(selectedLevels.has(level))}>
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wider mb-2.5 font-medium">
              AI Enrichment
            </label>
            <button
              onClick={() => setEnrich(v => !v)}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border ${
                enrich
                  ? 'bg-accent-gold/10 border-accent-gold/30 text-primary'
                  : 'bg-tertiary/60 border-warm-700 text-secondary hover:border-warm-600'
              }`}
            >
              <div className={`w-8 h-4 rounded-full relative flex-shrink-0 ${enrich ? 'bg-accent-gold' : 'bg-warm-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white ${enrich ? 'left-4' : 'left-0.5'}`} />
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">Add German definitions</div>
                <div className="text-xs text-secondary mt-0.5">
                  Claude generates a B1–B2 German explanation for each card
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-tertiary/40 rounded-xl border border-warm-700/50">
            <span className="text-sm text-secondary">Cards to export</span>
            <span className={`text-sm font-semibold ${totalCards > 0 ? 'text-primary' : 'text-warm-600'}`}>
              {totalCards}
            </span>
          </div>

          {error && (
            <p className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-secondary hover:text-primary">
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading || totalCards === 0}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent-gold text-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  {enrich ? 'Enriching…' : 'Exporting…'}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download .tsv
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
