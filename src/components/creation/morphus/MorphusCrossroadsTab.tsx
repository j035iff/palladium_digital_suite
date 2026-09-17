import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
} from '../../../data/library/morphusForgeRoutingLoader'
import { NIGHTBANE_MORPHUS_BASE_PROFILE } from '../../../lib/morphusNightbaneBase'
import {
  formatMorphusPercentileBand,
  morphusForgeStateAfterPathChange,
  resolveMorphusForgeState,
} from '../../../lib/morphusForgeNavigation'
import { formatMorphusSlotPlanRoute } from '../../../lib/morphusTraitPickDisplay'
import type { MorphusForgePath } from '../../../types'
import { MorphusSlotPlanPreview } from './MorphusSlotPlanPreview'
import { MORPHUS_FORGE_FIELD_CLASS } from './MorphusTraitPickCard'

type Props = {
  morphusForgeState: ReturnType<typeof resolveMorphusForgeState>
  onPatchState: (
    patch: Parameters<typeof morphusForgeStateAfterPathChange>[1] & {
      characteristicsPickCount?: number
    },
  ) => void
}

export function MorphusCrossroadsTab({ morphusForgeState, onPatchState }: Props) {
  const state = morphusForgeState
  const { min, max, notation } = MORPHUS_FORGE_MANIFEST.path2.countRoll

  const setPath = (path: MorphusForgePath) => {
    onPatchState({ path })
  }

  const setAppearance = (appearanceEntryId: string) => {
    onPatchState({
      path: 'appearance',
      appearanceEntryId,
    })
  }

  const base = NIGHTBANE_MORPHUS_BASE_PROFILE

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-violet-700/60 bg-slate-950/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-violet-300">
          Morphus base profile (auto-applied)
        </h3>
        <p className="mt-2 text-sm text-violet-100/90">
          Nightbane R.C.C. Morphus bonuses from{' '}
          <cite>
            {base.source.reference} p. {base.source.pageNumber}
          </cite>
          .
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-violet-100/85">
          <li>
            Attributes: +{base.attributeBonuses.ps} P.S., +{base.attributeBonuses.pe} P.E., +
            {base.attributeBonuses.pp} P.P., +{base.attributeBonuses.spd} Spd
          </li>
          <li>Horror Factor {base.horrorFactor} (before trait modifiers)</li>
          <li>
            Innate Hand to Hand: {base.handToHandMorphus.replace(/_/g, ' ')} (+{' '}
            {base.extraAttacksPerMelee} attack per melee)
          </li>
          <li>{base.vitalsNotes.hitPoints}</li>
          <li>{base.vitalsNotes.sdc}</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-violet-200">
          Choose your path
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-violet-200/80">
          You can switch paths at any time before Spawn. Downstream trait choices reset when the
          path changes.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setPath('appearance')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              state.path === 'appearance'
                ? 'border-emerald-500 bg-emerald-950/40'
                : 'border-violet-700 bg-slate-900/60 hover:border-violet-500'
            }`}
          >
            <span className="text-xs font-bold uppercase text-violet-300">Path 1</span>
            <p className="mt-1 font-semibold text-violet-50">Appearance (Macro Table)</p>
            <p className="mt-2 text-sm text-violet-200/85">
              Pick your Appearance archetype from the master list. Percentiles are shown for
              reference — no d100 roll required.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPath('characteristics')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              state.path === 'characteristics'
                ? 'border-emerald-500 bg-emerald-950/40'
                : 'border-violet-700 bg-slate-900/60 hover:border-violet-500'
            }`}
          >
            <span className="text-xs font-bold uppercase text-violet-300">Path 2</span>
            <p className="mt-1 font-semibold text-violet-50">Personality Crafter</p>
            <p className="mt-2 text-sm text-violet-200/85">
              {MORPHUS_FORGE_MANIFEST.path2.description} Enter your physical{' '}
              <strong>{notation}</strong> result below to unlock that many Characteristics
              selections on the Trait Forge.
            </p>
          </button>
        </div>
      </section>

      {state.path === 'appearance' ? (
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-violet-200">
            Appearance archetype
          </h3>
          <ul className="mt-3 max-h-[min(50vh,28rem)] space-y-2 overflow-y-auto pr-1">
            {MORPHUS_APPEARANCE_ROUTING_TABLE.entries.map((entry) => {
              const band = formatMorphusPercentileBand(
                entry.percentile.min,
                entry.percentile.max,
              )
              const selected = state.appearanceEntryId === entry.id
              return (
                <li key={entry.id}>
                  <div
                    className={`overflow-hidden rounded-lg border transition ${
                      selected
                        ? 'border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
                        : 'border-violet-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setAppearance(entry.id)}
                      aria-expanded={selected}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? 'bg-emerald-950 text-emerald-50'
                          : 'bg-slate-900 text-violet-100 hover:border-violet-500 hover:bg-slate-800'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{entry.name}</span>
                        <span className="mt-0.5 block text-xs font-medium text-amber-200/90">
                          {formatMorphusSlotPlanRoute(entry.slotPlan)}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-violet-300">{band}%</span>
                    </button>
                    {selected ? (
                      <MorphusSlotPlanPreview entry={entry} variant="inline" />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {state.path === 'characteristics' ? (
        <section className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-4">
          <label className="block max-w-xs">
            <span className="text-xs font-bold uppercase tracking-wide text-violet-300">
              Physical {notation} result
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              value={state.characteristicsPickCount ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  onPatchState({ characteristicsPickCount: undefined })
                  return
                }
                const n = Number.parseInt(raw, 10)
                onPatchState({
                  characteristicsPickCount: Number.isFinite(n) ? n : undefined,
                })
              }}
              className={`mt-1 ${MORPHUS_FORGE_FIELD_CLASS} text-center text-lg font-bold tabular-nums ${
                state.characteristicsPickCount != null &&
                (state.characteristicsPickCount < min ||
                  state.characteristicsPickCount > max ||
                  !Number.isFinite(state.characteristicsPickCount))
                  ? 'border-rose-500/90'
                  : state.characteristicsPickCount != null &&
                      state.characteristicsPickCount >= min &&
                      state.characteristicsPickCount <= max
                    ? 'border-emerald-500/90'
                    : ''
              }`}
            />
            <span className="mt-1 block text-xs text-violet-400">
              Valid range: {min}–{max} (sum of one d4 + 2). Required to Continue from Crossroads.
            </span>
          </label>
        </section>
      ) : null}
    </div>
  )
}
