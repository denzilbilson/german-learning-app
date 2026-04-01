import { useState, useEffect } from 'react'

export default function Grammar() {
  const [rules, setRules] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/grammar')
      .then(r => r.json())
      .then(data => { setRules(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = rules.filter(r =>
    !search || r.topic?.toLowerCase().includes(search.toLowerCase()) || r.explanation?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-stone-100 mb-2">Grammar</h1>
      <p className="text-stone-400 font-sans text-sm mb-8">Rules and patterns for B1→B2 learners</p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search grammar topics…"
        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-600 text-sm font-sans focus:outline-none focus:border-yellow-500 transition-colors mb-6"
      />

      {loading ? (
        <p className="text-stone-500 font-sans text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-stone-600 font-sans text-sm">No grammar rules found. Add some via text analysis.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((rule, i) => (
            <div key={i} className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <h3 className="font-display text-lg text-stone-100 mb-2">{rule.topic}</h3>
              <p className="text-stone-300 font-sans text-sm leading-relaxed">{rule.explanation}</p>
              {rule.examples && (
                <p className="text-stone-500 font-sans text-xs mt-3 italic">{rule.examples}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
