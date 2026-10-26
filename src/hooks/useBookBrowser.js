import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_START_INDEX, searchBooks } from '../data/searchBooks.js'

// Submit-based search + genre + append-style "Load More" for any book list.
// `search` is an async ({ query, genre, startIndex }) => ({ items, totalItems, failed? })
// and must be a stable reference (module-level or memoized).
export function useBookBrowser(search = searchBooks) {
  const [draft, setDraft] = useState('') // text in the input, not yet applied
  const [query, setQuery] = useState('') // last submitted query
  const [genre, setGenreState] = useState('')
  const [items, setItems] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [nextStart, setNextStart] = useState(0) // raw results consumed so far
  const [failed, setFailed] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [firstNewIndex, setFirstNewIndex] = useState(0)
  const [moreError, setMoreError] = useState(null)
  const [attempt, setAttempt] = useState(0) // bumped by retry()
  const latest = useRef(0) // ignores responses from superseded requests

  // First page for the current query + genre. Replaces any appended results.
  useEffect(() => {
    const id = ++latest.current
    search({ query, genre, startIndex: 0 })
      .then((res) => {
        if (id !== latest.current) return
        setItems(res.items)
        setTotalItems(res.totalItems)
        setNextStart(res.items.length)
        setFailed(res.failed ?? [])
        setFirstNewIndex(0)
        setMoreError(null)
        setLoadingMore(false)
        setError(null)
        setStatus('ready')
      })
      .catch((err) => {
        if (id !== latest.current) return
        setError(err)
        setStatus('error')
      })
    return () => {
      // Supersede this request if the effect re-runs or the page unmounts.
      latest.current += 1
    }
  }, [search, query, genre, attempt])

  const retry = () => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }

  const submit = () => {
    setStatus('loading')
    setQuery(draft.trim())
  }
  const setGenre = (value) => {
    setStatus('loading')
    setGenreState(value)
  }
  const reset = () => {
    setStatus('loading')
    setDraft('')
    setQuery('')
    setGenreState('')
  }

  const loadMore = useCallback(() => {
    const id = latest.current
    const startIndex = nextStart
    setLoadingMore(true)
    setMoreError(null)
    search({ query, genre, startIndex })
      .then((res) => {
        if (id !== latest.current) return
        // Google paging can repeat items: keep the first copy of each id.
        const seen = new Set(items.map((b) => b.id))
        const fresh = res.items.filter((b) => !seen.has(b.id))
        setItems([...items, ...fresh])
        setTotalItems(res.items.length === 0 ? startIndex : res.totalItems)
        setNextStart(startIndex + res.items.length)
        setFirstNewIndex(items.length)
      })
      .catch((err) => {
        if (id === latest.current) setMoreError(err)
      })
      .finally(() => {
        if (id === latest.current) setLoadingMore(false)
      })
  }, [search, query, genre, items, nextStart])

  return {
    draft,
    query,
    setDraft,
    submit,
    genre,
    setGenre,
    reset,
    items,
    total: totalItems,
    failed,
    firstNewIndex,
    status,
    error,
    loadingMore,
    hasMore: nextStart < totalItems && nextStart <= MAX_START_INDEX && items.length > 0,
    loadMore,
    moreError,
    retry,
  }
}
