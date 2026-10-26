import { supabase } from '../lib/supabaseClient.js'

export const LOGS_PAGE_SIZE = 3

// One page of public logs for a book, newest first. Logs are readable by
// everyone (signed out included); authors are exposed by display name only,
// through the embedded profiles row, never by email. Resolves to
// { items, totalItems }; rejects on any request error.
export async function fetchLogs({ bookId, startIndex = 0, maxResults = LOGS_PAGE_SIZE }) {
  const { data, error, count } = await supabase
    .from('logs')
    .select('body, rating, created_at, user_id, profiles(display_name)', { count: 'exact' })
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .order('user_id')
    .range(startIndex, startIndex + maxResults - 1)
  if (error) throw error
  const items = data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: `${row.user_id}:${bookId}`,
      body: row.body,
      rating: row.rating ?? null,
      createdAt: row.created_at,
      author: profile?.display_name || 'Reader',
    }
  })
  return { items, totalItems: count ?? items.length }
}
