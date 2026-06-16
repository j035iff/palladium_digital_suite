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
 * Sheet-first saving throw targets (manual d20) + Horror Factor block.
 */
export function SavingThrowsPanel() {
  const { saveProfileDerived: profile, activeForm, supportsDualForm } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'
  const hf = profile.horrorFactor

  return (
    <section aria-labelledby="saves-heading">
      <h2
        id="saves-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Saving throws
      </h2>

      <div
        className={`relative z-10 mb-4 overflow-visible rounded-xl border-4 px-4 py-4 shadow-lg ${
          morphus
            ? 'border-amber-700/80 bg-gradient-to-br from-violet-950 via-slate-950 to-black'
            : 'border-amber-700/40 bg-gradient-to-br from-amber-50 via-white to-orange-50'
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p
            className={`text-xs font-black uppercase tracking-[0.2em] ${
              morphus ? 'text-amber-400' : 'text-amber-950'
            }`}
          >
            Horror factor
          </p>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
              morphus ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/50' : 'bg-orange-200 text-orange-950'
            }`}
          >
            {supportsDualForm ? activeForm : 'character'}
          </span>
        </div>
        <div className="group relative">
          <p
            className={`font-mono text-4xl font-black tabular-nums leading-none ${
              morphus ? 'text-amber-400' : 'text-orange-950'
            }`}
          >
            {hf.total ?? 'N/A'}
          </p>
          <p className={`mt-1 text-[11px] font-medium ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
            {hf.total != null
              ? 'Broadcast aura / presence — Nightbane Morphus baseline and `horror_factor` modifiers.'
              : 'Most races have no Horror Factor aura — only Nightbane Morphus (and explicit `horror_factor` traits).'}
          </p>
          {hf.tooltipEquation ? (
            <div
              role="tooltip"
              className={`pointer-events-none invisible absolute left-0 top-full z-30 mt-2 max-h-40 w-[min(100%,22rem)] overflow-y-auto rounded-md border-2 px-2 py-2 font-mono text-[10px] font-semibold leading-snug opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 ${
                morphus ? 'border-amber-500/70 bg-black/93 text-amber-100' : 'border-orange-900/40 bg-white text-orange-950'
              }`}
            >
              {hf.tooltipEquation}
            </div>
          ) : null}
        </div>
      </div>

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
