import { useId, useRef } from 'react'

// 1-5 bookmark icons with a text equivalent. A missing rating is stated, not
// shown as five empty icons.
function Bookmark({ filled, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M6 3h12v18l-6-4.5L6 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Rating({ value }) {
  if (!value) return <p className="rating rating--none">Not rated</p>
  return (
    <p className="rating" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Bookmark key={n} filled={n <= value} />
      ))}
    </p>
  )
}

// Optional 1-5 input. A radiogroup with roving tabindex: arrows move and
// select, Home/End jump, and choosing the selected bookmark again clears it.
export function RatingInput({ value, onChange, label = 'Rating' }) {
  const labelId = useId()
  const refs = useRef([])
  const stop = value || 1 // the one tab stop

  const choose = (n) => {
    onChange(n)
    refs.current[n - 1]?.focus()
  }
  const onKeyDown = (e) => {
    const cur = value || 0
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(5, cur + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(1, cur - 1)
    else if (e.key === 'Home') next = 1
    else if (e.key === 'End') next = 5
    if (next === null) return
    e.preventDefault()
    choose(next)
  }

  return (
    <div className="field">
      <span id={labelId} className="field__label">
        {label} <span className="field__optional">(optional)</span>
      </span>
      <div className="rating-input" role="radiogroup" aria-labelledby={labelId}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => (refs.current[n - 1] = el)}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'bookmark' : 'bookmarks'}`}
            tabIndex={n === stop ? 0 : -1}
            className="rating-input__btn"
            onClick={() => onChange(value === n ? null : n)}
            onKeyDown={onKeyDown}
          >
            <Bookmark filled={value !== null && n <= value} size={28} />
          </button>
        ))}
      </div>
      <p className="field__hint">Select the same bookmark again to clear.</p>
    </div>
  )
}
