import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterProvider } from './context/CharacterContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterProvider>
      <App />
    </CharacterProvider>
  </StrictMode>,
)
