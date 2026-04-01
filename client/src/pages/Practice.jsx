import { useState } from 'react'
import { api } from '../services/api.js'
import PracticeCard from '../components/PracticeCard.jsx'

const MODES = [
  {
    id: 'flashcard',
    label: 'Flashcard',
    desc: 'Flip through your vocabulary cards',
    icon: '⧉',
    count: 20,
    color: 'yellow',
  },
  {
    id: 'quiz',
    label: 'Quiz',
    desc: 'Multiple choice — German to English and back',
    icon: '⊕',
    count: 10,
    color: 'sky',
  },
  {
    id: 'fill-blank',
    label: 'Fill in the Blank',
    desc: 'Complete sentences with the right word',
    icon: '⊘',
    count: 8,
    color: 'violet',
  },
  {
    id: 'case-drill',
    label: 'Case Drill',
    desc: 'Practice German cases and declension',
    icon: '⊛',
    count: 8,
    color: 'rose',
  },
  {
    id: 'translation',
    label: 'Translation',
    desc: 'Translate sentences using your vocabulary',
    icon: '⇄',
    count: 6,
    color: 'emerald',
  },
]

// ── Phase: Select mode ────────────────────────────────────────────────────────

function ModeSelect({ onSelect, error }) {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-stone-100 mb-2">Practice</h1>
      <p className="text-stone-400 font-sans text-sm mb-10">
        Choose a mode to begin your session
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-sm font-sans">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {MODES.map(({ id, label, desc, icon, count }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="flex items-center gap-5 p-5 bg-stone-900 border border-stone-800 rounded-xl hover:border-yellow-500/40 hover:bg-stone-800/80 transition-all text-left group"
          >
            <span className="text-2xl text-stone-500 group-hover:text-yellow-400 transition-colors w-8 text-center shrink-0">
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-200 font-sans text-sm mb-0.5">{label}</p>
              <p className="text-stone-500 font-sans text-xs">{desc}</p>
            </div>
            <span className="text-stone-700 font-sans text-xs shrink-0">{count} cards</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Phase: Loading ────────────────────────────────────────────────────────────

function Loading({ modeLabel }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-5" />
      <p className="text-stone-400 font-sans text-sm">Generating {modeLabel} session…</p>
    </div>
  )
}

// ── Phase: Session ────────────────────────────────────────────────────────────

function Session({ questions, currentIdx, onAnswer }) {
  const progress = (currentIdx / questions.length) * 100

  return (
    <div className="flex flex-col min-h-screen">
      {/* Thin progress bar at top */}
      <div className="h-0.5 bg-stone-800 shrink-0">
        <div
          className="h-full bg-yellow-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Counter */}
        <p className="text-stone-600 font-sans text-xs mb-10 tracking-widest uppercase">
          {currentIdx + 1} <span className="text-stone-700">/ {questions.length}</span>
        </p>

        {/* Card */}
        <div className="w-full max-w-xl">
          <PracticeCard
            key={currentIdx}
            question={questions[currentIdx]}
            onComplete={onAnswer}
          />
        </div>
      </div>
    </div>
  )
}

// ── Phase: Summary ────────────────────────────────────────────────────────────

function Summary({ answers, mode, sessionStart, onRestart, onChangeMode }) {
  const score = answers.filter(a => a.correct).length
  const total = answers.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const elapsed = Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
  const modeConfig = MODES.find(m => m.id === mode)

  const weakWords = answers
    .filter(a => !a.correct)
    .map(a => a.word)
    .filter(Boolean)

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[80vh] px-6 py-12">
      <div className="w-full max-w-md text-center">
        {/* Mode label */}
        <p className="text-stone-600 font-sans text-xs mb-3 tracking-widest uppercase">
          {modeConfig?.label ?? mode} — Session complete
        </p>

        {/* Score */}
        <div className="mb-8">
          <p className="font-display text-8xl font-bold text-stone-100 leading-none mb-2">
            {pct}
            <span className="text-3xl text-stone-500 font-normal">%</span>
          </p>
          <p className="text-stone-500 font-sans text-sm">
            {score} correct out of {total} · {elapsed} min
          </p>
        </div>

        {/* Weak words */}
        {weakWords.length > 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-8 text-left">
            <p className="text-stone-500 font-sans text-xs mb-3 uppercase tracking-wider">
              Words to review
            </p>
            <div className="flex flex-wrap gap-2">
              {weakWords.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-900/30 border border-red-700/40 text-red-300 rounded-lg text-sm font-sans"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-2.5 bg-yellow-400 text-stone-950 font-semibold rounded-xl text-sm font-sans hover:bg-yellow-300 transition-colors"
          >
            Practice Again
          </button>
          <button
            onClick={onChangeMode}
            className="px-6 py-2.5 bg-stone-800 text-stone-300 font-semibold rounded-xl text-sm font-sans hover:bg-stone-700 transition-colors"
          >
            Change Mode
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Practice() {
  const [phase, setPhase] = useState('select') // 'select' | 'loading' | 'session' | 'summary'
  const [mode, setMode] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [sessionStart, setSessionStart] = useState(null)
  const [error, setError] = useState(null)

  async function startSession(selectedMode) {
    setMode(selectedMode)
    setError(null)
    setPhase('loading')

    const cfg = MODES.find(m => m.id === selectedMode)
    try {
      const data = await api.generatePractice({ mode: selectedMode, count: cfg.count })
      setQuestions(data.questions)
      setCurrentIdx(0)
      setAnswers([])
      setSessionStart(Date.now())
      setPhase('session')
    } catch (err) {
      setError(err.message)
      setPhase('select')
    }
  }

  function handleAnswer(result) {
    const next = [...answers, result]
    setAnswers(next)

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      // Session finished — log progress silently
      const elapsed = Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
      const score = next.filter(a => a.correct).length
      const modeLabel = MODES.find(m => m.id === mode)?.label ?? mode
      api.logProgress({
        mode: modeLabel,
        score,
        total: next.length,
        duration: elapsed,
      }).catch(console.error)

      setPhase('summary')
    }
  }

  const modeLabel = MODES.find(m => m.id === mode)?.label ?? mode

  if (phase === 'select') {
    return <ModeSelect onSelect={startSession} error={error} />
  }

  if (phase === 'loading') {
    return <Loading modeLabel={modeLabel} />
  }

  if (phase === 'session') {
    return (
      <Session
        questions={questions}
        currentIdx={currentIdx}
        onAnswer={handleAnswer}
      />
    )
  }

  if (phase === 'summary') {
    return (
      <Summary
        answers={answers}
        mode={mode}
        sessionStart={sessionStart}
        onRestart={() => startSession(mode)}
        onChangeMode={() => {
          setPhase('select')
          setMode(null)
          setQuestions([])
          setAnswers([])
          setError(null)
        }}
      />
    )
  }

  return null
}
