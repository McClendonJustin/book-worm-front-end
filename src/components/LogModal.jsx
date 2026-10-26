import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { RatingInput } from './Rating.jsx'
import { useLibrary } from '../context/useLibrary.js'
import { useToast } from '../context/useToast.js'
import { MAX_LOG_BODY } from '../data/logRules.js'

// Write / Edit Log dialog. Mount only while open. `log` is the user's existing
// log (edit mode) or null (write mode).
export default function LogModal({ book, log, onClose }) {
  const { saveLog, deleteLog } = useLibrary()
  const { showToast } = useToast()
  const editing = Boolean(log)
  const [body, setBody] = useState(log?.body ?? '')
  const [rating, setRating] = useState(log?.rating ?? null)
  const [error, setError] = useState({ message: null, n: 0 })
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef(null)

  // Focus the invalid field on every failed attempt (n changes each time).
  useEffect(() => {
    if (error.message) bodyRef.current?.focus()
  }, [error])

  const trimmed = body.trim()
  const over = body.length > MAX_LOG_BODY
  const fail = (message) => setError((e) => ({ message, n: e.n + 1 }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!trimmed) return fail('Write something about this book')
    if (over) return fail(`Keep your log under ${MAX_LOG_BODY.toLocaleString('en-US')} characters`)
    setBusy(true)
    const res = await saveLog(book.id, { body, rating })
    setBusy(false)
    if (!res.ok) {
      if (res.server) showToast(res.error)
      return fail(res.error)
    }
    onClose()
    showToast(res.created ? 'Log saved' : 'Log updated')
  }

  const onDelete = async () => {
    setBusy(true)
    const res = await deleteLog(book.id)
    setBusy(false)
    if (!res.ok) {
      setConfirming(false)
      if (res.server) showToast(res.error)
      return fail(res.error)
    }
    onClose()
    showToast('Log deleted')
  }

  return (
    <Modal title={editing ? 'Edit log' : 'Write log'} onClose={onClose} focusKey={confirming}>
      {confirming ? (
        <div className="modal__form" role="group" aria-labelledby="delete-log-q">
          <p id="delete-log-q" className="confirm__q">Delete this log?</p>
          <p className="muted">This removes your log for {book.title}. It cannot be undone.</p>
          <div className="modal__actions">
            <button type="button" className="btn btn--delete" onClick={onDelete} disabled={busy}>
              Delete log
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              data-autofocus
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Keep log
            </button>
          </div>
        </div>
      ) : (
        <form className="modal__form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <span className="field__label" id="log-title-label">Title</span>
            <p className="log-book">
              {book.title}
            </p>
          </div>
          <RatingInput value={rating} onChange={setRating} />
          <div className="field">
            <label htmlFor="log-body">Body</label>
            <textarea
              id="log-body"
              ref={bodyRef}
              className="control control--area"
              rows={6}
              value={body}
              data-autofocus
              aria-required="true"
              aria-invalid={error.message ? 'true' : undefined}
              aria-describedby={`log-count${error.message ? ' log-err' : ''}`}
              onChange={(e) => {
                setBody(e.target.value)
                if (error.message) setError({ message: null, n: error.n })
              }}
            />
            <p id="log-count" className={`field__hint field__count${over ? ' is-over' : ''}`}>
              {body.length.toLocaleString('en-US')} / {MAX_LOG_BODY.toLocaleString('en-US')}
            </p>
            {error.message && (
              <p id="log-err" className="field__error" role="alert">
                {error.message}
              </p>
            )}
          </div>
          <div className="modal__actions">
            <button
              type="submit"
              className={`btn ${editing ? 'btn--cta' : 'btn--create'}`}
              disabled={busy}
            >
              Save
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn--delete"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}
