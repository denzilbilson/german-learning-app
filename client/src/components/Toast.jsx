/**
 * Toast notification system.
 *
 * Provides a React context + hook for triggering transient notifications.
 *
 * Exports:
 *   ToastProvider — wrap the app (or a subtree) with this to enable toasts
 *   useToast()    — returns the `toast` function from within any child component
 *
 * Usage:
 *   const toast = useToast()
 *   toast('Message')                    // info toast, 4 s
 *   toast.success('Saved!')             // green, 4 s
 *   toast.error('Something failed', 6000) // red, 6 s
 *   toast.warning('Check your input')   // gold
 *   toast.info('FYI…')                  // neutral
 *
 * Types: 'success' | 'error' | 'info' | 'warning'
 *
 * Behaviour:
 *   - Toasts appear bottom-right, z-100, stacked vertically
 *   - Max 5 visible at once (older toasts are removed to make room)
 *   - Auto-dismiss after `duration` ms (default 4000)
 *   - Click any toast to dismiss it immediately
 */
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

const STYLES = {
  success: 'bg-accent-green/10 border-accent-green/30 text-accent-green',
  error:   'bg-accent-red/10 border-accent-red/30 text-accent-red',
  info:    'bg-secondary border-warm-700 text-primary',
  warning: 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold',
}

const ICON_STYLES = {
  success: 'text-accent-green',
  error:   'text-accent-red',
  info:    'text-secondary',
  warning: 'text-accent-gold',
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl
            text-sm font-sans max-w-sm pointer-events-auto cursor-pointer
            animate-slide-in
            ${STYLES[t.type] || STYLES.info}
          `}
        >
          <span className={`mt-0.5 shrink-0 font-bold ${ICON_STYLES[t.type] || ICON_STYLES.info}`}>
            {ICONS[t.type] || ICONS.info}
          </span>
          <span className="leading-relaxed text-primary">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  toast.success = (msg, duration) => toast(msg, 'success', duration)
  toast.error   = (msg, duration) => toast(msg, 'error',   duration)
  toast.info    = (msg, duration) => toast(msg, 'info',    duration)
  toast.warning = (msg, duration) => toast(msg, 'warning', duration)

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
