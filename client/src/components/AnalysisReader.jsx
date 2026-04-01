/**
 * AnalysisReader — displays a Claude text analysis result with selectable items.
 *
 * Renders four sections from the analysis object:
 *   1. Translations     — side-by-side German/English table with audio buttons
 *   2. Vocabulary       — checkboxed table with word, literal/intended meaning, POS badge, level
 *                         Rows expand to show case examples
 *   3. Phrases & Idioms — checkboxed card list
 *   4. Grammar Notes    — collapsible accordion (first item open by default)
 *
 * Props:
 *   analysis           {object}      — full analysis object from POST /api/analyze
 *   selectedVocab      {Set<number>} — indices of selected vocabulary items
 *   selectedPhrases    {Set<number>} — indices of selected phrase items
 *   onToggleVocab      {(i) => void} — toggle a vocabulary index in/out of selection
 *   onTogglePhrase     {(i) => void} — toggle a phrase index
 *   onSelectAllVocab   {() => void}  — select all vocabulary items
 *   onDeselectAllVocab {() => void}  — deselect all vocabulary items
 *   onSelectAllPhrases {() => void}  — select all phrases
 *   onDeselectAllPhrases {() => void}
 */
import { useState } from 'react'
import SpeakButton from './SpeakButton.jsx'
import GenderBadge from './GenderBadge.jsx'

// ── Badge helpers ─────────────────────────────────────────────────

function posBadgeClass(pos = '') {
  const p = pos.toLowerCase()
  if (p.includes('noun'))     return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
  if (p.includes('verb'))     return 'bg-accent-green/10 text-accent-green border-accent-green/20'
  if (p.includes('adj'))      return 'bg-orange-400/10 text-orange-300 border-orange-400/20'
  if (p.includes('adv'))      return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20'
  if (p.includes('conj'))     return 'bg-pink-400/10 text-pink-300 border-pink-400/20'
  if (p.includes('prep'))     return 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20'
  if (p.includes('article'))  return 'bg-accent-gold/10 text-accent-gold border-accent-gold/20'
  if (p.includes('pronoun'))  return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20'
  return 'bg-tertiary text-secondary border-warm-700'
}

function levelBadgeClass(level = '') {
  switch (level.toUpperCase()) {
    case 'A1': return 'bg-accent-green/10 text-accent-green'
    case 'A2': return 'bg-teal-400/10 text-teal-400'
    case 'B1': return 'bg-accent-gold/10 text-accent-gold'
    case 'B2': return 'bg-amber-400/10 text-amber-400'
    case 'C1': return 'bg-orange-400/10 text-orange-400'
    case 'C2': return 'bg-accent-red/10 text-accent-red'
    default:   return 'bg-tertiary text-secondary'
  }
}

// ── Section heading ───────────────────────────────────────────────

function SectionHeading({ children, count, aside }) {
  return (
    <div className="flex items-baseline justify-between mb-6">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-2xl text-primary">{children}</h2>
        {count !== undefined && (
          <span className="text-sm text-secondary">
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
      <div className="rounded-xl overflow-hidden border border-warm-800">
        <div className="grid grid-cols-2 divide-x divide-warm-800 bg-tertiary/40 border-b border-warm-800">
          <div className="px-5 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">Deutsch</div>
          <div className="px-5 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">English</div>
        </div>
        {translations.map((t, i) => (
          <div
            key={i}
            className={`grid grid-cols-2 divide-x divide-warm-800/60 border-b border-warm-800/40 last:border-0
              ${i % 2 === 0 ? 'bg-secondary/60' : 'bg-secondary/20'}`}
          >
            <div className="px-5 py-3.5 text-primary text-sm leading-relaxed font-medium flex items-center gap-2">
              <span>{t.german}</span>
              <SpeakButton text={t.german} />
            </div>
            <div className="px-5 py-3.5 text-secondary text-sm leading-relaxed italic">
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

  return (
    <section className="mb-14">
      <SectionHeading
        count={vocabulary.length}
        aside={
          <div className="flex items-center gap-4">
            <span className="text-xs text-secondary">{selectedVocab.size} selected</span>
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-secondary hover:text-accent-gold underline-offset-2 hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        }
      >
        Vocabulary
      </SectionHeading>

      <div className="rounded-xl border border-warm-800 overflow-hidden">
        <div className="grid grid-cols-[2.5rem_11rem_1fr_9rem_4.5rem_2.5rem] bg-tertiary/50 border-b border-warm-800">
          <div className="px-3 py-2.5" />
          <div className="px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">Word</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">Literal → Meaning</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">Part of Speech</div>
          <div className="px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wider">Level</div>
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
                  border-b border-warm-800/50 last:border-0
                  ${selectedVocab.has(i) ? 'bg-accent-gold/[0.04]' : 'hover:bg-tertiary/30'}`}
              >
                <div className="px-3 py-3.5 flex justify-center">
                  <input
                    type="checkbox"
                    checked={selectedVocab.has(i)}
                    onChange={() => onToggleVocab(i)}
                    className="w-4 h-4 rounded border-warm-600 bg-tertiary accent-accent-gold cursor-pointer"
                    style={{ accentColor: '#D4A843' }}
                  />
                </div>
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary font-semibold text-sm leading-snug">{v.word}</span>
                    <SpeakButton text={v.word} />
                  </div>
                </div>
                <div className="px-4 py-3.5 min-w-0">
                  <div className="text-secondary text-xs mb-0.5 truncate">{v.literalMeaning}</div>
                  <div className="text-warm-200 text-sm leading-snug">{v.intendedMeaning}</div>
                </div>
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs border ${posBadgeClass(v.partOfSpeech)}`}>
                      {v.partOfSpeech}
                    </span>
                    <GenderBadge pos={v.partOfSpeech} />
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${levelBadgeClass(v.level)}`}>
                    {v.level}
                  </span>
                </div>
                <div className="px-3 py-3.5 flex justify-center">
                  {examples.length > 0 && (
                    <button
                      onClick={() => toggleExpand(i)}
                      className="text-warm-600 hover:text-warm-300 leading-none"
                      title="Show examples"
                    >
                      <span className="text-[10px]">{expanded.has(i) ? '▲' : '▼'}</span>
                    </button>
                  )}
                </div>
              </div>

              {expanded.has(i) && examples.length > 0 && (
                <div className={`px-12 py-4 border-b border-warm-800/40 last:border-0
                  ${selectedVocab.has(i) ? 'bg-accent-gold/[0.03]' : 'bg-primary/30'}`}>
                  <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2.5">
                    Examples
                  </div>
                  <ul className="space-y-2">
                    {examples.map((ex, j) => (
                      <li key={j} className="flex gap-3 text-sm text-warm-300 leading-relaxed">
                        <span className="text-warm-700 mt-0.5 flex-shrink-0">·</span>
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
            <span className="text-xs text-secondary">{selectedPhrases.size} selected</span>
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-secondary hover:text-accent-gold underline-offset-2 hover:underline"
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
            className={`flex items-start gap-4 px-5 py-4 rounded-xl border cursor-pointer
              ${selectedPhrases.has(i)
                ? 'border-accent-gold/25 bg-accent-gold/[0.04]'
                : 'border-warm-800 bg-secondary/40 hover:border-warm-700 hover:bg-secondary/60'}`}
          >
            <input
              type="checkbox"
              checked={selectedPhrases.has(i)}
              onChange={() => onTogglePhrase(i)}
              className="mt-1 w-4 h-4 rounded border-warm-600 bg-tertiary cursor-pointer flex-shrink-0"
              style={{ accentColor: '#D4A843' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-primary font-semibold text-base leading-snug">{p.phrase}</div>
                <SpeakButton text={p.phrase} />
              </div>
              <div className="text-secondary text-sm mt-1 leading-relaxed">{p.englishMeaning}</div>
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
  const [open, setOpen] = useState(new Set([0]))

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
          <div key={i} className="rounded-xl border border-warm-800 overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left
                bg-secondary/60 hover:bg-secondary group"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-mono font-bold">
                {i + 1}
              </span>
              <span className="flex-1 font-display text-lg text-primary group-hover:text-warm-100">
                {g.topic}
              </span>
              <span
                className="flex-shrink-0 text-warm-600 text-xs group-hover:text-secondary"
                style={{ transform: open.has(i) ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
              >
                ▼
              </span>
            </button>

            {open.has(i) && (
              <div className="px-5 pb-5 pt-4 bg-primary/40 border-t border-warm-800/60">
                <p className="text-warm-300 text-sm leading-relaxed whitespace-pre-wrap">
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
