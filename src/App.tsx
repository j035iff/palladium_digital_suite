import { MainLayout } from './components/layout/MainLayout'
import { useCharacter } from './context/CharacterContext'

function App() {
  const { activeForm } = useCharacter()

  const themeClass =
    activeForm === 'morphus'
      ? 'min-h-svh bg-gradient-to-b from-slate-950 via-violet-950 to-black text-violet-50'
      : 'min-h-svh bg-gradient-to-b from-slate-50 via-blue-50 to-white text-slate-900'

  return (
    <div className={themeClass} data-active-form={activeForm}>
      <MainLayout />
    </div>
  )
}

export default App
