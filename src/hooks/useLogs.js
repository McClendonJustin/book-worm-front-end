import { useCallback, useEffect, useRef, useState } from 'react'
import { useLibrary } from '../context/useLibrary.js'
import { fetchLogs } from '../data/getLogs.js'

// Newest-first public logs for one book with append-style Load More. Reads come
// straight from the database for everyone. The list refetches from the first
// page whenever the library store reports a log change (`logsVersion`).
export function useLogs(bookId) {
  const { logsVersion } = useLibrary()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    const id = ++latest.current
    fetchLogs({ bookId, startIndex: 0 })
      .then((res) => {
        if (id !== latest.current) return
        setItems(res.items)
        setTotal(res.totalItems)
        setStatus('ready')
      })
      .catch(() => {
        if (id === latest.current) setStatus('error')
      })
  }, [bookId, logsVersion])

  const loadMore = useCallback(() => {
    const id = latest.current
    setLoadingMore(true)
    fetchLogs({ bookId, startIndex: items.length })
      .then((res) => {
        if (id !== latest.current) return
        setItems((prev) => [...prev, ...res.items])
        setTotal(res.totalItems)
      })
      .catch(() => {
        if (id === latest.current) setStatus('error')
      })
      .finally(() => setLoadingMore(false))
  }, [bookId, items.length])

  return {
    items,
    total,
    status,
    loadingMore,
    hasMore: items.length < total,
    loadMore,
  }
}
