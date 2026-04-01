import { useState } from 'react'
import { api } from '../services/api.js'
import AnalysisReader from '../components/AnalysisReader.jsx'

export default function TextAnalysis() {
  const [phase, setPhase]               = useState('idle')   // idle | loading | done
  const [text, setText]                 = useState('')
  const [source, setSource]             = useState('')
  const [analysis, setAnalysis]         = useState(null)
  const [selectedVocab, setSelectedVocab]     = useState(new Set())
  const [selectedPhrases, setSelectedPhrases] = useState(new Set())
  const [toast, setToast]               = useState(null)
  const [addLoading, setAddLoading]     = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function selectAll(result) {
    setSelectedVocab(new Set((result.vocabulary || []).map((_, i) => i)))
    setSelectedPhrases(new Set((result.phrases || []).map((_, i) => i)))
  }

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!text.trim()) return
    setPhase('loading')
    try {
      const result = await api.analyzeText({ text, source: source.trim() || undefined })
      setAnalysis(result)
      selectAll(result)
      setPhase('done')
    } catch (err) {
      showToast('error', err.message || 'Analysis failed — check your API key and try again')
      setPhase('idle')
    }
  }

  async function handleAdd(vocabList, phraseList) {
    if (vocabList.length === 0 && phraseList.length === 0) {
      showToast('error', 'Nothing selected to add')
      return
    }
    setAddLoading(true)
    try {
      const result = await api.addFromAnalysis({
        vocabulary: vocabList,
        phrases:    phraseList,
        source:     analysis.source || source.trim() || 'Text Analysis',
      })
      const { added, skipped } = result

      const addedParts   = []
      const skippedParts = []
      if (added.vocabulary > 0)   addedParts.push(`${added.vocabulary} word${added.vocabulary !== 1 ? 's' : ''}`)
      if (added.phrases > 0)      addedParts.push(`${added.phrases} phrase${added.phrases !== 1 ? 's' : ''}`)
      if (skipped.vocabulary > 0) skippedParts.push(`${skipped.vocabulary} word${skipped.vocabulary !== 1 ? 's' : ''}`)
      if (skipped.phrases > 0)    skippedParts.push(`${skipped.phrases} phrase${skipped.phrases !== 1 ? 's' : ''}`)

      const msg = addedParts.length > 0
        ? `Added ${addedParts.join(' and ')}${skippedParts.length > 0 ? ` · ${skippedParts.join(' & ')} already in database` : ''}`
        : `Nothing new — ${skippedParts.join(' and ')} already in database`

      showToast('success', msg)
    } catch (err) {
      showToast('error', err.message || 'Failed to add entries')
    } finally {
      setAddLoading(false)
    }
  }

  function handleAddAll() {
    handleAdd(analysis.vocabulary || [], analysis.phrases || [])
  }

  function handleAddSelected() {
    const vocabList  = (analysis.vocabulary || []).filter((_, i) => selectedVocab.has(i))
    const phraseList = (analysis.phrases    || []).filter((_, i) => selectedPhrases.has(i))
    handleAdd(vocabList, phraseList)
  }

  function handleReset() {
    setPhase('idle')
    setAnalysis(null)
    setSelectedVocab(new Set())
    setSelectedPhrases(new Set())
  }

  // ── Idle state ────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-16 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-4xl text-stone-100 mb-2">Analyze German Text</h1>
          <p className="text-stone-400 text-sm mb-10 leading-relaxed">
            Paste any German text — an article, a passage, a conversation — and get a complete
            linguistic breakdown: translations, vocabulary, phrases, and grammar notes calibrated
            for B1→B2 level.
          </p>

          <div className="space-y-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze()
              }}
              placeholder="Deutschen Text hier einfügen…"
              rows={10}
              className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-3.5
                text-stone-100 placeholder-stone-600 text-sm leading-relaxed
                focus:outline-none focus:border-yellow-500/50 resize-none transition-colors"
            />

            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Source (optional) — e.g. Der Spiegel, podcast, novel…"
              className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-4 py-3
                text-stone-100 placeholder-stone-600 text-sm
                focus:outline-none focus:border-yellow-500/50 transition-colors"
            />

            <button
              onClick={handleAnalyze}
              disabled={!text.trim()}
              className="w-full py-3.5 bg-yellow-400 text-stone-900 rounded-xl text-sm font-semibold
                hover:bg-yellow-300 active:bg-yellow-500 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze with Claude
            </button>

            <p className="text-center text-xs text-stone-600">
              ⌘ + Enter to submit
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-8 px-6">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-stone-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-stone-200 font-medium">Analyzing with Claude…</p>
          <p className="text-stone-500 text-sm">Extracting vocabulary, phrases &amp; grammar notes</p>
        </div>
      </div>
    )
  }

  // ── Done state ────────────────────────────────────────────────────

  const selectedCount = selectedVocab.size + selectedPhrases.size
  const vocabCount    = (analysis.vocabulary || []).length
  const phraseCount   = (analysis.phrases    || []).length
  const grammarCount  = (analysis.grammar    || []).length

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky action bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800/70
        px-8 py-4 flex items-center justify-between gap-6 flex-wrap">
        <div>
          {analysis.source && (
            <div className="text-xs font-semibold text-stone-600 uppercase tracking-widest mb-0.5">
              {analysis.source}
            </div>
          )}
          <div className="text-stone-400 text-sm">
            <span className="text-stone-300">{vocabCount}</span> word{vocabCount !== 1 ? 's' : ''} ·{' '}
            <span className="text-stone-300">{phraseCount}</span> phrase{phraseCount !== 1 ? 's' : ''} ·{' '}
            <span className="text-stone-300">{grammarCount}</span> grammar note{grammarCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            ← New Analysis
          </button>

          <button
            onClick={handleAddSelected}
            disabled={addLoading || selectedCount === 0}
            className="px-4 py-2 bg-stone-800 border border-stone-700 text-stone-200 rounded-lg text-sm
              hover:bg-stone-700 hover:border-stone-600 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Selected ({selectedCount})
          </button>

          <button
            onClick={handleAddAll}
            disabled={addLoading}
            className="px-5 py-2 bg-yellow-400 text-stone-900 rounded-lg text-sm font-semibold
              hover:bg-yellow-300 active:bg-yellow-500 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {addLoading ? 'Adding…' : 'Add All to Databases'}
          </button>
        </div>
      </div>

      {/* ── Analysis content ──────────────────────────────────────── */}
      <div className="px-8 py-10 max-w-4xl w-full mx-auto">
        {/* Original text preview */}
        {analysis.originalText && (
          <div className="mb-12 pb-10 border-b border-stone-800/60">
            <div className="text-xs font-semibold text-stone-600 uppercase tracking-widest mb-3">
              Source Text
            </div>
            <blockquote className="text-stone-400 text-sm leading-relaxed italic border-l-2 border-stone-700 pl-4">
              {analysis.originalText.length > 400
                ? analysis.originalText.slice(0, 400) + '…'
                : analysis.originalText}
            </blockquote>
          </div>
        )}

        <AnalysisReader
          analysis={analysis}
          selectedVocab={selectedVocab}
          selectedPhrases={selectedPhrases}
          onToggleVocab={idx =>
            setSelectedVocab(prev => {
              const next = new Set(prev)
              next.has(idx) ? next.delete(idx) : next.add(idx)
              return next
            })
          }
          onTogglePhrase={idx =>
            setSelectedPhrases(prev => {
              const next = new Set(prev)
              next.has(idx) ? next.delete(idx) : next.add(idx)
              return next
            })
          }
          onSelectAllVocab={() =>
            setSelectedVocab(new Set((analysis.vocabulary || []).map((_, i) => i)))
          }
          onDeselectAllVocab={() => setSelectedVocab(new Set())}
          onSelectAllPhrases={() =>
            setSelectedPhrases(new Set((analysis.phrases || []).map((_, i) => i)))
          }
          onDeselectAllPhrases={() => setSelectedPhrases(new Set())}
        />
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl text-sm font-medium
            shadow-2xl max-w-sm leading-snug
            ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
