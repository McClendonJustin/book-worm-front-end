import { useLogs } from '../hooks/useLogs.js'
import Rating from './Rating.jsx'

const fmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

// solo: shown on its own (the book failed to load), so no cover-column offset.
export default function LogList({ bookId, solo = false }) {
  const { items, total, status, loadingMore, hasMore, loadMore } = useLogs(bookId)

  return (
    <section className={`logs${solo ? ' logs--solo' : ''}`} aria-labelledby="logs-heading">
      <h2 id="logs-heading" className="logs__heading">
        Logs
      </h2>
      {status === 'loading' && <p className="muted logs__note" role="status">Loading logs</p>}
      {status === 'error' && (
        <p className="muted logs__note" role="alert">Logs could not be loaded. Refresh to try again.</p>
      )}
      {status === 'ready' && total === 0 && (
        <div className="empty empty--tight">
          <p className="empty__title">No logs yet</p>
          <p className="muted">Readers who add this book to their library can log it here.</p>
        </div>
      )}
      {items.length > 0 && (
        <ul className="log-list">
          {items.map((log) => (
            <li key={log.id} className="log">
              <div className="log__head">
                <p className="log__author">{log.author}</p>
                <time className="log__date" dateTime={log.createdAt}>
                  {fmt.format(new Date(log.createdAt))}
                </time>
              </div>
              <Rating value={log.rating} />
              <p className="log__body">{log.body}</p>
            </li>
          ))}
        </ul>
      )}
      {status === 'ready' && hasMore && (
        <button
          type="button"
          className="btn btn--create logs__more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading' : 'Load More'}
        </button>
      )}
      {status === 'ready' && total > 0 && (
        <p className="visually-hidden" role="status" aria-live="polite">
          Showing {items.length} of {total} logs
        </p>
      )}
    </section>
  )
}
