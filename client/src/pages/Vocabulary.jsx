import { useState, useEffect } from 'react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function Vocabulary() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)

  useEffect(() => {
    fetch('/api/vocabulary')
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    const matchSearch = !search || Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    const matchLevel = !levelFilter || r.Level === levelFilter
    return matchSearch && matchLevel
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-100 mb-1">Vocabulary</h1>
          <p className="text-stone-400 text-sm font-sans">{rows.length} words saved</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 text-stone-100 placeholder-stone-600 text-sm font-sans focus:outline-none focus:border-yellow-500 transition-colors w-64"
        />
        <div className="flex gap-2">
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(levelFilter === l ? null : l)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                levelFilter === l
                  ? 'bg-yellow-400 text-stone-900'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-stone-500 font-sans text-sm">Loading…</p>
      ) : (
        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-stone-800">
                {['Word', 'Literal Meaning', 'Intended Meaning', 'Part of Speech', 'Level', 'Source'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-stone-500 uppercase tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-stone-800/50 hover:bg-stone-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-stone-100">{row.Word}</td>
                  <td className="px-4 py-3 text-stone-400">{row['Literal Meaning']}</td>
                  <td className="px-4 py-3 text-stone-300">{row['Intended Meaning']}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-stone-800 text-stone-400 rounded text-xs">{row['Part of Speech']}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-300 rounded text-xs font-semibold">{row.Level}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{row.Source}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-600">No entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
