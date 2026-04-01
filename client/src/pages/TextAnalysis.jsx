import { useState } from 'react'
import { api } from '../services/api.js'
import { useToast } from '../components/Toast.jsx'
import AnalysisReader from '../components/AnalysisReader.jsx'
import AnkiExportModal from '../components/AnkiExportModal.jsx'

const MAX_CHARS = 5000

export default function TextAnalysis() {
  const toast = useToast()

  const [phase, setPhase]                     = useState('idle')
  const [text, setText]                       = useState('')
  const [source, setSource]                   = useState('')
  const [analysis, setAnalysis]               = useState(null)
  const [selectedVocab, setSelectedVocab]     = useState(new Set())
  const [selectedPhrases, setSelectedPhrases] = useState(new Set())
  const [addLoading, setAddLoading]           = useState(false)
  const [showAnki, setShowAnki]               = useState(false)

  function selectAll(result) {
    setSelectedVocab(new Set((result.vocabulary || []).map((_, i) => i)))
    setSelectedPhrases(new Set((result.phrases || []).map((_, i) => i)))
  }

  async function handleAnalyze() {
    if (!text.trim()) return
    setPhase('loading')
    try {
      const result = await api.analyzeText({ text, source: source.trim() || undefined })
      setAnalysis(result)
      selectAll(result)
      setPhase('done')
    } catch (err) {
      toast.error(err.message || 'Analysis failed — check your API key and try again')
      setPhase('idle')
    }
  }

  async function handleAdd(vocabList, phraseList) {
    if (vocabList.length === 0 && phraseList.length === 0) {
      toast.warning('Nothing selected to add')
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
        ? `Added ${addedParts.join(' and ')}${skippedParts.length > 0 ? ` · ${skippedParts.join(' & ')} already saved` : ''}`
        : `Nothing new — ${skippedParts.join(' and ')} already in database`

      toast.success(msg)
    } catch (err) {
      toast.error(err.message || 'Failed to add entries')
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

  const inputCls = 'w-full bg-secondary border border-warm-700 rounded-xl px-4 py-3.5 text-primary placeholder-warm-600 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60'

  // ── Idle state ────────────────────────────────────────────────────

  if (phase === 'idle') {
    const charCount   = text.length
    const overLimit   = charCount > MAX_CHARS
    const nearLimit   = charCount > MAX_CHARS * 0.8 && !overLimit

    return (
      <div className="flex flex-col items-center justify-center min-h-full py-16 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-4xl text-primary mb-2">Analyze German Text</h1>
          <p className="text-secondary text-sm mb-10 leading-relaxed">
            Paste any German text — an article, a passage, a conversation — and get a complete
            linguistic breakdown: translations, vocabulary, phrases, and grammar notes calibrated
            for B1→B2 level.
          </p>

          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) handleAnalyze()
                }}
                placeholder="Deutschen Text hier einfügen…"
                rows={10}
                className={`${inputCls} resize-none ${overLimit ? 'border-accent-red/60 focus:ring-accent-red/30' : ''}`}
              />
              <div className={`absolute bottom-3 right-4 text-xs font-sans ${
                overLimit ? 'text-accent-red' : nearLimit ? 'text-accent-gold' : 'text-warm-600'
              }`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </div>
            </div>

            {overLimit && (
              <p className="text-accent-red text-xs font-sans">
                Text exceeds {MAX_CHARS.toLocaleString()} characters. Consider analyzing a shorter passage for better results.
              </p>
            )}

            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Source (optional) — e.g. Der Spiegel, podcast, novel…"
              className={inputCls}
            />

            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || overLimit}
              className="w-full py-3.5 bg-accent-gold text-primary rounded-xl text-sm font-semibold
                hover:brightness-110 active:brightness-95
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze with Claude
            </button>

            <p className="text-center text-xs text-warm-600">
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
          <div className="absolute inset-0 rounded-full border-2 border-warm-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-gold animate-spin" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-warm-200 font-medium">Analyzing with Claude…</p>
          <p className="text-secondary text-sm">Extracting vocabulary, phrases &amp; grammar notes</p>
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
      <div className="sticky top-0 z-20 bg-primary/95 backdrop-blur-sm border-b border-warm-800/70
        px-8 py-4 flex items-center justify-between gap-6 flex-wrap">
        <div>
          {analysis.source && (
            <div className="text-xs font-semibold text-warm-600 uppercase tracking-widest mb-0.5">
              {analysis.source}
            </div>
          )}
          <div className="text-secondary text-sm">
            <span className="text-warm-300">{vocabCount}</span> word{vocabCount !== 1 ? 's' : ''} ·{' '}
            <span className="text-warm-300">{phraseCount}</span> phrase{phraseCount !== 1 ? 's' : ''} ·{' '}
            <span className="text-warm-300">{grammarCount}</span> grammar note{grammarCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-secondary hover:text-warm-300"
          >
            ← New Analysis
          </button>

          <button
            onClick={handleAddSelected}
            disabled={addLoading || selectedCount === 0}
            className="px-4 py-2 bg-tertiary border border-warm-700 text-warm-200 rounded-lg text-sm
              hover:bg-warm-700 hover:border-warm-600
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Selected ({selectedCount})
          </button>

          <button
            onClick={() => setShowAnki(true)}
            disabled={addLoading || (vocabCount === 0 && phraseCount === 0)}
            className="px-4 py-2 bg-tertiary border border-warm-700 text-warm-300 rounded-lg text-sm font-semibold
              hover:bg-warm-700 hover:border-warm-600
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 2v8M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export to Anki
          </button>

          <button
            onClick={handleAddAll}
            disabled={addLoading}
            className="px-5 py-2 bg-accent-gold text-primary rounded-lg text-sm font-semibold
              hover:brightness-110 active:brightness-95
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {addLoading ? 'Adding…' : 'Add All to Databases'}
          </button>
        </div>
      </div>

      {/* ── Analysis content ──────────────────────────────────────── */}
      <div className="px-8 py-10 max-w-4xl w-full mx-auto">
        {analysis.originalText && (
          <div className="mb-12 pb-10 border-b border-warm-800/60">
            <div className="text-xs font-semibold text-warm-600 uppercase tracking-widest mb-3">
              Source Text
            </div>
            <blockquote className="text-secondary text-sm leading-relaxed italic border-l-2 border-warm-700 pl-4">
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

      {showAnki && (
        <AnkiExportModal
          vocabRows={analysis.vocabulary || []}
          phraseRows={analysis.phrases || []}
          onClose={() => setShowAnki(false)}
          onSuccess={() => { setShowAnki(false); toast.success('Anki deck downloaded') }}
        />
      )}
    </div>
  )
}
