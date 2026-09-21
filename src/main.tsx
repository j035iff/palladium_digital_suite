import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterProvider } from './context/CharacterContext'
import { GmSessionProvider } from './context/GmSessionContext'
import { UnitsPreferenceProvider } from './lib/units'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UnitsPreferenceProvider>
      <CharacterProvider>
        <GmSessionProvider>
          <App />
        </GmSessionProvider>
      </CharacterProvider>
    </UnitsPreferenceProvider>
  </StrictMode>,
)
