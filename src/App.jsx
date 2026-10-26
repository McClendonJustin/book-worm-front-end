import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import Home from './pages/Home.jsx'
import Details from './pages/Details.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/details/:id" element={<Details />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
