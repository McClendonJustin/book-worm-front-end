import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.jsx'
import AuthModals from './AuthModals.jsx'

export default function AppShell() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <NavBar />
      <main id="main" className="page" tabIndex={-1}>
        <Outlet />
      </main>
      <AuthModals />
    </div>
  )
}
