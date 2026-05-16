import { useCharacter } from '../../context/CharacterContext'
import { OCC_REGISTRY, RACE_REGISTRY } from '../../data/library/registry'
import { DEFAULT_RACE_ID } from '../../lib/raceFormPolicy'
import { isOccAllowedForRace } from '../../lib/raceEngine'
import { formatPalladiumSources } from '../../lib/formatPalladiumSources'
import {
  occBaseStatsDice,
  occCharacterCategory,
  occSkillSlotPolicy,
  occXpTableId,
} from '../../lib/occCatalogEngine'

/**
 * Step 0 — O.C.C. package: name (class), fixed XP table, psychic category, and starting skill ids.
 */
export function OccSelection() {
  const {
    character,
    activeForm,
    activeRace,
    raceCanPickOcc,
    setSelectedOcc,
    setRaceId,
    supportsDualForm,
  } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'
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
      <div className={`mb-4 grid gap-2 sm:grid-cols-2 ${panel} rounded-lg border-2 p-3`}>
        <p
          className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide opacity-80"
          style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
        >
          Race (library)
        </p>
        {RACE_REGISTRY.map((race) => {
          const selected = (character.raceId ?? DEFAULT_RACE_ID) === race.id
          const citation = formatPalladiumSources(race.sources)
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => setRaceId(race.id)}
              className={`rounded-lg border-2 px-3 py-2 text-left transition-[box-shadow,transform] ${
                selected
                  ? morphus
                    ? 'border-amber-400 bg-violet-950/80 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
                    : 'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.25)]'
                  : morphus
                    ? 'border-violet-800 bg-slate-900/60 hover:border-violet-500'
                    : 'border-slate-200 bg-slate-50 hover:border-blue-400'
              }`}
              aria-pressed={selected}
              title={citation || race.description}
            >
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                {race.name}
                {!race.canPickOcc ? (
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      morphus ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    R.C.C.
                  </span>
                ) : null}
              </span>
              {citation ? (
                <span
                  className={`mt-1 block font-mono text-[10px] font-normal leading-snug ${
                    morphus ? 'text-violet-300/85' : 'text-slate-500'
                  }`}
                >
                  {citation}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {!raceCanPickOcc ? (
        <div
          className={`mb-4 rounded-lg border-2 border-dashed px-4 py-3 text-sm leading-snug ${
            morphus ? 'border-amber-500/70 bg-amber-950/30 text-amber-100' : 'border-amber-500/80 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-bold uppercase tracking-wide">R.C.C. — no separate O.C.C.</p>
          <p className="mt-1 opacity-90">
            {activeRace?.name ?? 'This race'} is self-contained. Character creation skips
            secondary O.C.C. selection; use the R.C.C. package on your sheet.
          </p>
          {activeRace?.sources?.length ? (
            <p
              className={`mt-2 font-mono text-[10px] ${
                morphus ? 'text-violet-300/80' : 'text-amber-800/90'
              }`}
            >
              {formatPalladiumSources(activeRace.sources)}
            </p>
          ) : null}
        </div>
      ) : null}
      {raceCanPickOcc ? (
      <div className={`grid gap-3 sm:grid-cols-3 ${panel} rounded-lg border-2 p-4`}>
        {OCC_REGISTRY.filter((def) => isOccAllowedForRace(activeRace, def)).map((def) => {
          const selected = character.occ.id === def.id
          const xpId = occXpTableId(def)
          const xpLabel =
            xpId === 'borg'
              ? 'Borg (+8%)'
              : xpId === 'psychic'
                ? 'Psychic (+12%)'
                : 'Standard'
          const slotPolicy = occSkillSlotPolicy(def)
          const slotNote =
            slotPolicy.kind === 'psychic_tier'
              ? `Related slots × ${slotPolicy.majorMultiplier} on Major psychic`
              : null
          const base = occBaseStatsDice(def)
          const occCat = occCharacterCategory(def)
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
                {occCat === 'psychic' ? 'Psychic O.C.C.' : 'O.C.C.'}
              </p>
              <p className="mt-1 text-lg font-bold">{def.name}</p>
              <p className="mt-2 font-mono text-[11px] leading-snug opacity-85">
                HP {base.hpDice} · SDC {base.sdcDice}
                {base.ppeDice ? ` · PPE ${base.ppeDice}` : ''}
                {base.ispDice ? ` · ISP ${base.ispDice}` : ''}
              </p>
              <p className="mt-2 text-[11px] leading-snug opacity-80">
                XP table: {xpLabel}
                {slotNote ? ` · ${slotNote}` : ''}
              </p>
            </button>
          )
        })}
      </div>
      ) : null}
    </section>
  )
}
