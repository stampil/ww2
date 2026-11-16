import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/i18n'
import App from './app/App'
import './styles.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)