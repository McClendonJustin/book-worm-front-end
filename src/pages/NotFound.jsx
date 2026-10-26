import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="stack notfound">
      <h1 className="display">This page isn&apos;t on the shelf</h1>
      <p className="muted">
        The link may be broken, or the page may have moved. Head back home to
        keep browsing.
      </p>
      <Link to="/" className="btn btn--cta">
        Back to Home
      </Link>
    </section>
  )
}
