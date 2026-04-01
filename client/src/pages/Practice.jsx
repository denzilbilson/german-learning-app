const MODES = [
  { id: 'flashcard',    label: 'Flashcard',      desc: 'Flip through your vocabulary cards',         icon: '⧉' },
  { id: 'quiz',         label: 'Quiz',            desc: 'Multiple choice — German to English',        icon: '⊕' },
  { id: 'fill-blank',   label: 'Fill in the Blank', desc: 'Complete sentences using target words',   icon: '⊘' },
  { id: 'case-drill',   label: 'Case Drill',      desc: 'Practice German cases and declension',       icon: '⊛' },
  { id: 'translation',  label: 'Translation',     desc: 'Translate sentences using your vocabulary', icon: '⇄' },
]

export default function Practice() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-stone-100 mb-2">Practice</h1>
      <p className="text-stone-400 font-sans text-sm mb-10">Choose a mode to begin your session</p>

      <div className="grid gap-3">
        {MODES.map(({ id, label, desc, icon }) => (
          <button
            key={id}
            className="flex items-center gap-5 p-5 bg-stone-900 border border-stone-800 rounded-xl hover:border-yellow-500/50 hover:bg-stone-800 transition-all text-left group"
          >
            <span className="text-2xl text-stone-500 group-hover:text-yellow-400 transition-colors w-8 text-center">{icon}</span>
            <div>
              <p className="font-semibold text-stone-200 font-sans text-sm mb-0.5">{label}</p>
              <p className="text-stone-500 font-sans text-xs">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
