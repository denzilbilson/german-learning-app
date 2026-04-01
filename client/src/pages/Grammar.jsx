import { useState, useEffect, useMemo } from 'react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const LEVEL_COLORS = {
  A1: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  A2: 'bg-teal-400/10 text-teal-400 border-teal-400/20',
  B1: 'bg-accent-gold/10 text-accent-gold border-accent-gold/20',
  B2: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  C1: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  C2: 'bg-accent-red/10 text-accent-red border-accent-red/20',
}

function LevelBadge({ level }) {
  if (!level) return null
  const cls = LEVEL_COLORS[level] || 'bg-tertiary text-secondary border-warm-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold font-sans ${cls}`}>
      {level}
    </span>
  )
}

function GrammarCard({ rule }) {
  const [expanded, setExpanded] = useState(false)
  const hasExamples = rule.examples && rule.examples.trim().length > 0

  return (
    <div className="bg-secondary border border-warm-800 rounded-xl overflow-hidden">
      <button
        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-tertiary/40"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-accent-gold/60 text-lg shrink-0">§</span>
          <h3 className="font-display text-base font-semibold text-primary truncate">
            {rule.topic}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LevelBadge level={rule.level} />
          {hasExamples && (
            <span
              className="text-secondary text-xs"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', display: 'inline-block' }}
            >
              ▶
            </span>
          )}
        </div>
      </button>

      <div className="px-6 pb-2">
        <p className="text-warm-300 font-sans text-sm leading-relaxed">
          {rule.explanation}
        </p>
      </div>

      {hasExamples && expanded && (
        <div className="px-6 pb-5 pt-3 border-t border-warm-800/60 mt-2">
          <p className="text-xs text-secondary uppercase tracking-wider font-sans font-medium mb-2">
            Examples
          </p>
          <div className="space-y-1.5">
            {rule.examples.split(/[.,]\s+(?=[A-ZÜÄÖ])/).map((ex, i) => (
              <p key={i} className="text-secondary font-sans text-sm italic pl-3 border-l-2 border-warm-700">
                {ex.trim().replace(/\.$/, '')}.
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Grammar() {
  const [rules, setRules]       = useState([])
  const [search, setSearch]     = useState('')
  const [levelFilter, setLevel] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/grammar')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setRules(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let out = rules
    if (levelFilter) out = out.filter(r => r.level === levelFilter)
    if (search) {
      const s = search.toLowerCase()
      out = out.filter(r =>
        r.topic?.toLowerCase().includes(s) ||
        r.explanation?.toLowerCase().includes(s) ||
        r.examples?.toLowerCase().includes(s)
      )
    }
    return out
  }, [rules, search, levelFilter])

  const grouped = useMemo(() => {
    if (levelFilter || search) return { All: filtered }
    const groups = {}
    for (const rule of filtered) {
      const key = rule.level || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(rule)
    }
    return groups
  }, [filtered, levelFilter, search])

  const levelCounts = useMemo(() => {
    const counts = {}
    for (const rule of rules) counts[rule.level] = (counts[rule.level] || 0) + 1
    return counts
  }, [rules])

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-primary">Grammar</h1>
        <p className="text-secondary font-sans text-sm mt-1">
          Reference rules for B1 → B2 learners · {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search grammar topics…"
          className="w-full bg-secondary border border-warm-700 rounded-xl px-4 py-2.5 text-primary placeholder-warm-600 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLevel(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans border ${
              !levelFilter
                ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/30'
                : 'text-secondary border-warm-700 hover:text-primary hover:border-warm-600'
            }`}
          >
            All ({rules.length})
          </button>
          {LEVELS.filter(l => levelCounts[l]).map(l => (
            <button
              key={l}
              onClick={() => setLevel(levelFilter === l ? null : l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans border ${
                levelFilter === l
                  ? `${LEVEL_COLORS[l]} border`
                  : 'text-secondary border-warm-700 hover:text-primary hover:border-warm-600'
              }`}
            >
              {l} ({levelCounts[l]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-secondary border border-warm-800 rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-tertiary rounded w-48 mb-3" />
              <div className="h-3 bg-tertiary rounded w-full mb-2" />
              <div className="h-3 bg-tertiary rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm font-sans flex items-center justify-between gap-4">
          <span>Failed to load grammar rules: {error}</span>
          <button onClick={load} className="text-xs px-3 py-1.5 bg-accent-red/20 rounded-lg hover:bg-accent-red/30 shrink-0">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-warm-600 font-sans text-sm">
            {search || levelFilter ? 'No rules match your search.' : 'No grammar rules yet.'}
          </p>
          {!search && !levelFilter && (
            <p className="text-warm-700 font-sans text-xs mt-2">
              Rules are added automatically when you analyze text.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, groupRules]) => (
            <div key={groupKey}>
              {groupKey !== 'All' && (
                <div className="flex items-center gap-3 mb-3">
                  <LevelBadge level={groupKey} />
                  <div className="flex-1 h-px bg-warm-800" />
                  <span className="text-xs text-warm-600 font-sans">{groupRules.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {groupRules.map((rule, i) => (
                  <GrammarCard key={`${rule.topic}-${i}`} rule={rule} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
