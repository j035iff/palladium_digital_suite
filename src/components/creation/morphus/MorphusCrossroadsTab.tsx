import { useMemo } from 'react'
import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
} from '../../../data/library/morphusForgeRoutingLoader'
import { NIGHTBANE_MORPHUS_BASE_PROFILE } from '../../../lib/morphusNightbaneBase'
import {
  formatMorphusPercentileBand,
  morphusForgeStateAfterPathChange,
  resolveMorphusForgeState,
  selectedAppearanceEntry,
} from '../../../lib/morphusForgeNavigation'
import type { MorphusForgePath } from '../../../types'
import { MorphusSlotPlanPreview } from './MorphusSlotPlanPreview'

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
  const selectedEntry = useMemo(() => selectedAppearanceEntry(state), [state])

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
              {MORPHUS_FORGE_MANIFEST.path2.description} Roll{' '}
              <strong>{MORPHUS_FORGE_MANIFEST.path2.countRoll.notation}</strong> on the Trait Forge
              tab (next step).
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
                  <button
                    type="button"
                    onClick={() => setAppearance(entry.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-950/50 text-emerald-50'
                        : 'border-violet-800 bg-slate-900/80 text-violet-100 hover:border-violet-500'
                    }`}
                  >
                    <span className="font-medium">{entry.name}</span>
                    <span className="shrink-0 font-mono text-xs text-violet-300">{band}%</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {selectedEntry ? <MorphusSlotPlanPreview entry={selectedEntry} /> : null}
        </section>
      ) : null}

      {state.path === 'characteristics' ? (
        <section className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-4 text-sm text-violet-100/90">
          <p>
            On the <strong>Trait Forge</strong> tab you will enter your physical{' '}
            <strong>{MORPHUS_FORGE_MANIFEST.path2.countRoll.notation}</strong> die result, then
            make that many direct Characteristics selections.
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-dashed border-violet-600/40 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-violet-400">
            Expert mode
          </span>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-full border border-violet-700 px-3 py-1 text-[10px] font-bold uppercase text-violet-500 opacity-60"
          >
            Coming soon
          </button>
        </div>
      </section>
    </div>
  )
}
