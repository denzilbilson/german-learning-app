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

/**
 * Props:
 *   vocabRows   – array of vocabulary entries (Title Case or camelCase)
 *   phraseRows  – array of phrase entries (Title Case or camelCase)
 *   onClose     – function()
 */
export default function AnkiExportModal({ vocabRows = [], phraseRows = [], onClose, onSuccess }) {
  const hasVocab   = vocabRows.length > 0
  const hasPhrases = phraseRows.length > 0

  // What to include
  const [includeVocab,   setIncludeVocab]   = useState(hasVocab)
  const [includePhrases, setIncludePhrases] = useState(hasPhrases)

  // Determine which levels are present in the data
  const availableLevels = useMemo(() => {
    const levels = new Set()
    for (const e of vocabRows)   { const l = e.Level  || e.level;  if (l) levels.add(l) }
    for (const e of phraseRows)  { const l = e.Level  || e.level;  if (l) levels.add(l) }
    return ALL_LEVELS.filter(l => levels.has(l))
  }, [vocabRows, phraseRows])

  const [selectedLevels, setSelectedLevels] = useState(() => new Set(availableLevels))
  const [enrich,  setEnrich]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Close on Escape
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
    if (allLevelsSelected()) {
      setSelectedLevels(new Set())
    } else {
      setSelectedLevels(new Set(availableLevels))
    }
  }

  // Filtered entries
  const filteredVocab = useMemo(() =>
    includeVocab
      ? vocabRows.filter(e => {
          const l = e.Level || e.level
          return !l || selectedLevels.has(l)
        })
      : [],
  [vocabRows, includeVocab, selectedLevels])

  const filteredPhrases = useMemo(() =>
    includePhrases
      ? phraseRows.filter(e => {
          const l = e.Level || e.level
          return !l || selectedLevels.has(l)
        })
      : [],
  [phraseRows, includePhrases, selectedLevels])

  const totalCards = filteredVocab.length + filteredPhrases.length

  async function handleExport() {
    if (totalCards === 0) return
    setLoading(true)
    setError(null)
    try {
      const blob = await api.exportAnki({
        vocabulary: filteredVocab,
        phrases:    filteredPhrases,
        enrich,
      })
      const filename = `anki-export-${new Date().toISOString().slice(0, 10)}.tsv`
      triggerDownload(blob, filename)
      onSuccess ? onSuccess() : onClose()
    } catch (err) {
      setError(err.message || 'Export failed')
      setLoading(false)
    }
  }

  const inputCls  = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-yellow-500/60 transition-colors'
  const toggleCls = (active) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer select-none ${
      active
        ? 'bg-yellow-400/15 text-yellow-300 border-yellow-500/30'
        : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-stone-300'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800">
          <div>
            <h2 className="font-display text-lg text-stone-100">Export to Anki</h2>
            <p className="text-stone-500 text-xs mt-0.5">Downloads a .tsv file ready for Anki import</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-300 transition-colors text-lg leading-none"
          >✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* What to export */}
          {hasVocab && hasPhrases && (
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2.5 font-medium">
                Include
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIncludeVocab(v => !v)}
                  className={toggleCls(includeVocab)}
                >
                  Vocabulary ({vocabRows.length})
                </button>
                <button
                  onClick={() => setIncludePhrases(v => !v)}
                  className={toggleCls(includePhrases)}
                >
                  Phrases ({phraseRows.length})
                </button>
              </div>
            </div>
          )}

          {/* Level filter */}
          {availableLevels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs text-stone-500 uppercase tracking-wider font-medium">
                  Levels
                </label>
                <button
                  onClick={toggleAllLevels}
                  className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
                >
                  {allLevelsSelected() ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={toggleCls(selectedLevels.has(level))}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enrich with German definitions */}
          <div>
            <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2.5 font-medium">
              AI Enrichment
            </label>
            <button
              onClick={() => setEnrich(v => !v)}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                enrich
                  ? 'bg-yellow-400/10 border-yellow-500/30 text-stone-200'
                  : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              <div className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${
                enrich ? 'bg-yellow-400' : 'bg-stone-700'
              }`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                  enrich ? 'left-4' : 'left-0.5'
                }`} />
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">Add German definitions</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Claude generates a B1–B2 German explanation for each card
                </div>
              </div>
            </button>
          </div>

          {/* Card count preview */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-800/40 rounded-xl border border-stone-700/50">
            <span className="text-sm text-stone-400">Cards to export</span>
            <span className={`text-sm font-semibold ${totalCards > 0 ? 'text-stone-100' : 'text-stone-600'}`}>
              {totalCards}
            </span>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading || totalCards === 0}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-stone-900 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-stone-900/40 border-t-stone-900 rounded-full animate-spin" />
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
