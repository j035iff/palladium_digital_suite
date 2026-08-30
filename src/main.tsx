import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterProvider } from './context/CharacterContext'
import { GmSessionProvider } from './context/GmSessionContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterProvider>
      <GmSessionProvider>
        <App />
      </GmSessionProvider>
    </CharacterProvider>
  </StrictMode>,
)
