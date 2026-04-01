import { useState } from 'react'

// ── Badge helpers ─────────────────────────────────────────────────

function posBadgeClass(pos = '') {
  const p = pos.toLowerCase()
  if (p.includes('noun'))     return 'bg-blue-900/60 text-blue-300 border-blue-800/60'
  if (p.includes('verb'))     return 'bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
  if (p.includes('adj'))      return 'bg-orange-900/60 text-orange-300 border-orange-800/60'
  if (p.includes('adv'))      return 'bg-purple-900/60 text-purple-300 border-purple-800/60'
  if (p.includes('conj'))     return 'bg-pink-900/60 text-pink-300 border-pink-800/60'
  if (p.includes('prep'))     return 'bg-cyan-900/60 text-cyan-300 border-cyan-800/60'
  if (p.includes('article'))  return 'bg-amber-900/60 text-amber-300 border-amber-800/60'
  if (p.includes('pronoun'))  return 'bg-violet-900/60 text-violet-300 border-violet-800/60'
  return 'bg-stone-800 text-stone-400 border-stone-700'
}

function levelBadgeClass(level = '') {
  switch (level.toUpperCase()) {
    case 'A1': return 'bg-green-900/50 text-green-400'
    case 'A2': return 'bg-teal-900/50 text-teal-400'
    case 'B1': return 'bg-yellow-900/60 text-yellow-400'
    case 'B2': return 'bg-amber-900/60 text-amber-400'
    case 'C1': return 'bg-orange-900/60 text-orange-400'
    case 'C2': return 'bg-red-900/60 text-red-400'
    default:   return 'bg-stone-800 text-stone-400'
  }
}

// ── Section heading ───────────────────────────────────────────────

function SectionHeading({ children, count, aside }) {
  return (
    <div className="flex items-baseline justify-between mb-6">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-2xl text-stone-100">{children}</h2>
        {count !== undefined && (
          <span className="text-sm text-stone-500">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
      {aside}
    </div>
  )
}

// ── Translations ──────────────────────────────────────────────────

function TranslationSection({ translations = [] }) {
  if (!translations.length) return null
  return (
    <section className="mb-14">
      <SectionHeading count={translations.length}>Translation</SectionHeading>
      <div className="rounded-xl overflow-hidden border border-stone-800">
        {/* Column headers */}
        <div className="grid grid-cols-2 divide-x divide-stone-800 bg-stone-800/40 border-b border-stone-800">
          <div className="px-5 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Deutsch</div>
          <div className="px-5 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">English</div>
        </div>
        {translations.map((t, i) => (
          <div
            key={i}
            className={`grid grid-cols-2 divide-x divide-stone-800/60 border-b border-stone-800/40 last:border-0
              ${i % 2 === 0 ? 'bg-stone-900/60' : 'bg-stone-900/20'}`}
          >
            <div className="px-5 py-3.5 text-stone-200 text-sm leading-relaxed font-medium">
              {t.german}
            </div>
            <div className="px-5 py-3.5 text-stone-400 text-sm leading-relaxed italic">
              {t.english}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Vocabulary table ──────────────────────────────────────────────

function VocabSection({ vocabulary = [], selectedVocab, onToggleVocab, onSelectAll, onDeselectAll }) {
  const [expanded, setExpanded] = useState(new Set())

  function toggleExpand(i) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (!vocabulary.length) return null

  const allSelected = vocabulary.every((_, i) => selectedVocab.has(i))
  const noneSelected = selectedVocab.size === 0

  return (
    <section className="mb-14">
      <SectionHeading
        count={vocabulary.length}
        aside={
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-500">
              {selectedVocab.size} selected
            </span>
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-stone-500 hover:text-yellow-400 transition-colors underline-offset-2 hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        }
      >
        Vocabulary
      </SectionHeading>

      <div className="rounded-xl border border-stone-800 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2.5rem_11rem_1fr_9rem_4.5rem_2.5rem] bg-stone-800/50 border-b border-stone-800">
          <div className="px-3 py-2.5" />
          <div className="px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Word</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Literal → Meaning</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Part of Speech</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Level</div>
          <div className="px-3 py-2.5" />
        </div>

        {vocabulary.map((v, i) => {
          const examples = Array.isArray(v.caseExamples)
            ? v.caseExamples
            : (v.caseExamples || '').split('<br>').filter(Boolean)

          return (
            <div key={i}>
              <div
                className={`grid grid-cols-[2.5rem_11rem_1fr_9rem_4.5rem_2.5rem] items-center
                  border-b border-stone-800/50 last:border-0 transition-colors
                  ${selectedVocab.has(i) ? 'bg-yellow-400/[0.04]' : 'hover:bg-stone-800/20'}`}
              >
                {/* Checkbox */}
                <div className="px-3 py-3.5 flex justify-center">
                  <input
                    type="checkbox"
                    checked={selectedVocab.has(i)}
                    onChange={() => onToggleVocab(i)}
                    className="w-4 h-4 rounded border-stone-600 bg-stone-800 accent-yellow-400 cursor-pointer"
                  />
                </div>

                {/* Word */}
                <div className="px-4 py-3.5">
                  <span className="text-stone-100 font-semibold text-sm leading-snug">{v.word}</span>
                </div>

                {/* Meanings */}
                <div className="px-4 py-3.5 min-w-0">
                  <div className="text-stone-500 text-xs mb-0.5 truncate">{v.literalMeaning}</div>
                  <div className="text-stone-200 text-sm leading-snug">{v.intendedMeaning}</div>
                </div>

                {/* POS */}
                <div className="px-4 py-3.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border ${posBadgeClass(v.partOfSpeech)}`}>
                    {v.partOfSpeech}
                  </span>
                </div>

                {/* Level */}
                <div className="px-4 py-3.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${levelBadgeClass(v.level)}`}>
                    {v.level}
                  </span>
                </div>

                {/* Expand toggle */}
                <div className="px-3 py-3.5 flex justify-center">
                  {examples.length > 0 && (
                    <button
                      onClick={() => toggleExpand(i)}
                      className="text-stone-600 hover:text-stone-300 transition-colors leading-none"
                      title="Show examples"
                    >
                      <span className="text-[10px]">{expanded.has(i) ? '▲' : '▼'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded examples */}
              {expanded.has(i) && examples.length > 0 && (
                <div className={`px-12 py-4 border-b border-stone-800/40 last:border-0
                  ${selectedVocab.has(i) ? 'bg-yellow-400/[0.03]' : 'bg-stone-900/30'}`}>
                  <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2.5">
                    Examples
                  </div>
                  <ul className="space-y-2">
                    {examples.map((ex, j) => (
                      <li key={j} className="flex gap-3 text-sm text-stone-300 leading-relaxed">
                        <span className="text-stone-700 mt-0.5 flex-shrink-0">·</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Phrases ───────────────────────────────────────────────────────

function PhrasesSection({ phrases = [], selectedPhrases, onTogglePhrase, onSelectAll, onDeselectAll }) {
  if (!phrases.length) return null

  const allSelected = phrases.every((_, i) => selectedPhrases.has(i))

  return (
    <section className="mb-14">
      <SectionHeading
        count={phrases.length}
        aside={
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-500">{selectedPhrases.size} selected</span>
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-stone-500 hover:text-yellow-400 transition-colors underline-offset-2 hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        }
      >
        Phrases &amp; Idioms
      </SectionHeading>

      <div className="grid gap-2.5">
        {phrases.map((p, i) => (
          <label
            key={i}
            className={`flex items-start gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-colors
              ${selectedPhrases.has(i)
                ? 'border-yellow-500/25 bg-yellow-400/[0.04]'
                : 'border-stone-800 bg-stone-900/40 hover:border-stone-700 hover:bg-stone-900/60'}`}
          >
            <input
              type="checkbox"
              checked={selectedPhrases.has(i)}
              onChange={() => onTogglePhrase(i)}
              className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-800 accent-yellow-400 cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-stone-100 font-semibold text-base leading-snug">{p.phrase}</div>
              <div className="text-stone-400 text-sm mt-1 leading-relaxed">{p.englishMeaning}</div>
            </div>
            <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-mono font-bold ${levelBadgeClass(p.level)}`}>
              {p.level}
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

// ── Grammar notes ─────────────────────────────────────────────────

function GrammarSection({ grammar = [] }) {
  const [open, setOpen] = useState(new Set([0])) // first one open by default

  function toggle(i) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (!grammar.length) return null

  return (
    <section className="mb-14">
      <SectionHeading count={grammar.length}>Grammar Notes</SectionHeading>
      <div className="space-y-2.5">
        {grammar.map((g, i) => (
          <div key={i} className="rounded-xl border border-stone-800 overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left
                bg-stone-900/60 hover:bg-stone-900 transition-colors group"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                bg-yellow-400/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono font-bold">
                {i + 1}
              </span>
              <span className="flex-1 font-display text-lg text-stone-100 group-hover:text-white transition-colors">
                {g.topic}
              </span>
              <span
                className="flex-shrink-0 text-stone-600 text-xs transition-transform duration-200 group-hover:text-stone-400"
                style={{ transform: open.has(i) ? 'rotate(180deg)' : 'none' }}
              >
                ▼
              </span>
            </button>

            {open.has(i) && (
              <div className="px-5 pb-5 pt-4 bg-stone-950/40 border-t border-stone-800/60">
                <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {g.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Root export ───────────────────────────────────────────────────

export default function AnalysisReader({
  analysis,
  selectedVocab,
  selectedPhrases,
  onToggleVocab,
  onTogglePhrase,
  onSelectAllVocab,
  onDeselectAllVocab,
  onSelectAllPhrases,
  onDeselectAllPhrases,
}) {
  return (
    <div>
      <TranslationSection translations={analysis.translations} />
      <VocabSection
        vocabulary={analysis.vocabulary}
        selectedVocab={selectedVocab}
        onToggleVocab={onToggleVocab}
        onSelectAll={onSelectAllVocab}
        onDeselectAll={onDeselectAllVocab}
      />
      <PhrasesSection
        phrases={analysis.phrases}
        selectedPhrases={selectedPhrases}
        onTogglePhrase={onTogglePhrase}
        onSelectAll={onSelectAllPhrases}
        onDeselectAll={onDeselectAllPhrases}
      />
      <GrammarSection grammar={analysis.grammar} />
    </div>
  )
}
