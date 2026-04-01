import { useState, useCallback, useEffect } from 'react'

const CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']

const LS_KEY = 'german_keyboard_visible'

function loadVisible() {
  try { return localStorage.getItem(LS_KEY) !== 'false' } catch { return true }
}

function saveVisible(v) {
  try { localStorage.setItem(LS_KEY, v ? 'true' : 'false') } catch {}
}

/**
 * GermanKeyboard — on-screen bar for inserting German special characters.
 *
 * Renders clickable buttons for: ä ö ü ß Ä Ö Ü
 * Clicking a character inserts it at the cursor position in whichever
 * <input> or <textarea> was most recently focused (tracked via a global
 * `focusin` listener). The native value setter is used to trigger React's
 * synthetic onChange, so controlled components update correctly.
 *
 * Props:
 *   className {string} — additional CSS classes for the outer wrapper
 *
 * Visibility is toggled by a small button (shows "äöü ×" when visible,
 * "äöü" when hidden) and persisted to localStorage under "german_keyboard_visible".
 *
 * Usage: render <GermanKeyboard /> anywhere near a text input — no wiring needed.
 */
export default function GermanKeyboard({ className = '' }) {
  const [visible, setVisible] = useState(loadVisible)
  const [lastFocused, setLastFocused] = useState(null)

  // Track the most recently focused input/textarea
  useEffect(() => {
    function onFocus(e) {
      const el = e.target
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        setLastFocused(el)
      }
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  const insert = useCallback((char) => {
    const el = lastFocused
    if (!el) return

    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const before = el.value.slice(0, start)
    const after  = el.value.slice(end)
    const newVal = before + char + after

    // Native setter to trigger React's synthetic onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
      'value'
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, newVal)
    } else {
      el.value = newVal
    }

    el.dispatchEvent(new Event('input', { bubbles: true }))

    // Restore cursor position after the inserted char
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + char.length, start + char.length)
    })
  }, [lastFocused])

  function toggle() {
    setVisible(v => {
      const next = !v
      saveVisible(next)
      return next
    })
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {visible && (
        <div className="flex items-center gap-1 bg-secondary border border-warm-800 rounded-lg px-2 py-1">
          {CHARS.map(ch => (
            <button
              key={ch}
              type="button"
              onMouseDown={(e) => {
                // Prevent stealing focus from the input
                e.preventDefault()
                insert(ch)
              }}
              className="
                w-7 h-7 flex items-center justify-center
                bg-tertiary hover:bg-warm-700 hover:text-accent-gold
                rounded text-sm font-sans text-secondary
                transition-colors duration-100
                border border-transparent hover:border-accent-gold/30
              "
              title={`Insert ${ch}`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className="
          text-xs text-warm-700 hover:text-secondary
          bg-secondary border border-warm-800 rounded-lg px-2 py-1
          font-sans transition-colors duration-100 whitespace-nowrap
        "
        title={visible ? 'Hide German keyboard' : 'Show German keyboard'}
      >
        {visible ? 'äöü ×' : 'äöü'}
      </button>
    </div>
  )
}
