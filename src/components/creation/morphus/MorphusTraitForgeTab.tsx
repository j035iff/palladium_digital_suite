import { MORPHUS_FORGE_MANIFEST } from '../../../data/library/morphusForgeRoutingLoader'
import {
  resolveMorphusForgeState,
  selectedAppearanceEntry,
} from '../../../lib/morphusForgeNavigation'
import { MorphusSlotPlanPreview } from './MorphusSlotPlanPreview'

type Props = {
  morphusForgeState: ReturnType<typeof resolveMorphusForgeState>
  onSetCharacteristicsCount: (count: number | undefined) => void
}

export function MorphusTraitForgeTab({
  morphusForgeState,
  onSetCharacteristicsCount,
}: Props) {
  const state = morphusForgeState
  const { min, max, notation } = MORPHUS_FORGE_MANIFEST.path2.countRoll
  const appearanceEntry = selectedAppearanceEntry(state)

  if (!state.path) {
    return (
      <p className="text-sm text-amber-200" role="alert">
        Complete the Crossroads tab first — choose Path 1 or Path 2.
      </p>
    )
  }

  if (state.path === 'characteristics') {
    const value = state.characteristicsPickCount
    const invalid =
      value != null && (value < min || value > max || !Number.isFinite(value))

    return (
      <div className="space-y-4">
        <p className="max-w-2xl text-sm text-violet-100/90">
          {MORPHUS_FORGE_MANIFEST.path2.description}
        </p>
        <label className="block max-w-xs">
          <span className="text-xs font-bold uppercase tracking-wide text-violet-300">
            Physical {notation} result
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                onSetCharacteristicsCount(undefined)
                return
              }
              const n = Number.parseInt(raw, 10)
              onSetCharacteristicsCount(Number.isFinite(n) ? n : undefined)
            }}
            className={`mt-1 w-full rounded-lg border-2 px-3 py-2 text-center font-mono text-lg font-bold tabular-nums ${
              invalid
                ? 'border-rose-500 text-rose-100'
                : value != null && value >= min && value <= max
                  ? 'border-emerald-500 text-emerald-50'
                  : 'border-violet-500 text-violet-50'
            }`}
          />
          <span className="mt-1 block text-xs text-violet-400">
            Valid range: {min}–{max} (sum of one d4 + 2)
          </span>
        </label>
        {value != null && value >= min && value <= max ? (
          <p className="rounded-lg border border-violet-700/50 bg-violet-950/30 px-3 py-2 text-sm text-violet-100">
            <strong>{value}</strong> Characteristics selection slots will be generated here in a
            future build. For now, continue to Review to roll Morphus vitality dice.
          </p>
        ) : null}
        <section className="rounded-lg border border-dashed border-violet-600/40 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-violet-400">
              Expert mode
            </span>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-violet-700 px-3 py-1 text-[10px] font-bold uppercase text-violet-500 opacity-60"
            >
              Coming soon
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-200/90">
        Trait resolution for <strong>{appearanceEntry?.name ?? 'your archetype'}</strong> is stubbed
        in this build. The slot plan below shows what the engine will require — pick-only, no d100
        entry.
      </p>
      {appearanceEntry ? <MorphusSlotPlanPreview entry={appearanceEntry} /> : null}
      <MorphusCustomTraitSlotsStub />
      <section className="rounded-lg border border-dashed border-violet-600/40 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-violet-400">
            Guided wizard / Expert mode
          </span>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border border-violet-700 px-3 py-1 text-[10px] font-bold uppercase text-violet-500 opacity-60"
          >
            Expert — coming soon
          </button>
        </div>
      </section>
    </div>
  )
}

function MorphusCustomTraitSlotsStub() {
  return (
    <p className="text-xs text-violet-400/90">
      Custom trait workshop and router auto-spawn slots remain available on the Review tab.
    </p>
  )
}
