import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy front-end/.env.example to front-end/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

// Public URL + publishable (anon) key only. Row Level Security does the gating.
// The session persists across refresh (supabase-js keeps its own auth token in
// browser storage; no app data is stored there) and the access token auto-refreshes.
// The app never reads auth tokens from the URL.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

// Client used only to re-check a password. It never stores or refreshes a session
// and has its own storage key, so it can't disturb the main client's signed-in
// session. Created once so repeated checks don't spawn extra GoTrue clients.
let verifier
export const createVerifierClient = () =>
  (verifier ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'pw-verify' },
  }))
