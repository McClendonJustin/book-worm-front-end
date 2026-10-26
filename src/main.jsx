import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import App from './App.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import LibraryProvider from './context/LibraryProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LibraryProvider>
            <App />
          </LibraryProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
