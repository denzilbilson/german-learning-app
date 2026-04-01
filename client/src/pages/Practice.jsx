import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import PracticeCard from '../components/PracticeCard.jsx'
import { useToast } from '../components/Toast.jsx'
import { detectGender } from '../components/GenderBadge.jsx'
import SpeakButton from '../components/SpeakButton.jsx'

const MODES = [
  { id: 'flashcard',     label: 'Flashcard',        desc: 'Flip through your vocabulary cards',             icon: '⧉', count: 20 },
  { id: 'quiz',          label: 'Quiz',              desc: 'Multiple choice — German to English and back',   icon: '⊕', count: 10 },
  { id: 'fill-blank',    label: 'Fill in the Blank', desc: 'Complete sentences with the right word',         icon: '⊘', count: 8  },
  { id: 'case-drill',    label: 'Case Drill',        desc: 'Practice German cases and declension',           icon: '⊛', count: 8  },
  { id: 'translation',   label: 'Translation',       desc: 'Translate sentences using your vocabulary',      icon: '⇄', count: 6  },
  { id: 'article-drill', label: 'Article Drill',     desc: 'Choose der / die / das for each noun',           icon: '⟁', count: 15, client: true },
]

// ── Phase: Select mode ────────────────────────────────────────────────────────

function ModeSelect({ onSelect, error }) {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-primary mb-2">Practice</h1>
      <p className="text-secondary font-sans text-sm mb-10">
        Choose a mode to begin your session
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm font-sans">
          {error.includes('No vocabulary') ? (
            <span>
              No vocabulary found.{' '}
              <Link to="/vocabulary" className="underline hover:text-accent-red/80">Add some words first →</Link>
            </span>
          ) : error}
        </div>
      )}

      <div className="grid gap-3">
        {MODES.map(({ id, label, desc, icon, count }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="flex items-center gap-5 p-5 bg-secondary border border-warm-800 rounded-xl hover:border-accent-gold/40 hover:bg-tertiary/80 text-left group"
          >
            <span className="text-2xl text-secondary group-hover:text-accent-gold w-8 text-center shrink-0">
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary font-sans text-sm mb-0.5">{label}</p>
              <p className="text-secondary font-sans text-xs">{desc}</p>
            </div>
            <span className="text-warm-700 font-sans text-xs shrink-0">{count} cards</span>
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
      <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mb-5" />
      <p className="text-secondary font-sans text-sm">Generating {modeLabel} session…</p>
    </div>
  )
}

// ── Phase: Session ────────────────────────────────────────────────────────────

function Session({ questions, currentIdx, onAnswer }) {
  const progress = (currentIdx / questions.length) * 100

  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-0.5 bg-warm-800 shrink-0">
        <div
          className="h-full bg-accent-gold"
          style={{ width: `${progress}%`, transition: 'width 500ms ease-out' }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <p className="text-warm-600 font-sans text-xs mb-10 tracking-widest uppercase">
          {currentIdx + 1} <span className="text-warm-700">/ {questions.length}</span>
        </p>

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
  const score   = answers.filter(a => a.correct).length
  const total   = answers.length
  const pct     = total > 0 ? Math.round((score / total) * 100) : 0
  const elapsed = Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
  const modeConfig = MODES.find(m => m.id === mode)

  const weakWords = answers
    .filter(a => !a.correct)
    .map(a => a.word)
    .filter(Boolean)

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[80vh] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-warm-600 font-sans text-xs mb-3 tracking-widest uppercase">
          {modeConfig?.label ?? mode} — Session complete
        </p>

        <div className="mb-8">
          <p className="font-display text-8xl font-bold text-primary leading-none mb-2">
            {pct}
            <span className="text-3xl text-secondary font-normal">%</span>
          </p>
          <p className="text-secondary font-sans text-sm">
            {score} correct out of {total} · {elapsed} min
          </p>
        </div>

        {weakWords.length > 0 && (
          <div className="bg-secondary border border-warm-800 rounded-xl p-5 mb-8 text-left">
            <p className="text-secondary font-sans text-xs mb-3 uppercase tracking-wider">
              Words to review
            </p>
            <div className="flex flex-wrap gap-2">
              {weakWords.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg text-sm font-sans"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-2.5 bg-accent-gold text-primary font-semibold rounded-xl text-sm font-sans hover:brightness-110"
          >
            Practice Again
          </button>
          <button
            onClick={onChangeMode}
            className="px-6 py-2.5 bg-tertiary text-warm-300 font-semibold rounded-xl text-sm font-sans hover:bg-warm-700"
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
  const toast = useToast()

  const [phase, setPhase]             = useState('select')
  const [mode, setMode]               = useState(null)
  const [questions, setQuestions]     = useState([])
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [answers, setAnswers]         = useState([])
  const [sessionStart, setSessionStart] = useState(null)
  const [error, setError]             = useState(null)

  async function startSession(selectedMode) {
    setMode(selectedMode)
    setError(null)
    setPhase('loading')

    const cfg = MODES.find(m => m.id === selectedMode)

    // Article drill is client-side: pull nouns from vocabulary
    if (selectedMode === 'article-drill') {
      try {
        const vocab = await api.getVocabulary()
        const nouns = vocab.filter(r => {
          const pos = r['Part of Speech'] || ''
          return pos.toLowerCase().includes('noun') || detectGender(pos) !== null
        })
        if (nouns.length < 3) {
          setError('Not enough nouns in your vocabulary for Article Drill. Add some nouns first.')
          setPhase('select')
          return
        }
        // Build questions — shuffle, take up to count
        const shuffled = [...nouns].sort(() => Math.random() - 0.5).slice(0, cfg.count)
        const qs = shuffled.map(row => ({
          type:    'article-drill',
          front:   stripArticle(row.Word || ''),
          answer:  detectGender(row['Part of Speech'] || ''),
          pos:     row['Part of Speech'] || '',
          word:    row.Word || '',
          meaning: row['Intended Meaning'] || row['Literal Meaning'] || '',
        })).filter(q => q.answer) // only nouns we can detect gender for

        if (qs.length < 3) {
          setError('Not enough nouns with detectable gender. Make sure Part of Speech includes (m.), (f.), or (n.).')
          setPhase('select')
          return
        }

        setQuestions(qs)
        setCurrentIdx(0)
        setAnswers([])
        setSessionStart(Date.now())
        setPhase('session')
      } catch (err) {
        setError(err.message)
        setPhase('select')
      }
      return
    }

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

  function stripArticle(word) {
    return word.replace(/^(der|die|das)\s+/i, '')
  }

  function handleAnswer(result) {
    const next = [...answers, result]
    setAnswers(next)

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      const elapsed = Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
      const score   = next.filter(a => a.correct).length
      const modeLabel = MODES.find(m => m.id === mode)?.label ?? mode
      api.logProgress({ mode: modeLabel, score, total: next.length, duration: elapsed })
        .catch(() => {}) // silent — progress logging is non-critical

      setPhase('summary')
      const pct = Math.round((score / next.length) * 100)
      toast.info(`Session complete — ${pct}%`)
    }
  }

  const modeLabel = MODES.find(m => m.id === mode)?.label ?? mode

  if (phase === 'select') return <ModeSelect onSelect={startSession} error={error} />
  if (phase === 'loading') return <Loading modeLabel={modeLabel} />

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
