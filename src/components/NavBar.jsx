import { Link, useMatch } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

// Center title by route: "/" = Book Worm, "/details/:id" = Book Details.
// The right slot is Sign-In when public, the display name (opens Profile) when
// signed in. It is one button so focus survives the swap. While the saved
// session is being restored the slot stays empty instead of flashing Sign-In.
export default function NavBar() {
  const onDetails = useMatch('/details/:id')
  const title = onDetails ? 'Book Details' : 'Book Worm'
  const { currentUser, authLoading, openModal } = useAuth()

  return (
    <header className="nav">
      <nav className="nav__inner" aria-label="Main">
        <Link to="/" className="nav__home">
          Home
        </Link>
        <p className="nav__title">{title}</p>
        <button
          type="button"
          className="btn btn--cta nav__auth"
          data-auth-trigger
          hidden={authLoading}
          aria-haspopup="dialog"
          aria-label={currentUser ? `${currentUser.displayName}, open profile` : undefined}
          title={currentUser ? currentUser.displayName : undefined}
          onClick={() => openModal(currentUser ? 'profile' : 'signin')}
        >
          <span className="nav__auth-label">
            {currentUser ? currentUser.displayName : 'Sign-In'}
          </span>
        </button>
      </nav>
    </header>
  )
}
