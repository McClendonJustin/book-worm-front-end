import { useId, useState } from 'react'

// Labelled input with optional helper text and an error tied via
// aria-describedby / aria-invalid. Pass type="password" for a show/hide toggle.
export default function FormField({
  label,
  error,
  hint,
  inputRef,
  type = 'text',
  ...rest
}) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  const hintId = hint ? `${id}-hint` : null
  const errId = error ? `${id}-err` : null
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={isPassword ? 'field__row' : undefined}>
        <input
          id={id}
          ref={inputRef}
          className="control"
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            disabled={rest.disabled}
            aria-pressed={shown}
            aria-label={`Show ${label.toLowerCase()}`}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}
