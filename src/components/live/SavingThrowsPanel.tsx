import { useCharacter } from '../../context/CharacterContext'
import {
  formatAttributeSaveChipBonus,
  formatAttributeSaveChipValue,
  type AttributeSaveEntry,
} from '../../lib/attributeSaves'
import { DEFENDER_WINS_TIES } from '../../lib/opposedRollRules'
import { formatSaveRollBonus, formatSaveVsTarget } from '../../lib/saveRollDisplay'
import type { SaveRollEntry } from '../../lib/saveProfile'

function AttributeSaveChip({
  entry,
  morphus,
}: {
  entry: AttributeSaveEntry
  morphus: boolean
}) {
  const rollBonus = formatAttributeSaveChipBonus(entry)

  return (
    <div
      className={`group relative min-h-[4.25rem] rounded-lg border-2 px-2 py-2 pb-8 sm:pb-2 ${
        morphus
          ? 'border-indigo-800/80 bg-violet-950/65'
          : 'border-emerald-300/90 bg-white shadow-sm'
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase leading-tight ${
          morphus ? 'text-violet-300' : 'text-emerald-900'
        }`}
      >
        {entry.sheetLabel}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-black tabular-nums ${
          morphus ? 'text-amber-300' : 'text-emerald-950'
        }`}
      >
        {formatAttributeSaveChipValue(entry)}
        {rollBonus ? (
          <span className={`ml-2 text-sm font-bold ${morphus ? 'text-violet-200' : 'text-emerald-800'}`}>
            ({rollBonus})
          </span>
        ) : null}
      </p>
      {entry.notes ? (
        <p className={`mt-1 text-[9px] leading-snug ${morphus ? 'text-violet-300/80' : 'text-slate-600'}`}>
          {entry.notes}
        </p>
      ) : null}
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-0 right-0 z-20 mb-2 max-h-48 overflow-y-auto rounded-md border-2 px-2 py-2 font-mono text-[10px] font-semibold leading-snug opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 sm:left-1/2 sm:right-auto sm:w-[min(100vw-2rem,22rem)] sm:-translate-x-1/2 ${
          morphus ? 'border-indigo-600/90 bg-black/95 text-violet-50' : 'border-emerald-600 bg-white text-slate-900'
        }`}
      >
        {entry.tooltipEquation}
      </div>
    </div>
  )
}

function SaveChip({
  entry,
  morphus,
}: {
  entry: SaveRollEntry
  morphus: boolean
}) {
  return (
    <div
      className={`group relative min-h-[4.25rem] rounded-lg border-2 px-2 py-2 pb-8 sm:pb-2 ${
        morphus
          ? 'border-indigo-800/80 bg-violet-950/65'
          : 'border-sky-300/90 bg-white shadow-sm'
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase leading-tight ${
          morphus ? 'text-violet-300' : 'text-slate-800'
        }`}
      >
        {entry.sheetLabel}
      </p>
      <p className={`mt-1 font-mono text-lg font-black tabular-nums ${morphus ? 'text-amber-300' : 'text-sky-900'}`}>
        {formatSaveVsTarget(entry.baseTarget)}
        <span className={`ml-2 text-sm font-bold ${morphus ? 'text-violet-200' : 'text-sky-800'}`}>
          ({formatSaveRollBonus(entry.totalBonus)})
        </span>
      </p>
      <p className={`hidden text-[9px] opacity-70 sm:block ${morphus ? 'text-violet-400' : 'text-slate-500'}`}>
        Hover for bonus breakdown
      </p>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-0 right-0 z-20 mb-2 max-h-48 overflow-y-auto rounded-md border-2 px-2 py-2 font-mono text-[10px] font-semibold leading-snug opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 sm:left-1/2 sm:right-auto sm:w-[min(100vw-2rem,22rem)] sm:-translate-x-1/2 ${
          morphus ? 'border-indigo-600/90 bg-black/95 text-violet-50' : 'border-sky-600 bg-white text-slate-900'
        }`}
      >
        {entry.tooltipEquation}
      </div>
    </div>
  )
}

/**
 * Sheet-first saving throw targets (manual d20).
 */
export function SavingThrowsPanel() {
  const { saveProfileDerived: profile, activeForm, supportsDualForm } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'

  return (
    <section aria-labelledby="saves-heading">
      <h2
        id="saves-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Saving throws
      </h2>

      <p className={`mb-2 text-xs ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
        The GM calls the save number (e.g. “save vs magic 12”). Roll d20 and add your listed bonus.
        {DEFENDER_WINS_TIES ? ' You win ties.' : ''} Psionics uses your Psychic Gate tier target before other
        bonuses.
      </p>
      <p className={`mb-3 text-xs ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
        Hover a row for the full bonus breakdown. Opposed combat defenses use the same tie rule — the defender wins
        when totals match.
      </p>

      <div className="mb-4">
        <h3
          className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
            morphus ? 'text-emerald-300' : 'text-emerald-800'
          }`}
        >
          Attribute-only saves
        </h3>
        <p className={`mb-2 text-xs ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
          Base P.E. and M.E. exceptional bonuses with no racial, O.C.C., or skill save modifiers. Nightbane also track
          Save vs Becoming (Facade M.E. + level progression) for Facade ↔ Morphus shifts.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profile.attributeSaves.map((s) => (
            <AttributeSaveChip key={s.id} entry={s} morphus={morphus} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {profile.saves.map((s) => (
          <SaveChip key={s.id} entry={s} morphus={morphus} />
        ))}
      </div>
    </section>
  )
}

