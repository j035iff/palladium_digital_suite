import { MORPHUS_FORGE_MANIFEST } from '../../../data/library/morphusForgeRoutingLoader'
import {
  resolveMorphusForgeState,
  selectedAppearanceEntry,
} from '../../../lib/morphusForgeNavigation'
import { MorphusSlotResolutionPanel } from './MorphusSlotResolutionPanel'
import { MORPHUS_FORGE_FIELD_CLASS } from './MorphusTraitPickCard'

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
      <div className="space-y-6">
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
            className={`mt-1 ${MORPHUS_FORGE_FIELD_CLASS} text-center text-lg font-bold tabular-nums ${
              invalid
                ? 'border-rose-500/90'
                : value != null && value >= min && value <= max
                  ? 'border-emerald-500/90'
                  : ''
            }`}
          />
          <span className="mt-1 block text-xs text-violet-400">
            Valid range: {min}–{max} (sum of one d4 + 2)
          </span>
        </label>
        {value != null && value >= min && value <= max ? (
          <MorphusSlotResolutionPanel morphusForgeState={state} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-200/90">
        Resolve trait slots for <strong>{appearanceEntry?.name ?? 'your archetype'}</strong>.
        Pick from each list — no d100 entry required.
      </p>
      <MorphusSlotResolutionPanel morphusForgeState={state} />
    </div>
  )
}
