import { useState } from 'react'
import { Link } from 'react-router-dom'

// 3:4 cover card linking to /details/:id. Missing or broken covers fall back
// to a framed placeholder; the title is always visible.
export default function BookCard({ book, isNew = false, order = 0 }) {
  const [failed, setFailed] = useState(false)
  const showCover = book.thumbnail && !failed

  return (
    <li
      className={`book-card${isNew ? ' book-card--new' : ''}`}
      style={{ '--i': order }}
    >
      <Link to={`/details/${book.id}`} className="book-card__link">
        <span className="book-card__cover">
          {showCover ? (
            <img
              src={book.thumbnail}
              alt={`Cover of ${book.title}`}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <span className="book-card__placeholder" aria-hidden="true">
              Cover not provided
            </span>
          )}
        </span>
        <span className="book-card__title">{book.title}</span>
      </Link>
    </li>
  )
}
