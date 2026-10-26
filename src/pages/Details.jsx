import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSlowNote } from '../hooks/useSlowNote.js'
import { getBook } from '../data/searchBooks.js'
import LibraryControls from '../components/LibraryControls.jsx'
import LogList from '../components/LogList.jsx'

const MONTHS = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const FULL = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })

// Google Books dates come as YYYY, YYYY-MM or YYYY-MM-DD.
function formatPublished(value) {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length === 1) return value
  const d = new Date(`${value}${parts.length === 2 ? '-01' : ''}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return value
  return (parts.length === 2 ? MONTHS : FULL).format(d)
}

function Field({ label, value, missing }) {
  return (
    <div className="facts__item">
      <dt>{label}</dt>
      <dd className={value ? undefined : 'is-missing'}>{value || missing}</dd>
    </div>
  )
}

function Cover({ book }) {
  const [failed, setFailed] = useState(false)
  const show = book.thumbnail && !failed
  return (
    <div className="cover">
      {show ? (
        <img
          src={book.thumbnail}
          alt={`Cover of ${book.title}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="cover__placeholder" role="img" aria-label="Cover not provided">
          Cover not provided
        </span>
      )}
    </div>
  )
}

export default function Details() {
  const { id } = useParams()
  const [state, setState] = useState({ id: null, book: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    getBook(id)
      .then((book) => current && setState({ id, book, error: null }))
      .catch((err) => current && setState({ id, book: null, error: err }))
    return () => {
      current = false
    }
  }, [id, attempt])

  const loading = state.id !== id
  const slow = useSlowNote(loading)

  if (loading) {
    return (
      <div className="details-loading" role="status" aria-live="polite">
        <span className={slow ? 'details-loading__note' : 'visually-hidden'}>
          {slow ? 'Still loading. The book service is slow right now.' : 'Loading book'}
        </span>
        <div className="details-loading__cover" aria-hidden="true" />
        <span className="details-loading__line" aria-hidden="true" />
        <span className="details-loading__line" aria-hidden="true" />
      </div>
    )
  }

  if (state.error) {
    return (
      <>
      <section className="empty" role="alert">
        <h1 className="empty__title">This book could not be loaded.</h1>
        <p className="muted">{state.error.message ?? 'Check your connection, then try again.'}</p>
        <button
          type="button"
          className="btn btn--cta"
          onClick={() => {
            setState({ id: null, book: null, error: null })
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </button>
      </section>
      <div className="details">
        <LogList key={id} bookId={id} solo />
      </div>
      </>
    )
  }

  const { book } = state
  if (!book) {
    return (
      <section className="stack notfound">
        <h1 className="display">Book not found</h1>
        <p className="muted">
          No book matches this link. It may have been removed, or the address
          may be mistyped.
        </p>
        <Link to="/" className="btn btn--cta">
          Back to Home
        </Link>
      </section>
    )
  }

  const authors = book.authors?.length ? book.authors.join(', ') : null
  const pages = book.pageCount ? `${book.pageCount.toLocaleString('en-US')} pages` : null

  return (
    <article className="details">
      <div className="details__backdrop" aria-hidden="true">
        {book.thumbnail && <img src={book.thumbnail} alt="" />}
      </div>
      <header className="details__hero">
        <Cover book={book} />
        <div className="details__main">
          <h1 className="details__title">{book.title}</h1>
          {book.subtitle && <p className="details__subtitle">{book.subtitle}</p>}
          <p className={`details__authors${authors ? '' : ' is-missing'}`}>
            {authors ? `By ${authors}` : 'Author not provided'}
          </p>
          <dl className="facts">
            <Field label="Publisher" value={book.publisher} missing="Publisher not provided" />
            <Field
              label="Published"
              value={formatPublished(book.publishedDate)}
              missing="Published date not provided"
            />
            <Field label="Length" value={pages} missing="Page count not provided" />
          </dl>
          <section aria-labelledby="about-heading" className="about">
            <h2 id="about-heading" className="section-title">About this book</h2>
            <p className={book.description ? 'about__text' : 'about__text is-missing'}>
              {book.description || 'Description not provided'}
            </p>
          </section>
          <LibraryControls book={book} />
        </div>
      </header>
      <LogList key={book.id} bookId={book.id} />
    </article>
  )
}
