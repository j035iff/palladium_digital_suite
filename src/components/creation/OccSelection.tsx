import { useCharacter } from '../../context/CharacterContext'
import { OCC_DEFINITIONS } from '../../data/occDefinitions'

/**
 * Step 0 — O.C.C. package: name (class), fixed XP table, psychic category, and starting skill ids.
 */
export function OccSelection() {
  const { character, activeForm, setSelectedOcc } = useCharacter()
  const morphus = activeForm === 'morphus'
  const panel = morphus
    ? 'border-violet-600 bg-slate-950/90 text-violet-50'
    : 'border-blue-300 bg-white text-slate-900'

  return (
    <section
      className="mt-0 w-full border-b-2 border-dashed pb-8"
      aria-labelledby="occ-selection-heading"
    >
      <h2
        id="occ-selection-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 0: Choose O.C.C.
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Your Occupation Character Class is a package: it locks your lifetime XP thresholds,
        sets your starting O.C.C. skill picks, and (for psychic classes) gates the Psychic
        Matrix.
      </p>
      <div className={`grid gap-3 sm:grid-cols-3 ${panel} rounded-lg border-2 p-4`}>
        {OCC_DEFINITIONS.map((def) => {
          const selected = character.occ.id === def.id
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setSelectedOcc(def.id)}
              className={`rounded-lg border-2 p-3 text-left transition-[box-shadow,transform] ${
                selected
                  ? morphus
                    ? 'border-amber-400 bg-violet-950/80 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
                    : 'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.25)]'
                  : morphus
                    ? 'border-violet-800 bg-slate-900/60 hover:border-violet-500'
                    : 'border-slate-200 bg-slate-50 hover:border-blue-400'
              }`}
              aria-pressed={selected}
            >
              <p
                className="text-xs font-black uppercase tracking-wide opacity-70"
                style={{ color: morphus ? '#c4b5fd' : '#1e3a8a' }}
              >
                {def.category === 'psychic' ? 'Psychic O.C.C.' : 'O.C.C.'}
              </p>
              <p className="mt-1 text-lg font-bold">{def.name}</p>
              <p className="mt-2 font-mono text-[11px] leading-snug opacity-85">
                HP {def.baseStats.hpDice} · SDC {def.baseStats.sdcDice}
                {def.baseStats.ppeDice ? ` · PPE ${def.baseStats.ppeDice}` : ''}
                {def.baseStats.ispDice ? ` · ISP ${def.baseStats.ispDice}` : ''}
              </p>
              <p className="mt-2 text-[11px] leading-snug opacity-80">
                XP curve: {def.id === 'borg' ? 'Borg (+8%)' : def.id === 'mind_melter' ? 'Psychic (+12%)' : 'Standard'}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
