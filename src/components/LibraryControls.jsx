import { useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { useLibrary } from '../context/useLibrary.js'
import { useToast } from '../context/useToast.js'
import { READING_STATES } from '../data/libraryRules.js'
import Modal from './Modal.jsx'
import LogModal from './LogModal.jsx'

const LABELS = {
  'want to read': 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
}

// Signed-in controls on Details: reading status and add/remove from library.
// Also the Write/Edit Log button and its modal. Renders nothing for public users.
export default function LibraryControls({ book }) {
  const { currentUser } = useAuth()
  const { myLibrary, hasLog, getMyLog, addToLibrary, removeFromLibrary, setReadingState } = useLibrary()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  if (!currentUser) return null

  const entry = myLibrary.find((i) => i.bookId === book.id)
  const inLibrary = Boolean(entry)
  const myLog = getMyLog(book.id)

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const onAdd = () =>
    run(async () => {
      const res = await addToLibrary(book.id)
      showToast(res.ok ? 'Added to your library' : res.error)
    })

  const doRemove = () =>
    run(async () => {
      const res = await removeFromLibrary(book.id)
      showToast(
        !res.ok
          ? res.error
          : res.deletedLogs
            ? 'Removed from your library and deleted your log'
            : 'Removed from your library',
      )
    })

  const onRemoveClick = () => {
    if (hasLog(book.id)) setConfirming(true)
    else doRemove()
  }

  const onStatus = (e) => {
    const value = e.target.value || null
    // Not in the library and nothing chosen: nothing to do.
    if (!inLibrary && !value) return
    run(async () => {
      const res = inLibrary
        ? await setReadingState(book.id, value)
        : await addToLibrary(book.id, value)
      showToast(
        !res.ok
          ? res.error
          : !inLibrary
            ? `Added to your library as ${LABELS[value]}`
            : value
              ? `Status set to ${LABELS[value]}`
              : 'Status cleared',
      )
    })
  }

  return (
    <section className="library-controls" aria-label="Your library">
      <div className="field">
        <label htmlFor="reading-status">Reading status</label>
        <select
          id="reading-status"
          className="control control--cta"
          value={entry?.readingState ?? ''}
          onChange={onStatus}
          disabled={busy}
        >
          <option value="">Not set</option>
          {READING_STATES.map((s) => (
            <option key={s} value={s}>
              {LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {inLibrary ? (
        <button
          type="button"
          className="btn btn--delete library-controls__action"
          onClick={onRemoveClick}
          disabled={busy}
        >
          Remove from Library
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--create library-controls__action"
          onClick={onAdd}
          disabled={busy}
        >
          Add to Library
        </button>
      )}

      {/* One button element for both modes so focus survives the label swap. */}
      <button
        type="button"
        className={`btn library-controls__action ${myLog ? 'btn--cta' : 'btn--create'}`}
        aria-disabled={inLibrary ? undefined : 'true'}
        aria-describedby={inLibrary ? undefined : 'log-hint'}
        onClick={() => inLibrary && setLogOpen(true)}
        disabled={busy}
      >
        {myLog ? 'Edit Log' : '+ Write Log'}
      </button>
      {!inLibrary && (
        <p id="log-hint" className="field__hint">
          Add this book to your library to write a log
        </p>
      )}

      {logOpen && <LogModal book={book} log={myLog} onClose={() => setLogOpen(false)} />}

      {confirming && (
        <Modal title="Remove from library?" onClose={() => setConfirming(false)}>
          <p>
            You have a log for <strong>{book.title}</strong>. Removing the book from your
            library will also delete that log. This cannot be undone.
          </p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--delete"
              onClick={() => {
                setConfirming(false)
                doRemove()
              }}
            >
              Remove and delete log
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              data-autofocus
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
