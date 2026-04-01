import { useState } from 'react'
import { api } from '../services/api.js'

// ── Flashcard ─────────────────────────────────────────────────────────────────

function FlashCard({ question, onComplete }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="text-center">
      {/* Card face */}
      <div
        className={`rounded-2xl border border-stone-800 bg-stone-900 mb-8 overflow-hidden cursor-pointer select-none transition-colors ${!flipped ? 'hover:border-stone-700' : ''}`}
        style={{ minHeight: '200px' }}
        onClick={() => !flipped && setFlipped(true)}
      >
        {!flipped ? (
          <div className="flex flex-col items-center justify-center px-10 py-12">
            <p className="font-display text-5xl text-stone-100 mb-4">{question.front}</p>
            {question.partOfSpeech && (
              <p className="text-stone-500 font-sans text-sm">{question.partOfSpeech}</p>
            )}
            {question.level && (
              <span className="mt-4 px-2.5 py-0.5 bg-stone-800 text-stone-500 rounded text-xs font-sans">
                {question.level}
              </span>
            )}
            <p className="text-stone-700 font-sans text-xs mt-8 tracking-wider">tap to reveal</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-10 py-12">
            <p className="text-stone-500 font-sans text-xs mb-2 tracking-widest uppercase">Meaning</p>
            <p className="font-display text-3xl text-yellow-300 mb-2">{question.back}</p>
            {question.literalMeaning && question.literalMeaning !== question.back && (
              <p className="text-stone-500 font-sans text-sm">
                literal: <span className="italic">{question.literalMeaning}</span>
              </p>
            )}
            {question.caseExamples && (
              <p
                className="text-stone-500 font-sans text-xs mt-4 text-center max-w-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: question.caseExamples }}
              />
            )}
          </div>
        )}
      </div>

      {/* Self-report buttons — only after flip */}
      {flipped && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onComplete({ correct: false, word: question.front })}
            className="px-7 py-3 bg-red-900/30 border border-red-700/40 text-red-300 rounded-xl font-sans text-sm font-semibold hover:bg-red-900/50 transition-colors"
          >
            ✗ Missed it
          </button>
          <button
            onClick={() => onComplete({ correct: true, word: question.front })}
            className="px-7 py-3 bg-green-900/30 border border-green-700/40 text-green-300 rounded-xl font-sans text-sm font-semibold hover:bg-green-900/50 transition-colors"
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
        ok ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'
      }`}
    >
      <p className={`font-semibold font-sans text-sm mb-2 ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✓ Correct' : '✗ Incorrect'}
      </p>
      {feedback.explanation && (
        <p className="text-stone-300 font-sans text-sm leading-relaxed">{feedback.explanation}</p>
      )}
      {!ok && feedback.modelAnswer && (
        <p className="text-stone-400 font-sans text-sm mt-3">
          <span className="text-stone-500">Model answer: </span>
          <span className="text-stone-200 italic">{feedback.modelAnswer}</span>
        </p>
      )}
      {extra}
      <button
        onClick={onContinue}
        className="mt-4 px-6 py-2.5 bg-stone-700 text-stone-200 rounded-xl text-sm font-semibold font-sans hover:bg-stone-600 transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}

// ── Main PracticeCard ─────────────────────────────────────────────────────────

/**
 * Renders a single practice question for any mode.
 *
 * Props:
 *   question  – question object from /api/practice/generate
 *   onComplete(result) – called with { correct: bool, word: string }
 */
export default function PracticeCard({ question, onComplete }) {
  const { type } = question

  const [userAnswer, setUserAnswer] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [checking, setChecking] = useState(false)

  const submitted = feedback !== null

  // ── Helpers ─────────────────────────────────────────────────────────

  async function checkWithClaude(answer) {
    setChecking(true)
    const correctAnswer =
      question.correctAnswer ?? question.modelAnswer ?? ''
    try {
      const result = await api.checkAnswer({
        question,
        userAnswer: answer,
        correctAnswer,
        mode: type,
      })
      setFeedback(result)
    } catch (err) {
      setFeedback({ correct: false, explanation: `Could not check answer: ${err.message}` })
    } finally {
      setChecking(false)
    }
  }

  function wordForSummary() {
    return (
      question.word ||
      question.targetWord ||
      question.front ||
      question.keyWords?.[0] ||
      ''
    )
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
        <p className="font-display text-2xl text-stone-100 leading-snug mb-8">
          {question.prompt}
        </p>

        <div className="grid gap-3">
          {question.options.map((opt, idx) => {
            let cls =
              'w-full text-left px-5 py-3.5 rounded-xl border font-sans text-sm transition-all '
            if (!submitted) {
              cls +=
                'bg-stone-900 border-stone-700 text-stone-200 hover:border-yellow-500/50 hover:bg-stone-800 cursor-pointer'
            } else if (idx === question.correctIndex) {
              cls += 'bg-green-900/30 border-green-600/50 text-green-300 cursor-default'
            } else if (idx === selectedIdx) {
              cls += 'bg-red-900/30 border-red-600/50 text-red-300 cursor-default'
            } else {
              cls += 'bg-stone-900/40 border-stone-800 text-stone-600 cursor-default'
            }

            return (
              <button key={idx} className={cls} onClick={() => handleOption(idx)} disabled={submitted}>
                <span className="text-stone-500 mr-3 font-mono text-xs">
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
              feedback.correct ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'
            }`}
          >
            <p
              className={`font-semibold font-sans text-sm mb-3 ${
                feedback.correct ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {feedback.correct ? '✓ Correct' : '✗ Incorrect'} — {feedback.explanation}
            </p>
            <button
              onClick={() => onComplete({ correct: feedback.correct, word: wordForSummary() })}
              className="px-6 py-2.5 bg-stone-700 text-stone-200 rounded-xl text-sm font-semibold font-sans hover:bg-stone-600 transition-colors"
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
      {/* Question prompt */}
      {type === 'fill-blank' && (
        <div>
          <p className="text-stone-500 font-sans text-xs mb-5 uppercase tracking-wider">
            Fill in the blank
          </p>
          <p className="font-display text-2xl text-stone-100 leading-relaxed mb-3">
            {question.sentence}
          </p>
          {question.hint && (
            <p className="text-stone-500 font-sans text-sm italic mb-6">{question.hint}</p>
          )}
          {question.englishTranslation && (
            <p className="text-stone-600 font-sans text-xs mb-6">
              EN: {question.englishTranslation}
            </p>
          )}
        </div>
      )}

      {type === 'case-drill' && (
        <div>
          <p className="text-stone-500 font-sans text-xs mb-5 uppercase tracking-wider">
            Case Drill
            {question.targetCase && (
              <span className="ml-2 px-2 py-0.5 bg-stone-800 text-stone-400 rounded text-xs normal-case tracking-normal">
                {question.targetCase}
              </span>
            )}
          </p>
          <p className="font-display text-2xl text-stone-100 leading-relaxed mb-6">
            {question.prompt}
          </p>
        </div>
      )}

      {type === 'translation' && (
        <div>
          <p className="text-stone-500 font-sans text-xs mb-5 uppercase tracking-wider">
            Translate to German
          </p>
          <p className="font-display text-3xl text-stone-100 leading-relaxed mb-3">
            {question.englishPrompt}
          </p>
          {question.hint && (
            <p className="text-stone-500 font-sans text-sm italic mb-6">{question.hint}</p>
          )}
        </div>
      )}

      {/* Answer input */}
      {!submitted && (
        <div>
          {isTextarea ? (
            <textarea
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Auf Deutsch…"
              rows={3}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 font-sans text-base resize-none focus:outline-none focus:border-yellow-500/60 placeholder-stone-600"
            />
          ) : (
            <input
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder={
                type === 'fill-blank' ? 'Type the missing word…' : 'Enter the correct form…'
              }
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 font-sans text-base focus:outline-none focus:border-yellow-500/60 placeholder-stone-600"
            />
          )}

          <button
            onClick={handleCheck}
            disabled={checking || !userAnswer.trim()}
            className="mt-3 px-6 py-2.5 bg-yellow-400 text-stone-950 font-semibold rounded-xl text-sm font-sans hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {checking ? 'Checking…' : 'Check Answer'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {submitted && (
        <Feedback
          feedback={feedback}
          onContinue={() => onComplete({ correct: feedback.correct, word: wordForSummary() })}
          extra={
            type === 'case-drill' && question.rule ? (
              <p className="text-stone-400 font-sans text-xs mt-3 p-3 bg-stone-800/60 rounded-lg leading-relaxed">
                Rule: {question.rule}
              </p>
            ) : null
          }
        />
      )}
    </div>
  )
}
