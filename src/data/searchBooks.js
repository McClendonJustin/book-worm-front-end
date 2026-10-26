import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient.js'

export const MAX_RESULTS = 20
export const MAX_QUERY = 100
// The Edge Function rejects startIndex above this, so Load More must stop here.
export const MAX_START_INDEX = 200
const MAX_IDS_PER_CALL = 40
// The function retries Google for up to ~28s; leave a little headroom.
const CLIENT_TIMEOUT_MS = 40_000

const MESSAGES = {
  bad_request: 'That request was not valid. Try a shorter title.',
  not_found: 'That book could not be found.',
  rate_limited: 'The book service is busy right now. Wait a moment, then try again.',
  upstream_unavailable: 'The book service is not responding right now. Try again in a moment.',
  not_configured: 'The book service is not set up yet.',
}

function bookError(code, fallback) {
  const err = new Error(MESSAGES[code] ?? fallback ?? 'Something went wrong loading books.')
  err.code = code
  return err
}

// One call to the google-books Edge Function. Throws an Error with `.code`
// (bad_request | not_found | rate_limited | upstream_unavailable |
// not_configured | network) and a friendly message.
async function callOnce(body) {
  const { data, error } = await supabase.functions.invoke('google-books', {
    body,
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  })
  if (!error) return data
  if (error instanceof FunctionsHttpError) {
    let payload = null
    try {
      payload = await error.context.json()
    } catch {
      /* body was not JSON */
    }
    const code = payload?.code ?? (error.context.status === 404 ? 'not_found' : 'upstream_unavailable')
    throw bookError(code)
  }
  throw bookError('network', 'Could not reach the book service. Check your connection, then try again.')
}

const RETRYABLE = new Set(['upstream_unavailable', 'network'])

// Retries once automatically on a transient failure; never on bad_request,
// not_found or rate_limited.
async function callFunction(body) {
  try {
    return await callOnce(body)
  } catch (err) {
    if (!RETRYABLE.has(err.code)) throw err
    return callOnce(body)
  }
}

const normalise = (b) => ({
  ...b,
  title: b.title?.trim() || 'Untitled',
  authors: b.authors ?? [],
})

// Library books by volume id, in the caller's order (newest added first).
// Resolves { items, totalItems, failed }; `failed` lists ids that could not be
// loaded right now. Only throws when nothing at all could be loaded.
async function fetchByIds(ids, query) {
  const unique = [...new Set(ids)]
  const chunks = []
  for (let i = 0; i < unique.length; i += MAX_IDS_PER_CALL) {
    chunks.push(unique.slice(i, i + MAX_IDS_PER_CALL))
  }
  const results = await Promise.allSettled(
    chunks.map((chunk) => callFunction({ action: 'ids', ids: chunk })),
  )
  if (results.every((r) => r.status === 'rejected')) throw results[0].reason

  const found = new Map()
  const failed = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failed.push(...chunks[i])
      return
    }
    for (const item of r.value.items ?? []) found.set(item.id, normalise(item))
    failed.push(...(r.value.failed ?? []))
  })

  let items = unique.filter((id) => found.has(id)).map((id) => found.get(id))
  const q = query.trim().toLowerCase()
  if (q) items = items.filter((b) => b.title.toLowerCase().includes(q))
  return { items, totalItems: items.length, failed }
}

// Seam for the book list: title-only search, optional genre (scoped to
// technology by the function), optional `ids` (My Library). Resolves
// { items, totalItems, failed? }; throws an Error with `.code` on failure.
export async function searchBooks({
  query = '',
  genre = '',
  startIndex = 0,
  maxResults = MAX_RESULTS,
  ids = null,
} = {}) {
  if (ids) {
    if (ids.length === 0) return { items: [], totalItems: 0, failed: [] }
    return fetchByIds(ids, query)
  }
  const body = { action: 'search', startIndex, maxResults }
  const q = query.trim()
  if (q) body.query = q
  if (genre) body.genre = genre
  const data = await callFunction(body)
  const items = (data.items ?? []).map(normalise)
  return { items, totalItems: data.totalItems ?? items.length, failed: [] }
}

// Resolves to the book, or null when the id is unknown; throws on failure.
export async function getBook(id) {
  try {
    const data = await callFunction({ action: 'get', id })
    return data.item ? normalise(data.item) : null
  } catch (err) {
    if (err.code === 'not_found') return null
    throw err
  }
}
