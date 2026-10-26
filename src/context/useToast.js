import { useContext } from 'react'
import { ToastContext } from './ToastContext.js'

// Returns showToast(message). Reused by later sub-phases for action feedback.
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
