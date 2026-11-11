import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { initializeTheme } from './features/theme/theme'
import { observeLocalFormDataReset } from './lib/local-form-data'
const disposeTheme = initializeTheme()
const disposeLocalFormData = observeLocalFormDataReset()
if (import.meta.hot) import.meta.hot.dispose(disposeTheme)
if (import.meta.hot) import.meta.hot.dispose(disposeLocalFormData)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
