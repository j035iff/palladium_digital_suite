import { useCharacter } from '../../context/CharacterContext'

export function CombatNarrativeLog({ morphus }: { morphus: boolean }) {
  const { combatNarrativeLog, clearCombatNarrative } = useCharacter()

  if (combatNarrativeLog.length === 0) return null

  return (
    <div
      className={`mb-3 rounded-lg border-2 p-2 ${
        morphus
          ? 'border-violet-600/80 bg-black/60'
          : 'border-slate-400 bg-slate-50'
      }`}
      aria-label="Combat narrative log"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p
          className={`text-[10px] font-black uppercase tracking-wider ${
            morphus ? 'text-violet-300' : 'text-slate-700'
          }`}
        >
          Narrative log
        </p>
        <button
          type="button"
          className={`text-[9px] font-bold uppercase underline ${
            morphus ? 'text-violet-400' : 'text-slate-600'
          }`}
          onClick={clearCombatNarrative}
        >
          Clear
        </button>
      </div>
      <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px] leading-snug">
        {[...combatNarrativeLog].reverse().map((e) => (
          <li
            key={e.id}
            className={
              e.tone === 'failure'
                ? morphus
                  ? 'font-semibold text-red-400'
                  : 'font-semibold text-red-700'
                : e.tone === 'success'
                  ? morphus
                    ? 'text-emerald-300'
                    : 'text-emerald-800'
                  : morphus
                    ? 'text-violet-100'
                    : 'text-slate-800'
            }
          >
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
