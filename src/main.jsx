import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext'
import { LoadingProvider } from './context/LoadingContext'

createRoot(document.getElementById('root')).render(
  <LoadingProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </LoadingProvider>,
)
