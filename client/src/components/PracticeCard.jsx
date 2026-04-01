import { useState } from 'react'
import { api } from '../services/api.js'

// ── Flashcard ─────────────────────────────────────────────────────────────────

function FlashCard({ question, onComplete }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="text-center">
      <div
        className={`rounded-2xl border border-warm-800 bg-secondary mb-8 overflow-hidden cursor-pointer select-none ${!flipped ? 'hover:border-warm-700' : ''}`}
        style={{ minHeight: '200px' }}
        onClick={() => !flipped && setFlipped(true)}
      >
        {!flipped ? (
          <div className="flex flex-col items-center justify-center px-10 py-12">
            <p className="font-display text-5xl text-primary mb-4">{question.front}</p>
            {question.partOfSpeech && (
              <p className="text-secondary font-sans text-sm">{question.partOfSpeech}</p>
            )}
            {question.level && (
              <span className="mt-4 px-2.5 py-0.5 bg-tertiary text-secondary rounded text-xs font-sans">
                {question.level}
              </span>
            )}
            <p className="text-warm-700 font-sans text-xs mt-8 tracking-wider">tap to reveal</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-10 py-12">
            <p className="text-secondary font-sans text-xs mb-2 tracking-widest uppercase">Meaning</p>
            <p className="font-display text-3xl text-accent-gold mb-2">{question.back}</p>
            {question.literalMeaning && question.literalMeaning !== question.back && (
              <p className="text-secondary font-sans text-sm">
                literal: <span className="italic">{question.literalMeaning}</span>
              </p>
            )}
            {question.caseExamples && (
              <p
                className="text-secondary font-sans text-xs mt-4 text-center max-w-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: question.caseExamples }}
              />
            )}
          </div>
        )}
      </div>

      {flipped && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onComplete({ correct: false, word: question.front })}
            className="px-7 py-3 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl font-sans text-sm font-semibold hover:bg-accent-red/20"
          >
            ✗ Missed it
          </button>
          <button
            onClick={() => onComplete({ correct: true, word: question.front })}
            className="px-7 py-3 bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl font-sans text-sm font-semibold hover:bg-accent-green/20"
          >
            ✓ Got it
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared feedback block ─────────────────────────────────────────────────────

function Feedback({ feedback, onContinue, extra }) {
  const ok = feedback.correct
  return (
    <div
      className={`mt-6 rounded-xl p-5 border ${
        ok ? 'bg-accent-green/10 border-accent-green/30' : 'bg-accent-red/10 border-accent-red/30'
      }`}
    >
      <p className={`font-semibold font-sans text-sm mb-2 ${ok ? 'text-accent-green' : 'text-accent-red'}`}>
        {ok ? '✓ Correct' : '✗ Incorrect'}
      </p>
      {feedback.explanation && (
        <p className="text-warm-300 font-sans text-sm leading-relaxed">{feedback.explanation}</p>
      )}
      {!ok && feedback.modelAnswer && (
        <p className="text-secondary font-sans text-sm mt-3">
          <span className="text-warm-500">Model answer: </span>
          <span className="text-warm-200 italic">{feedback.modelAnswer}</span>
        </p>
      )}
      {extra}
      <button
        onClick={onContinue}
        className="mt-4 px-6 py-2.5 bg-tertiary text-warm-200 rounded-xl text-sm font-semibold font-sans hover:bg-warm-700"
      >
        Continue →
      </button>
    </div>
  )
}

// ── Main PracticeCard ─────────────────────────────────────────────────────────

export default function PracticeCard({ question, onComplete }) {
  const { type } = question

  const [userAnswer, setUserAnswer]   = useState('')
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [feedback, setFeedback]       = useState(null)
  const [checking, setChecking]       = useState(false)

  const submitted = feedback !== null

  const inputCls = 'w-full bg-secondary border border-warm-700 rounded-xl px-4 py-3 text-primary font-sans text-base focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:border-accent-gold/60 placeholder-warm-600'

  async function checkWithClaude(answer) {
    setChecking(true)
    const correctAnswer = question.correctAnswer ?? question.modelAnswer ?? ''
    try {
      const result = await api.checkAnswer({ question, userAnswer: answer, correctAnswer, mode: type })
      setFeedback(result)
    } catch (err) {
      setFeedback({ correct: false, explanation: `Could not check answer: ${err.message}` })
    } finally {
      setChecking(false)
    }
  }

  function wordForSummary() {
    return question.word || question.targetWord || question.front || question.keyWords?.[0] || ''
  }

  // ── Flashcard ────────────────────────────────────────────────────────

  if (type === 'flashcard') {
    return <FlashCard question={question} onComplete={onComplete} />
  }

  // ── Quiz ─────────────────────────────────────────────────────────────

  if (type === 'quiz') {
    function handleOption(idx) {
      if (submitted) return
      setSelectedIdx(idx)
      const correct = idx === question.correctIndex
      setFeedback({
        correct,
        explanation: correct
          ? 'Well done!'
          : `The correct answer was "${question.options[question.correctIndex]}".`,
      })
    }

    return (
      <div>
        <p className="font-display text-2xl text-primary leading-snug mb-8">
          {question.prompt}
        </p>

        <div className="grid gap-3">
          {question.options.map((opt, idx) => {
            let cls = 'w-full text-left px-5 py-3.5 rounded-xl border font-sans text-sm '
            if (!submitted) {
              cls += 'bg-secondary border-warm-700 text-primary hover:border-accent-gold/50 hover:bg-tertiary cursor-pointer'
            } else if (idx === question.correctIndex) {
              cls += 'bg-accent-green/10 border-accent-green/50 text-accent-green cursor-default'
            } else if (idx === selectedIdx) {
              cls += 'bg-accent-red/10 border-accent-red/50 text-accent-red cursor-default'
            } else {
              cls += 'bg-secondary/40 border-warm-800 text-warm-600 cursor-default'
            }

            return (
              <button key={idx} className={cls} onClick={() => handleOption(idx)} disabled={submitted}>
                <span className="text-secondary mr-3 font-mono text-xs">
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {submitted && (
          <div
            className={`mt-6 rounded-xl p-4 border ${
              feedback.correct ? 'bg-accent-green/10 border-accent-green/30' : 'bg-accent-red/10 border-accent-red/30'
            }`}
          >
            <p className={`font-semibold font-sans text-sm mb-3 ${feedback.correct ? 'text-accent-green' : 'text-accent-red'}`}>
              {feedback.correct ? '✓ Correct' : '✗ Incorrect'} — {feedback.explanation}
            </p>
            <button
              onClick={() => onComplete({ correct: feedback.correct, word: wordForSummary() })}
              className="px-6 py-2.5 bg-tertiary text-warm-200 rounded-xl text-sm font-semibold font-sans hover:bg-warm-700"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Fill-blank, Case-drill, Translation ──────────────────────────────

  function handleCheck() {
    if (!userAnswer.trim() || checking || submitted) return
    checkWithClaude(userAnswer.trim())
  }

  const isTextarea = type === 'translation'

  return (
    <div>
      {type === 'fill-blank' && (
        <div>
          <p className="text-secondary font-sans text-xs mb-5 uppercase tracking-wider">
            Fill in the blank
          </p>
          <p className="font-display text-2xl text-primary leading-relaxed mb-3">
            {question.sentence}
          </p>
          {question.hint && (
            <p className="text-secondary font-sans text-sm italic mb-6">{question.hint}</p>
          )}
          {question.englishTranslation && (
            <p className="text-warm-600 font-sans text-xs mb-6">
              EN: {question.englishTranslation}
            </p>
          )}
        </div>
      )}

      {type === 'case-drill' && (
        <div>
          <p className="text-secondary font-sans text-xs mb-5 uppercase tracking-wider">
            Case Drill
            {question.targetCase && (
              <span className="ml-2 px-2 py-0.5 bg-tertiary text-secondary rounded text-xs normal-case tracking-normal">
                {question.targetCase}
              </span>
            )}
          </p>
          <p className="font-display text-2xl text-primary leading-relaxed mb-6">
            {question.prompt}
          </p>
        </div>
      )}

      {type === 'translation' && (
        <div>
          <p className="text-secondary font-sans text-xs mb-5 uppercase tracking-wider">
            Translate to German
          </p>
          <p className="font-display text-3xl text-primary leading-relaxed mb-3">
            {question.englishPrompt}
          </p>
          {question.hint && (
            <p className="text-secondary font-sans text-sm italic mb-6">{question.hint}</p>
          )}
        </div>
      )}

      {!submitted && (
        <div>
          {isTextarea ? (
            <textarea
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Auf Deutsch…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          ) : (
            <input
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder={type === 'fill-blank' ? 'Type the missing word…' : 'Enter the correct form…'}
              className={inputCls}
            />
          )}

          <button
            onClick={handleCheck}
            disabled={checking || !userAnswer.trim()}
            className="mt-3 px-6 py-2.5 bg-accent-gold text-primary font-semibold rounded-xl text-sm font-sans hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking…' : 'Check Answer'}
          </button>
        </div>
      )}

      {submitted && (
        <Feedback
          feedback={feedback}
          onContinue={() => onComplete({ correct: feedback.correct, word: wordForSummary() })}
          extra={
            type === 'case-drill' && question.rule ? (
              <p className="text-secondary font-sans text-xs mt-3 p-3 bg-tertiary/60 rounded-lg leading-relaxed">
                Rule: {question.rule}
              </p>
            ) : null
          }
        />
      )}
    </div>
  )
}
