import { useMemo, useState } from 'react'
import { GENRES } from '../data/index.js'
import { MAX_QUERY, searchBooks } from '../data/searchBooks.js'
import { useAuth } from '../context/useAuth.js'
import { useLibrary } from '../context/useLibrary.js'
import { useBookBrowser } from '../hooks/useBookBrowser.js'
import { useSlowNote } from '../hooks/useSlowNote.js'
import BookCard from '../components/BookCard.jsx'

// Home is keyed by sign-in state, so signing out (or in) remounts it as a clean,
// blank page: no My Library, empty search, All genres. It also waits for the
// saved session to be restored, so a refresh doesn't fetch the book list twice.
export default function Home() {
  const { currentUser, authLoading } = useAuth()
  if (authLoading) return null
  return <HomeView key={currentUser ? 'in' : 'out'} />
}

function HomeView() {
  const { currentUser } = useAuth()
  const { myLibrary, libraryLoading, libraryError, reloadLibrary } = useLibrary()
  // My Library is in-page state, not part of the URL: it resets when Home
  // unmounts (so Back from a book lands on a blank Home) and on sign-out.
  // The toggle only exists while signed in.
  const signedIn = Boolean(currentUser)
  const [inLibrary, setInLibrary] = useState(false)
  const toggleLibrary = () => setInLibrary((on) => !on)

  // Library book ids, newest added first. The joined key keeps the search
  // reference stable until the library really changes.
  const idsKey = [...myLibrary]
    .sort((a, b) => b.addedOn.localeCompare(a.addedOn))
    .map((i) => i.bookId)
    .join('\n')
  const search = useMemo(() => {
    if (!inLibrary) return searchBooks
    const ids = idsKey ? idsKey.split('\n') : []
    // Genre is not known for library books, so only the title filter applies.
    return (params) => searchBooks({ ...params, genre: '', ids })
  }, [inLibrary, idsKey])

  const {
    draft,
    query,
    setDraft,
    submit,
    genre,
    setGenre,
    reset,
    items,
    total,
    firstNewIndex,
    failed,
    status,
    error,
    loadingMore,
    hasMore,
    loadMore,
    moreError,
    retry,
  } = useBookBrowser(search)

  const shown = inLibrary ? total : items.length
  const count = `${shown} ${shown === 1 ? 'book' : 'books'}${inLibrary ? ' in your library' : ' shown'}`
  const filtering = Boolean(query) || Boolean(genre)
  const emptyLibrary = inLibrary && !filtering && myLibrary.length === 0
  // While a signed-in user's library is still loading, the grid stays in its
  // skeleton state so My Library never flashes a false empty message.
  const waitingOnLibrary = inLibrary && libraryLoading
  const ready = status === 'ready' && !waitingOnLibrary
  const libraryFailed = inLibrary && libraryError
  const slow = useSlowNote(status === 'loading' && !waitingOnLibrary)
  const missing = inLibrary ? failed.length : 0
  const genreLabel = GENRES.find((g) => g.value === genre)?.label ?? ''
  const emptyCopy = (() => {
    if (inLibrary) {
      return {
        title: 'No books in your library match.',
        hint: 'Try a shorter title, or turn off My Library to search every book.',
      }
    }
    if (query && genre) {
      return {
        title: `Nothing matched \u201c${query}\u201d in ${genreLabel}.`,
        hint: 'Searches stay within technology books, so try a broader term or set Genre back to All.',
      }
    }
    if (genre) {
      return {
        title: `No ${genreLabel} books found right now.`,
        hint: 'The book service has nothing in this genre at the moment. Try another genre or check back soon.',
      }
    }
    return {
      title: `No technology books match \u201c${query}\u201d.`,
      hint: 'The book service has no results for this title right now. Try a shorter or different title.',
    }
  })()

  return (
    <div className="browse">
      <h1 className="visually-hidden">Browse books</h1>
      <form
        className={`filters${signedIn ? ' filters--library' : ''}`}
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="field">
          <label htmlFor="search">Search by title</label>
          <input
            id="search"
            type="search"
            className="control"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            maxLength={MAX_QUERY}
          />
        </div>
        <button type="submit" className="btn btn--cta filters__submit">
          Search
        </button>
        {signedIn && (
          <button
            type="button"
            className={`btn btn--create filters__library library-toggle${inLibrary ? ' is-active' : ''}`}
            aria-pressed={inLibrary}
            onClick={toggleLibrary}
          >
            My Library
          </button>
        )}
        <div className="field filters__genre">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            className="control"
            value={inLibrary ? '' : genre}
            disabled={inLibrary}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">All</option>
            {GENRES.filter((g) => g.value).map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {status !== 'error' && !libraryFailed && !(ready && total === 0) && (
      <p className="browse__count" role="status" aria-live="polite">
        {status === 'loading' || waitingOnLibrary
          ? slow
            ? 'Still searching. The book service is slow right now.'
            : 'Loading books'
          : total === 0
              ? inLibrary
                ? 'No books in your library'
                : 'No books found'
              : count}
      </p>
      )}

      {status === 'error' || libraryFailed ? (
        <div className="empty" role="alert">
          <p className="empty__title">
            {libraryFailed ? 'Your library could not be loaded.' : 'Books could not be loaded.'}
          </p>
          <p className="muted">
            {libraryFailed
              ? 'Check your connection, then try again.'
              : error?.message ?? 'Check your connection, then try again.'}
          </p>
          <button type="button" className="btn btn--cta" onClick={libraryFailed ? reloadLibrary : retry}>
            Try again
          </button>
        </div>
      ) : !ready ? (
        <ul className="book-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="book-card book-card--skeleton">
              <span className="book-card__cover" />
              <span className="book-card__title-skeleton" />
            </li>
          ))}
        </ul>
      ) : total === 0 && missing > 0 ? null : total === 0 ? (
        emptyLibrary ? (
          <div className="empty">
            <p className="empty__title">Your library is empty.</p>
            <p className="muted">
              Open any book and choose Add to Library to keep it here.
            </p>
            <button type="button" className="btn btn--cta" onClick={toggleLibrary}>
              Browse all books
            </button>
          </div>
        ) : (
          <div className="empty">
            <p className="empty__title">{emptyCopy.title}</p>
            <p className="muted">{emptyCopy.hint}</p>
            <button type="button" className="btn btn--cta" onClick={reset}>
              Clear search and genre
            </button>
          </div>
        )
      ) : (
        <ul className="book-grid">
          {items.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              isNew={i >= firstNewIndex && firstNewIndex > 0}
              order={i - firstNewIndex}
            />
          ))}
        </ul>
      )}

      {ready && missing > 0 && (
        <div className="notice" role="status">
          <p>
            {missing === 1
              ? '1 book in your library could not be loaded right now.'
              : `${missing} books in your library could not be loaded right now.`}
          </p>
          <button type="button" className="btn btn--cta" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {ready && moreError && (
        <div className="notice" role="alert">
          <p>{moreError.message}</p>
          <button type="button" className="btn btn--cta" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading' : 'Try again'}
          </button>
        </div>
      )}
      {ready && hasMore && !moreError && (
        <button
          type="button"
          className="btn btn--create browse__more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading' : 'Load More'}
        </button>
      )}
    </div>
  )
}
