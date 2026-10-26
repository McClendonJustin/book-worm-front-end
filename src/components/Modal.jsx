import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Accessible dialog: role=dialog + aria-modal, labelled by its title, focus
// moves in on open, Tab is trapped, Escape/backdrop close, focus returns to the
// trigger, body scroll is locked and the app root is made inert.
// Mount it only while open. Change `focusKey` to re-focus when the content
// swaps (e.g. Sign-In -> Sign-Up) without closing.
export default function Modal({ title, onClose, focusKey, children }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const root = document.getElementById('root')
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPad = body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    if (root) root.inert = true

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (!dialog.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPad
      if (root) root.inert = false
      // Return focus to the trigger; fall back to the nav auth button if the
      // original element is gone.
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus()
      } else {
        document.querySelector('[data-auth-trigger]')?.focus()
      }
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    const target =
      dialog.querySelector('[data-autofocus]') ||
      dialog.querySelector(FOCUSABLE)
    target?.focus()
  }, [focusKey])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__head">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
