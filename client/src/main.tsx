import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/theme.css'
import { App } from './app/App'
import { AppProviders } from './app/providers'
import { Toaster } from './shared/components/ui/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
      <Toaster />
    </AppProviders>
  </StrictMode>,
)
