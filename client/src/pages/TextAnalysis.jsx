import { useState } from 'react'

export default function TextAnalysis() {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-stone-100 mb-2">Text Analysis</h1>
      <p className="text-stone-400 font-sans text-sm mb-8">Paste German text for AI-powered vocabulary and grammar breakdown</p>

      {!result ? (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your German text here…"
            rows={10}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl p-4 text-stone-100 placeholder-stone-600 font-sans text-sm leading-relaxed resize-none focus:outline-none focus:border-yellow-500 transition-colors"
          />
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="Source (optional — e.g. Der Spiegel, textbook)"
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-600 font-sans text-sm focus:outline-none focus:border-yellow-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm font-sans">{error}</p>}
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="px-6 py-3 bg-yellow-400 text-stone-900 rounded-lg font-semibold text-sm hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analyzing…' : 'Analyze Text'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setResult(null)}
            className="text-stone-400 hover:text-stone-200 text-sm font-sans flex items-center gap-2 transition-colors"
          >
            ← New Analysis
          </button>
          <pre className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-stone-300 text-sm font-sans overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
