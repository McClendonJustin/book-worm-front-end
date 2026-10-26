import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext.js'
import { supabase, createVerifierClient } from '../lib/supabaseClient.js'
import { MAX_DISPLAY_NAME, MIN_PASSWORD, escapeLike } from './authRules.js'

const GENERIC_ERROR = 'Email, display name or password is incorrect'
const RATE_LIMIT_ERROR = 'Too many attempts, try again later'
const UNREACHABLE_ERROR = 'Could not reach the server, try again'
const NAME_TAKEN = 'Display Name in use'
const NAME_NOT_ALLOWED = 'Display Name in use or not allowed'
const EMAIL_TAKEN = 'Email Address in use'
const PASSWORD_RULES = `Password must be at least ${MIN_PASSWORD} characters`
const SIGN_IN_TIMEOUT_MS = 10000
const WRONG_CURRENT = 'Current password is incorrect'
const SAME_PASSWORD = 'New password must be different from your current password'
const MAX_PW_ATTEMPTS = 5
const PW_LOCK_MS = 30000

// Real Supabase Auth. Sign-in goes through the `sign-in` Edge Function (email OR
// display name), then hands its session to supabase-js. Sign-up uses
// `supabase.auth.signUp`; the `on_auth_user_created` trigger creates the profile
// from `display_name` in the user metadata. The session persists across refresh.
// Methods are async and return `{ ok, ... }` results.
export default function AuthProvider({ children }) {
  // { id, displayName, email } for the signed-in user, else null.
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'signin' | 'signup' | 'profile'
  const userIdRef = useRef(null)
  const applyToken = useRef(0)
  const pwFails = useRef(0)
  const pwLockedUntil = useRef(0)
  const pwBusy = useRef(false)

  const commitUser = useCallback((user) => {
    userIdRef.current = user?.id ?? null
    setCurrentUser(user)
  }, [])

  // Mirror a Supabase session into `currentUser`, loading the public display
  // name from `profiles`. Stale results (a newer session arrived) are dropped.
  const applySession = useCallback(
    async (session) => {
      const token = ++applyToken.current
      if (!session?.user) {
        commitUser(null)
        return
      }
      const { id, email, user_metadata } = session.user
      let displayName = null
      try {
        const { data } = await supabase.from('profiles').select('display_name').eq('id', id).maybeSingle()
        displayName = data?.display_name ?? null
      } catch {
        // Fall back to the sign-up metadata below.
      }
      if (token !== applyToken.current) return
      commitUser({
        id,
        displayName: displayName ?? user_metadata?.display_name ?? (email ?? '').split('@')[0],
        email: email ?? '',
      })
    },
    [commitUser],
  )

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => commitUser(null))
      .finally(() => {
        if (active) setAuthLoading(false)
      })

    // The callback must not await Supabase calls itself (it can deadlock the
    // client), so the work is deferred to a fresh task.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      setTimeout(() => {
        if (!active) return
        if (event === 'SIGNED_IN' && session?.user?.id === userIdRef.current) return
        applySession(session)
      }, 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [applySession, commitUser])

  // Calls the Edge Function. Resolves to { status, data } where status is the
  // HTTP status, or 0 for a network failure/timeout. Credentials are only ever
  // sent in the request body and never logged or stored.
  const callSignIn = async (identifier, password) => {
    try {
      const { data, error } = await supabase.functions.invoke('sign-in', {
        body: { identifier, password },
        signal: AbortSignal.timeout(SIGN_IN_TIMEOUT_MS),
      })
      if (!error) return { status: 200, data }
      if (error instanceof FunctionsHttpError) return { status: error.context.status, data: null }
    } catch {
      // fall through
    }
    return { status: 0, data: null }
  }

  const signIn = async (identifier, password) => {
    const result = await callSignIn(identifier, password)
    if (result.status === 200 && result.data?.session && result.data?.user) {
      const { session, user } = result.data
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      if (error || !data?.user) return { ok: false, error: UNREACHABLE_ERROR }
      const me = { id: user.id, displayName: user.display_name, email: data.user.email ?? '' }
      applyToken.current++
      commitUser(me)
      return { ok: true, user: me }
    }
    if (result.status === 429) return { ok: false, error: RATE_LIMIT_ERROR }
    if (result.status === 401 || result.status === 400) return { ok: false, error: GENERIC_ERROR }
    return { ok: false, error: UNREACHABLE_ERROR }
  }

  // Display names are public in `profiles`, so uniqueness is checked there too
  // (the database enforces it case-insensitively as well).
  const displayNameTaken = async (displayName) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', escapeLike(displayName.trim()))
      .limit(1)
    if (error) throw error
    return data.length > 0
  }

  // Maps a supabase-js signUp failure to field errors.
  const signUpErrors = (error) => {
    const text = `${error?.message ?? ''}`.toLowerCase()
    const code = error?.code ?? ''
    if (code === 'user_already_exists' || code === 'email_exists' || /already registered|already been registered/.test(text)) {
      return { email: EMAIL_TAKEN }
    }
    if (code === 'weak_password' || /password/.test(text)) return { password: PASSWORD_RULES }
    if (error?.status === 429 || /rate limit/.test(text)) return { form: RATE_LIMIT_ERROR }
    if (/database error saving new user/.test(text)) return { displayName: NAME_NOT_ALLOWED }
    if (!error?.status && /fetch|network|failed/.test(text)) return { form: UNREACHABLE_ERROR }
    return { form: 'Could not create the account, try again' }
  }

  // `dryRun` only checks the display name so the form can show every problem at
  // once without creating anything.
  const signUp = async ({ displayName, email, password, dryRun = false }) => {
    const name = displayName.trim()
    if (name) {
      try {
        if (name.length > MAX_DISPLAY_NAME) return { ok: false, errors: { displayName: NAME_NOT_ALLOWED } }
        if (await displayNameTaken(name)) return { ok: false, errors: { displayName: NAME_TAKEN } }
      } catch {
        return { ok: false, errors: { displayName: 'Could not check this display name, try again' } }
      }
    }
    if (dryRun) return { ok: true, dryRun: true }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name } },
      })
      if (error) return { ok: false, errors: signUpErrors(error) }
      if (!data?.session || !data?.user) {
        return { ok: false, errors: { form: 'Account created, but it could not sign you in. Try signing in.' } }
      }
      const me = { id: data.user.id, displayName: name, email: data.user.email ?? email.trim() }
      applyToken.current++
      commitUser(me)
      return { ok: true, user: me }
    } catch (e) {
      return { ok: false, errors: signUpErrors(e) }
    }
  }

  const signOut = async () => {
    // Clear local state first so the UI is signed out even if the request fails.
    applyToken.current++
    commitUser(null)
    await supabase.auth.signOut().catch(() => {})
    return { ok: true }
  }

  // Changes the signed-in user's password. The current password is always
  // re-checked on a throwaway client (so the active session is untouched and
  // a hijacked session alone can't change it). Passwords are never logged.
  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!currentUser?.email) return { ok: false, error: 'Sign in to change your password' }
    const wait = pwLockedUntil.current - Date.now()
    if (wait > 0) {
      return { ok: false, locked: true, lockedUntil: pwLockedUntil.current, error: `Too many incorrect attempts. Try again in ${Math.ceil(wait / 1000)} seconds` }
    }
    if (!currentPassword) return { ok: false, field: 'current', error: 'Enter your current password' }
    if (newPassword.length < MIN_PASSWORD) return { ok: false, field: 'new', error: PASSWORD_RULES }
    if (newPassword === currentPassword) return { ok: false, field: 'new', error: SAME_PASSWORD }
    if (pwBusy.current) return { ok: false, error: 'Please wait' }
    pwBusy.current = true
    try {
      const verifier = createVerifierClient()
      let verified = false
      try {
        const { data, error } = await verifier.auth.signInWithPassword({ email: currentUser.email, password: currentPassword })
        verified = !error && !!data?.session
        if (error && (error.status === 429 || !error.status)) {
          return { ok: false, error: error.status === 429 ? RATE_LIMIT_ERROR : UNREACHABLE_ERROR }
        }
      } finally {
        await verifier.auth.signOut({ scope: 'local' }).catch(() => {})
      }
      if (!verified) {
        pwFails.current += 1
        if (pwFails.current >= MAX_PW_ATTEMPTS) {
          pwFails.current = 0
          pwLockedUntil.current = Date.now() + PW_LOCK_MS
          return { ok: false, field: 'current', locked: true, lockedUntil: pwLockedUntil.current, error: 'Too many incorrect attempts. Try again in 30 seconds' }
        }
        return { ok: false, field: 'current', error: WRONG_CURRENT }
      }
      pwFails.current = 0
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        const text = `${error.message ?? ''}`.toLowerCase()
        if (/same|different/.test(text)) return { ok: false, field: 'new', error: SAME_PASSWORD }
        if (error.code === 'weak_password' || /password/.test(text)) return { ok: false, field: 'new', error: PASSWORD_RULES }
        if (error.status === 429) return { ok: false, error: RATE_LIMIT_ERROR }
        return { ok: false, error: 'Could not update the password, try again' }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: UNREACHABLE_ERROR }
    } finally {
      pwBusy.current = false
    }
  }

  const value = useMemo(
    () => ({
      signIn,
      signUp,
      signOut,
      changePassword,
      currentUser,
      authLoading,
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
    }),
    // The method closures only use refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, authLoading, modal],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
