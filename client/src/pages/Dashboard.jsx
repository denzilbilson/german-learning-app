export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold text-stone-100 mb-2">Dashboard</h1>
      <p className="text-stone-400 font-sans text-sm mb-8">Your German learning at a glance</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Vocabulary', value: '—', sub: 'words saved' },
          { label: 'Phrases', value: '—', sub: 'phrases saved' },
          { label: 'Days Active', value: '—', sub: 'since you started' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-stone-900 rounded-xl p-6 border border-stone-800">
            <p className="text-xs text-stone-500 uppercase tracking-wider font-sans mb-2">{label}</p>
            <p className="font-display text-4xl text-stone-100 mb-1">{value}</p>
            <p className="text-xs text-stone-500 font-sans">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-stone-900 rounded-xl p-6 border border-stone-800">
        <h2 className="font-display text-lg text-stone-200 mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <a href="/analyze" className="px-5 py-2.5 bg-yellow-400 text-stone-900 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-colors">
            Analyze Text
          </a>
          <a href="/practice" className="px-5 py-2.5 bg-stone-800 text-stone-200 rounded-lg text-sm font-semibold hover:bg-stone-700 transition-colors border border-stone-700">
            Practice
          </a>
        </div>
      </div>
    </div>
  )
}
