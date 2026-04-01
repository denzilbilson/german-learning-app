import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

const STYLES = {
  success: 'bg-emerald-950 border-emerald-700/60 text-emerald-100',
  error:   'bg-red-950 border-red-700/60 text-red-100',
  info:    'bg-stone-800 border-stone-700 text-stone-100',
  warning: 'bg-amber-950 border-amber-700/60 text-amber-100',
}

const ICON_STYLES = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-stone-400',
  warning: 'text-amber-400',
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl
            text-sm font-sans max-w-sm w-max pointer-events-auto cursor-pointer
            animate-slide-in
            ${STYLES[t.type] || STYLES.info}
          `}
        >
          <span className={`mt-0.5 shrink-0 font-bold ${ICON_STYLES[t.type] || ICON_STYLES.info}`}>
            {ICONS[t.type] || ICONS.info}
          </span>
          <span className="leading-relaxed">{t.message}</span>
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

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, message, type }]) // max 5 toasts
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  // Convenience methods
  toast.success = (msg, duration) => toast(msg, 'success', duration)
  toast.error   = (msg, duration) => toast(msg, 'error', duration)
  toast.info    = (msg, duration) => toast(msg, 'info', duration)
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
