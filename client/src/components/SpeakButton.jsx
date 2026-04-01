import { useState, useCallback } from 'react'

function SpeakerIcon({ pulsing }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={pulsing ? 'animate-pulse' : ''}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

/**
 * SpeakButton — German pronunciation button using the Web Speech API.
 *
 * Renders a small speaker icon that speaks the provided text in German
 * when clicked. The icon pulses while speech is active; clicking again
 * cancels the current utterance.
 *
 * Props:
 *   text      {string}  — the German text to pronounce (required)
 *   rate      {number}  — speech rate multiplier (default: 0.85 — slightly slower for learners)
 *   className {string}  — additional CSS classes for the button element
 *
 * Behaviour:
 *   - Uses the first `de-DE` voice found in `speechSynthesis.getVoices()`
 *   - Falls back to the browser default if no German voice is installed
 *   - Returns null (renders nothing) if `text` is falsy
 *   - No-ops silently if `window.speechSynthesis` is not available
 */
export default function SpeakButton({ text, rate = 0.85, className = '' }) {
  const [speaking, setSpeaking] = useState(false)

  const speak = useCallback(() => {
    if (!text) return
    if (!window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang  = 'de-DE'
    utter.rate  = rate

    // Try to find a German voice
    const voices = window.speechSynthesis.getVoices()
    const germanVoice = voices.find(v => v.lang.startsWith('de'))
    if (germanVoice) utter.voice = germanVoice

    utter.onstart = () => setSpeaking(true)
    utter.onend   = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utter)
  }, [text, rate])

  if (!text) return null

  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak() }}
      title={`Speak: ${text}`}
      className={`
        inline-flex items-center justify-center
        w-6 h-6 rounded
        transition-colors duration-150
        ${speaking
          ? 'text-accent-gold'
          : 'text-secondary hover:text-accent-gold'
        }
        ${className}
      `}
      aria-label={`Pronounce "${text}"`}
    >
      <SpeakerIcon pulsing={speaking} />
    </button>
  )
}
