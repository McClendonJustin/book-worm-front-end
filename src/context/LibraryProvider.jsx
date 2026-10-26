import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LibraryContext } from './LibraryContext.js'
import { useAuth } from './useAuth.js'
import { supabase } from '../lib/supabaseClient.js'
import { READING_STATES } from '../data/libraryRules.js'
import { MAX_LOG_BODY } from '../data/logRules.js'

// Libraries and logs for the signed-in user, behind one async `{ ok, ... }`
// surface, backed by the library_items / logs tables (RLS scopes every call to
// the user). Signed out: no library, every write is refused.
// Rule mirrored from the database: a log may exist only for a book in its
// author's library, so removing a library item deletes that user's log.

const EMPTY = { libraryItems: [], logs: [] }
const NETWORK_ERROR = 'Could not reach the server, try again'
const GENERIC_ERROR = 'Something went wrong, try again'

const fromLibraryRow = (r) => ({
  userId: r.user_id,
  bookId: r.book_id,
  readingState: r.reading_state ?? null,
  addedOn: r.added_on,
})
const fromLogRow = (r) => ({
  userId: r.user_id,
  bookId: r.book_id,
  body: r.body,
  rating: r.rating ?? null,
  createdAt: r.created_at,
})

// Database/network failure -> a user-facing result. Never throws, never logs.
function serverFail(error, overrides = {}) {
  const text = `${error?.message ?? ''}`.toLowerCase()
  const network = !error?.code && /fetch|network|failed|timeout|abort/.test(text)
  return {
    ok: false,
    server: true,
    error: overrides[error?.code] ?? (network ? NETWORK_ERROR : GENERIC_ERROR),
  }
}

export default function LibraryProvider({ children }) {
  const { currentUser } = useAuth()
  const userId = currentUser?.id ?? null

  // The signed-in user's own rows. `status` is loading | ready | error.
  const initialRemote = { userId: null, status: 'loading', ...EMPTY }
  const remoteRef = useRef(initialRemote)
  const [remote, setRemote] = useState(initialRemote)
  const commitRemote = (next) => {
    remoteRef.current = next
    setRemote(next)
  }

  // Bumped after any change to a stored log so the public Logs list refetches.
  const [logsVersion, setLogsVersion] = useState(0)
  const bump = () => setLogsVersion((n) => n + 1)

  // ---- loading a signed-in user's library and own logs ----------------------
  const wantedRef = useRef(null)
  const loadRemote = useCallback(async (forUserId) => {
    wantedRef.current = forUserId
    let next
    try {
      const [lib, logRes] = await Promise.all([
        supabase
          .from('library_items')
          .select('user_id, book_id, reading_state, added_on')
          .eq('user_id', forUserId)
          .order('added_on', { ascending: false })
          .order('book_id'),
        supabase
          .from('logs')
          .select('user_id, book_id, body, rating, created_at')
          .eq('user_id', forUserId),
      ])
      if (lib.error || logRes.error) throw lib.error ?? logRes.error
      next = {
        userId: forUserId,
        status: 'ready',
        libraryItems: lib.data.map(fromLibraryRow),
        logs: logRes.data.map(fromLogRow),
      }
    } catch {
      next = { userId: forUserId, status: 'error', ...EMPTY }
    }
    // Ignore the result if the user changed while the request was in flight.
    if (wantedRef.current === forUserId) commitRemote(next)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadRemote(userId)
    // Cleanup runs on sign-out or user switch: drop that user's data at once.
    return () => {
      wantedRef.current = null
      commitRemote({ userId: null, status: 'loading', ...EMPTY })
    }
  }, [userId, loadRemote])

  const reloadLibrary = useCallback(() => {
    if (!userId) return
    commitRemote({ userId, status: 'loading', ...EMPTY })
    loadRemote(userId)
  }, [userId, loadRemote])

  // ---- what the signed-in user sees ------------------------------------------
  const remoteMine = userId && remote.userId === userId ? remote : null
  const { libraryItems, logs } = remoteMine ?? EMPTY
  const libraryLoading = Boolean(userId) && (!remoteMine || remoteMine.status === 'loading')
  const libraryError = remoteMine?.status === 'error'

  // ---- shared validation ------------------------------------------------------
  const badState = (s) => s !== null && !READING_STATES.includes(s)

  // Run a write only while the same signed-in user is still signed in.
  const remoteStillMine = useCallback(
    () => remoteRef.current.userId === userId && remoteRef.current.status === 'ready',
    [userId],
  )

  // ---- writes -------------------------------------------------------------------
  const addToLibrary = useCallback(
    async (bookId, readingState = null) => {
      if (!userId) return { ok: false, error: 'Sign in first' }
      if (badState(readingState)) return { ok: false, error: 'Unknown reading status' }

      if (!remoteStillMine()) return { ok: false, error: 'Your library is still loading' }
      if (remoteRef.current.libraryItems.some((i) => i.bookId === bookId)) {
        return { ok: true, alreadyAdded: true }
      }
      try {
        const { data, error } = await supabase
          .from('library_items')
          .insert({ user_id: userId, book_id: bookId, reading_state: readingState })
          .select('user_id, book_id, reading_state, added_on')
          .single()
        if (error) return serverFail(error)
        if (!remoteStillMine()) return { ok: true }
        const item = fromLibraryRow(data)
        const cur = remoteRef.current
        commitRemote({ ...cur, libraryItems: [item, ...cur.libraryItems] })
        return { ok: true, item }
      } catch (e) {
        return serverFail(e)
      }
    },
    [userId, remoteStillMine],
  )

  const removeFromLibrary = useCallback(
    async (bookId) => {
      if (!userId) return { ok: false, error: 'Sign in first' }

      if (!remoteStillMine()) return { ok: false, error: 'Your library is still loading' }
      const deletedLogs = remoteRef.current.logs.some((l) => l.bookId === bookId)
      try {
        // The database cascades the delete to this user's log for the book.
        const { error } = await supabase
          .from('library_items')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', bookId)
        if (error) return serverFail(error)
        if (!remoteStillMine()) return { ok: true, deletedLogs }
        const cur = remoteRef.current
        commitRemote({
          ...cur,
          libraryItems: cur.libraryItems.filter((i) => i.bookId !== bookId),
          logs: cur.logs.filter((l) => l.bookId !== bookId),
        })
        if (deletedLogs) bump()
        return { ok: true, deletedLogs }
      } catch (e) {
        return serverFail(e)
      }
    },
    [userId, remoteStillMine],
  )

  const setReadingState = useCallback(
    async (bookId, readingState) => {
      if (!userId) return { ok: false, error: 'Sign in first' }
      if (badState(readingState)) return { ok: false, error: 'Unknown reading status' }

      if (!remoteStillMine()) return { ok: false, error: 'Your library is still loading' }
      if (!remoteRef.current.libraryItems.some((i) => i.bookId === bookId)) {
        return { ok: false, error: 'Add this book to your library first' }
      }
      try {
        const { data, error } = await supabase
          .from('library_items')
          .update({ reading_state: readingState })
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .select('book_id')
        if (error) return serverFail(error)
        if (!data?.length) return { ok: false, server: true, error: GENERIC_ERROR }
        if (!remoteStillMine()) return { ok: true }
        const cur = remoteRef.current
        commitRemote({
          ...cur,
          libraryItems: cur.libraryItems.map((i) =>
            i.bookId === bookId ? { ...i, readingState } : i,
          ),
        })
        return { ok: true }
      } catch (e) {
        return serverFail(e)
      }
    },
    [userId, remoteStillMine],
  )

  // One log per (user, book), body required, rating optional (1-5). The book
  // must already be in the author's library. Editing keeps createdAt.
  const saveLog = useCallback(
    async (bookId, { body, rating = null }) => {
      if (!userId) return { ok: false, error: 'Sign in first' }
      const text = (body ?? '').trim()
      if (!text) return { ok: false, error: 'Write something about this book' }
      if (text.length > MAX_LOG_BODY) {
        return { ok: false, error: `Keep your log under ${MAX_LOG_BODY} characters` }
      }
      if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
        return { ok: false, error: 'Rating must be 1 to 5' }
      }

      if (!remoteStillMine()) return { ok: false, error: 'Your library is still loading' }
      const existing = remoteRef.current.logs.find((l) => l.bookId === bookId)
      try {
        let row
        if (existing) {
          const { data, error } = await supabase
            .from('logs')
            .update({ body: text, rating })
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .select('user_id, book_id, body, rating, created_at')
          if (error) return serverFail(error)
          if (!data?.length) return { ok: false, server: true, error: GENERIC_ERROR }
          row = data[0]
        } else {
          const { data, error } = await supabase
            .from('logs')
            .insert({ user_id: userId, book_id: bookId, body: text, rating })
            .select('user_id, book_id, body, rating, created_at')
            .single()
          // 23503: foreign key violation, the book is not in this user's library.
          if (error) {
            return serverFail(error, { 23503: 'Add this book to your library first' })
          }
          row = data
        }
        const saved = fromLogRow(row)
        if (remoteStillMine()) {
          const cur = remoteRef.current
          commitRemote({
            ...cur,
            logs: existing
              ? cur.logs.map((l) => (l.bookId === bookId ? saved : l))
              : [...cur.logs, saved],
          })
          bump()
        }
        return { ok: true, created: !existing }
      } catch (e) {
        return serverFail(e)
      }
    },
    [userId, remoteStillMine],
  )

  const deleteLog = useCallback(
    async (bookId) => {
      if (!userId) return { ok: false, error: 'Sign in first' }

      if (!remoteStillMine()) return { ok: false, error: 'Your library is still loading' }
      if (!remoteRef.current.logs.some((l) => l.bookId === bookId)) {
        return { ok: false, error: 'No log to delete' }
      }
      try {
        const { error } = await supabase
          .from('logs')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', bookId)
        if (error) return serverFail(error)
        if (remoteStillMine()) {
          const cur = remoteRef.current
          commitRemote({ ...cur, logs: cur.logs.filter((l) => l.bookId !== bookId) })
          bump()
        }
        return { ok: true }
      } catch (e) {
        return serverFail(e)
      }
    },
    [userId, remoteStillMine],
  )

  // ---- derived, render-time helpers for the signed-in user ----------------------
  const myLibrary = libraryItems
  const hasLog = useCallback((bookId) => logs.some((l) => l.bookId === bookId), [logs])
  const getMyLog = useCallback(
    (bookId) => logs.find((l) => l.bookId === bookId) ?? null,
    [logs],
  )

  const value = useMemo(
    () => ({
      myLibrary,
      libraryLoading,
      libraryError,
      reloadLibrary,
      logsVersion,
      hasLog,
      getMyLog,
      saveLog,
      deleteLog,
      addToLibrary,
      removeFromLibrary,
      setReadingState,
    }),
    [
      myLibrary,
      libraryLoading,
      libraryError,
      reloadLibrary,
      logsVersion,
      hasLog,
      getMyLog,
      saveLog,
      deleteLog,
      addToLibrary,
      removeFromLibrary,
      setReadingState,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
