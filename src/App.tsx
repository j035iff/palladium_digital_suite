import { AppLauncher } from './components/dashboard/AppLauncher'
import { MainLayout } from './components/layout/MainLayout'
import { useCharacter } from './context/CharacterContext'

function App() {
  const { viewport, activeForm, supportsDualForm } = useCharacter()

  if (viewport === 'launcher') {
    return <AppLauncher />
  }

  const themeClass =
    supportsDualForm && activeForm === 'morphus'
      ? 'min-h-svh bg-gradient-to-b from-slate-950 via-violet-950 to-black text-violet-50'
      : 'min-h-svh bg-gradient-to-b from-slate-50 via-blue-50 to-white text-slate-900'

  return (
    <div
      className={`flex h-svh min-h-0 flex-col overflow-hidden ${themeClass}`}
      data-active-form={supportsDualForm ? activeForm : 'facade'}
    >
      <MainLayout />
    </div>
  )
}

export default App
