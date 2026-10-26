import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from './ToastContext.js'

const DURATION = 3500

// One polite live region that stays mounted; the message inside is swapped.
// Rendered in a portal on <body> so it stays visible above open modals.
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((message) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now() + Math.random(), message })
    timer.current = setTimeout(() => setToast(null), DURATION)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-region" role="status" aria-live="polite">
          {toast && (
            <p className="toast" key={toast.id}>
              {toast.message}
            </p>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
