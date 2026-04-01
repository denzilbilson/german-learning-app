/**
 * GlobalSearch — Cmd+K full-app search modal.
 *
 * Props:
 *   isOpen  {boolean}  — whether the modal is visible
 *   onClose {() => void} — called when the user dismisses (Esc, backdrop click)
 *
 * Features:
 *   - Input debounced 300 ms before calling GET /api/search
 *   - Results grouped by type (vocabulary, phrases, grammar, analysis)
 *   - Match highlighting in title and snippet using accent-gold colour
 *   - Keyboard navigation: ArrowUp/ArrowDown to move, Enter to open, Esc to close
 *   - Recent searches (up to 5) stored in localStorage under "gs_recent_searches"
 *   - Navigates to the relevant page on result selection:
 *       vocabulary → /vocabulary?highlight=<word>
 *       phrases    → /phrases?highlight=<phrase>
 *       grammar    → /grammar?highlight=<topic>
 *       analysis   → /analyze
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'

const RECENT_KEY   = 'gs_recent_searches'
const RECENT_LIMIT = 5

const TYPE_META = {
  vocabulary: { icon: '📖', label: 'Vocabulary', route: (r) => `/vocabulary?highlight=${encodeURIComponent(r.title)}` },
  phrases:    { icon: '💬', label: 'Phrases',    route: (r) => `/phrases?highlight=${encodeURIComponent(r.title)}` },
  grammar:    { icon: '§',  label: 'Grammar',    route: (r) => `/grammar?highlight=${encodeURIComponent(r.title)}` },
  analysis:   { icon: '🔍', label: 'Analyses',   route: ()  => '/analyze' },
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(query) {
  if (!query.trim()) return
  try {
    const prev = loadRecent().filter(q => q !== query.trim())
    const next = [query.trim(), ...prev].slice(0, RECENT_LIMIT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

// Highlight query match within text using accent-gold
function Highlighted({ text, query }) {
  if (!query || !text) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-accent-gold font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

function ResultGroup({ type, results, query, selectedStart, onSelect }) {
  const meta = TYPE_META[type]
  if (!results.length) return null
  return (
    <div>
      <div className="px-4 py-1.5 text-xs text-warm-600 font-semibold uppercase tracking-widest font-sans flex items-center gap-2">
        <span>{meta.icon}</span> {meta.label}
      </div>
      {results.map((r, i) => {
        const globalIdx = selectedStart + i
        return (
          <button
            key={i}
            data-idx={globalIdx}
            onClick={() => onSelect(r, type)}
            className="w-full text-left px-4 py-2.5 hover:bg-tertiary focus:bg-tertiary outline-none group"
          >
            <p className="text-sm font-sans text-primary font-medium leading-tight truncate">
              <Highlighted text={r.title} query={query} />
            </p>
            {r.snippet && (
              <p className="text-xs text-secondary font-sans mt-0.5 line-clamp-1">
                <Highlighted text={r.snippet} query={query} />
              </p>
            )}
            {r.meta && (
              <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-tertiary border border-warm-700 rounded text-warm-500 font-sans">
                {r.meta}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function GlobalSearch({ isOpen, onClose }) {
  const navigate   = useNavigate()
  const inputRef   = useRef(null)
  const listRef    = useRef(null)

  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState(null)   // null = not searched yet
  const [loading,   setLoading]   = useState(false)
  const [selIdx,    setSelIdx]    = useState(0)
  const [recent,    setRecent]    = useState(loadRecent)
  const debounceRef = useRef(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults(null)
      setSelIdx(0)
      setRecent(loadRecent())
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults(null)
      setLoading(false)
      setSelIdx(0)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query.trim())
        setResults(data.results)
        setSelIdx(0)
      } catch {
        setResults({ vocabulary: [], phrases: [], grammar: [], analysis: [] })
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Flatten results for keyboard navigation
  const flatResults = results
    ? [
        ...results.vocabulary.map(r => ({ r, type: 'vocabulary' })),
        ...results.phrases.map(r    => ({ r, type: 'phrases' })),
        ...results.grammar.map(r    => ({ r, type: 'grammar' })),
        ...results.analysis.map(r   => ({ r, type: 'analysis' })),
      ]
    : []

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${selIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selIdx])

  function handleSelect(result, type) {
    saveRecent(query || result.title)
    setRecent(loadRecent())
    const routeFn = TYPE_META[type]?.route
    const url     = routeFn ? routeFn(result) : '/'
    onClose()
    navigate(url)
  }

  function handleRecentSelect(q) {
    setQuery(q)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIdx(i => Math.min(i + 1, flatResults.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIdx(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && flatResults.length > 0) {
      e.preventDefault()
      const { r, type } = flatResults[selIdx] || flatResults[0]
      handleSelect(r, type)
    }
  }

  if (!isOpen) return null

  // Count starting indices per group
  const vLen = results?.vocabulary?.length ?? 0
  const pLen = results?.phrases?.length ?? 0
  const gLen = results?.grammar?.length ?? 0

  const noResults = results && flatResults.length === 0 && !loading

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-secondary border border-warm-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-warm-800">
          <span className="text-warm-600 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search vocabulary, phrases, grammar…"
            className="flex-1 bg-transparent py-4 text-primary placeholder-warm-700 font-sans text-sm outline-none border-b-2 border-transparent focus:border-accent-gold transition-colors"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-accent-gold border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <kbd className="shrink-0 text-xs text-warm-700 font-sans bg-tertiary border border-warm-700 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {/* Recent searches (shown when input empty) */}
          {!query && recent.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-xs text-warm-600 font-semibold uppercase tracking-widest font-sans">
                Recent
              </p>
              {recent.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentSelect(q)}
                  className="w-full text-left px-4 py-2 hover:bg-tertiary flex items-center gap-3 text-sm font-sans text-secondary hover:text-primary"
                >
                  <span className="text-warm-700">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
                    </svg>
                  </span>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="px-4 py-8 text-center text-secondary font-sans text-sm">
              No results for <span className="text-primary font-medium">"{query}"</span>
            </div>
          )}

          {/* Results grouped by type */}
          {results && flatResults.length > 0 && (
            <>
              <ResultGroup
                type="vocabulary"
                results={results.vocabulary}
                query={query}
                selectedStart={0}
                onSelect={handleSelect}
              />
              <ResultGroup
                type="phrases"
                results={results.phrases}
                query={query}
                selectedStart={vLen}
                onSelect={handleSelect}
              />
              <ResultGroup
                type="grammar"
                results={results.grammar}
                query={query}
                selectedStart={vLen + pLen}
                onSelect={handleSelect}
              />
              <ResultGroup
                type="analysis"
                results={results.analysis}
                query={query}
                selectedStart={vLen + pLen + gLen}
                onSelect={handleSelect}
              />
            </>
          )}

          {/* Empty state prompt */}
          {!query && recent.length === 0 && (
            <p className="px-4 py-6 text-center text-warm-700 font-sans text-sm">
              Start typing to search vocabulary, phrases, grammar, and analyses
            </p>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-warm-800 flex items-center gap-4 text-xs text-warm-700 font-sans">
          <span><kbd className="bg-tertiary border border-warm-700 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="bg-tertiary border border-warm-700 rounded px-1">↵</kbd> open</span>
          <span><kbd className="bg-tertiary border border-warm-700 rounded px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
