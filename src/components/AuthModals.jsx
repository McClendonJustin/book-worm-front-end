import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import {
  EMAIL_RE,
  MAX_DISPLAY_NAME,
  MIN_PASSWORD,
  isDemoName,
} from '../context/authRules.js'

// Focus the first invalid field after a failed submit. `token` changes on every
// attempt so repeated failures re-focus.
function useFocusOnError(refs, state) {
  useEffect(() => {
    if (!state.focus) return
    refs.current[state.focus]?.focus()
  }, [refs, state])
}

function SignInForm() {
  const { signIn, openModal, closeModal } = useAuth()
  const { showToast } = useToast()
  const [values, setValues] = useState({ identifier: '', password: '' })
  const [state, setState] = useState({ errors: {}, focus: null })
  const [busy, setBusy] = useState(false)
  const refs = useRef({})
  useFocusOnError(refs, state)
  const { errors } = state

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key] || errors.form) setState({ errors: {}, focus: null })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!values.identifier.trim()) next.identifier = 'Enter your email or display name'
    if (!values.password) next.password = 'Enter your password'
    if (Object.keys(next).length) {
      setState({ errors: next, focus: next.identifier ? 'identifier' : 'password' })
      return
    }
    setBusy(true)
    const res = await signIn(values.identifier, values.password)
    setBusy(false)
    if (!res.ok) {
      setValues((v) => ({ ...v, password: '' }))
      setState({ errors: { form: res.error }, focus: 'password' })
      return
    }
    closeModal()
    showToast(`Signed in as ${res.user.displayName}`)
  }

  const bad = errors.form ? 'true' : undefined
  return (
    <form className="modal__form" onSubmit={onSubmit} noValidate>
      {errors.form && (
        <p className="form-error" role="alert" id="signin-error">
          {errors.form}
        </p>
      )}
      <FormField
        label="Email or Display Name"
        name="identifier"
        autoComplete="username"
        data-autofocus
        inputRef={(el) => (refs.current.identifier = el)}
        value={values.identifier}
        onChange={set('identifier')}
        error={errors.identifier}
        aria-invalid={bad}
        aria-describedby={errors.form ? 'signin-error' : undefined}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        inputRef={(el) => (refs.current.password = el)}
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        aria-invalid={bad}
        aria-describedby={errors.form ? 'signin-error' : undefined}
      />
      <div className="modal__actions">
        <button type="submit" className="btn btn--cta" disabled={busy}>
          Sign-In
        </button>
        <button
          type="button"
          className="btn btn--create"
          onClick={() => openModal('signup')}
        >
          Sign-Up
        </button>
      </div>
    </form>
  )
}

function SignUpForm() {
  const { signUp, openModal, closeModal } = useAuth()
  const { showToast } = useToast()
  const [values, setValues] = useState({
    displayName: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [state, setState] = useState({ errors: {}, focus: null })
  const [busy, setBusy] = useState(false)
  const refs = useRef({})
  useFocusOnError(refs, state)
  const { errors } = state

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key] || errors.form) {
      setState((s) => ({ errors: { ...s.errors, [key]: undefined, form: undefined }, focus: null }))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!values.displayName.trim()) next.displayName = 'Enter a display name'
    if (!values.email.trim()) next.email = 'Enter an email address'
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Enter a valid email address'
    if (!values.password) next.password = 'Enter a password'
    else if (values.password.length < MIN_PASSWORD)
      next.password = `Password must be at least ${MIN_PASSWORD} characters`
    if (!values.confirm) next.confirm = 'Confirm your password'
    else if (values.confirm !== values.password) next.confirm = 'Passwords do not match'

    // Uniqueness is checked even when other fields are invalid so every
    // problem shows at once; nothing is created unless the form is clean.
    setBusy(true)
    const res = await signUp(
      Object.keys(next).length
        ? { ...values, dryRun: true }
        : values,
    )
    setBusy(false)
    if (!res.ok) {
      for (const key of ['displayName', 'email', 'password']) {
        if (res.errors[key] && !next[key]) next[key] = res.errors[key]
      }
      if (res.errors.form) next.form = res.errors.form
    }
    const order = ['displayName', 'email', 'password', 'confirm']
    const firstBad = order.find((k) => next[k])
    if (firstBad || next.form) {
      setState({ errors: next, focus: firstBad ?? null })
      return
    }
    closeModal()
    showToast(`Signed in as ${res.user.displayName}`)
  }

  return (
    <form className="modal__form" onSubmit={onSubmit} noValidate>
      {errors.form && (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      )}
      <FormField
        label="Display Name"
        name="displayName"
        autoComplete="username"
        maxLength={MAX_DISPLAY_NAME}
        data-autofocus
        inputRef={(el) => (refs.current.displayName = el)}
        value={values.displayName}
        onChange={set('displayName')}
        error={errors.displayName}
      />
      <FormField
        label="Email Address"
        name="email"
        type="email"
        autoComplete="email"
        inputRef={(el) => (refs.current.email = el)}
        value={values.email}
        onChange={set('email')}
        error={errors.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD} characters.`}
        inputRef={(el) => (refs.current.password = el)}
        value={values.password}
        onChange={set('password')}
        error={errors.password}
      />
      <FormField
        label="Confirm Password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        inputRef={(el) => (refs.current.confirm = el)}
        value={values.confirm}
        onChange={set('confirm')}
        error={errors.confirm}
      />
      <div className="modal__actions">
        <button type="submit" className="btn btn--create" disabled={busy}>
          Sign-Up
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => openModal('signin')}
        >
          Back to Sign-In
        </button>
      </div>
    </form>
  )
}

function ProfileForm() {
  const { currentUser, changePassword, signOut, closeModal } = useAuth()
  const { showToast } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const currentRef = useRef(null)
  const nextRef = useRef(null)
  const isDemo = isDemoName(currentUser.displayName)
  const locked = lockedUntil > now
  const disabled = isDemo || locked

  useEffect(() => {
    if (!locked) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [locked, lockedUntil])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (disabled || busy) return
    setBusy(true)
    const res = await changePassword({ currentPassword: current, newPassword: next })
    setBusy(false)
    if (!res.ok) {
      if (res.locked) {
        setNow(Date.now())
        setLockedUntil(res.lockedUntil)
      }
      const key = res.field === 'new' ? 'next' : res.field === 'current' ? 'current' : 'form'
      setErrors({ [key]: res.error })
      if (key === 'next') nextRef.current?.focus()
      else if (key === 'current') currentRef.current?.focus()
      return
    }
    setCurrent('')
    setNext('')
    setErrors({})
    showToast('Password updated')
  }

  const onSignOut = async () => {
    await signOut()
    closeModal()
    showToast('Signed out')
  }

  const clear = (setter, key) => (e) => {
    setter(e.target.value)
    setErrors((prev) => ({ ...prev, [key]: '', form: '' }))
  }

  return (
    <form className="modal__form" onSubmit={onSubmit} noValidate>
      <FormField
        label="Display Name"
        value={currentUser.displayName}
        readOnly
        hint="Display name can't be changed because it must stay unique."
      />
      <FormField label="Email Address" value={currentUser.email} readOnly />
      <FormField
        label="Current Password"
        type="password"
        autoComplete="current-password"
        data-autofocus
        inputRef={currentRef}
        value={current}
        onChange={clear(setCurrent, 'current')}
        error={errors.current}
        disabled={disabled}
        hint={isDemo ? "Demo account passwords can't be changed." : undefined}
      />
      <FormField
        label="New Password"
        type="password"
        autoComplete="new-password"
        inputRef={nextRef}
        value={next}
        onChange={clear(setNext, 'next')}
        error={errors.next}
        disabled={disabled}
        hint={`At least ${MIN_PASSWORD} characters.`}
      />
      {locked && (
        <p className="field__error" role="alert">
          Too many incorrect attempts. Try again in {Math.max(1, Math.ceil((lockedUntil - now) / 1000))} seconds.
        </p>
      )}
      {errors.form && (
        <p className="field__error" role="alert">
          {errors.form}
        </p>
      )}
      <div className="modal__actions">
        <button type="submit" className="btn btn--cta" disabled={disabled || busy}>
          Reset Password
        </button>
        <button type="button" className="btn btn--ghost" onClick={onSignOut}>
          Sign-Out
        </button>
      </div>
    </form>
  )
}

const TITLES = { signin: 'Sign-In', signup: 'Sign-Up', profile: 'Profile' }

export default function AuthModals() {
  const { modal, closeModal, currentUser } = useAuth()
  const view = modal === 'profile' && !currentUser ? null : modal
  if (!view) return null
  return (
    <Modal title={TITLES[view]} onClose={closeModal} focusKey={view}>
      {view === 'signin' && <SignInForm key="signin" />}
      {view === 'signup' && <SignUpForm key="signup" />}
      {view === 'profile' && <ProfileForm key="profile" />}
    </Modal>
  )
}
