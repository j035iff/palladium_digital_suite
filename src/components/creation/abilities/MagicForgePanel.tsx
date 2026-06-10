type MagicForgePanelProps = {
  morphus: boolean
  spellCap: number
}

export function MagicForgePanel({ morphus, spellCap }: MagicForgePanelProps) {
  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  return (
    <div className={`rounded-lg border p-6 text-sm ${panelStyle}`}>
      <p className="opacity-90">
        Spell catalog transcription is not wired yet. Your O.C.C. grants{' '}
        <strong>{spellCap}</strong> as the starting spell level cap when the magic
        library is available.
      </p>
      <p className="mt-3 text-xs opacity-70">
        No placeholder spells are shown — picks will come from the authored spell
        catalog.
      </p>
    </div>
  )
}
