import type { MorphusForgeRoutingEntry, MorphusForgeSlotRequirement } from '../../../types'
import { formatMorphusSlotPlanRoute } from '../../../lib/morphusTraitPickDisplay'

function describeSlot(slot: MorphusForgeSlotRequirement): string {
  switch (slot.kind) {
    case 'required':
      return slot.label ?? slot.tableId
    case 'choice':
      return (
        slot.label ??
        slot.options.map((o) => o.label ?? o.tableId).join(' OR ')
      )
    case 'repeat':
      return `${slot.count}× ${slot.label ?? slot.tableId}`
    case 'combination_pool':
      return `${slot.countRoll.notation} picks from pool (${slot.pool.map((p) => p.label ?? p.tableId).join(', ')})`
    case 'characteristics_multiplier':
      return `${slot.count}× Characteristics (reroll above ${slot.rerollAbovePercentile}%)`
    default:
      return 'Unknown slot'
  }
}

type MorphusSlotPlanPreviewProps = {
  entry: MorphusForgeRoutingEntry
  /** Nested under a selected list option (Crossroads accordion). */
  variant?: 'standalone' | 'inline'
}

export function MorphusSlotPlanPreview({
  entry,
  variant = 'standalone',
}: MorphusSlotPlanPreviewProps) {
  const inline = variant === 'inline'

  return (
    <div
      className={
        inline
          ? 'border-t border-emerald-600/70 bg-slate-950 px-3 py-3'
          : 'rounded-lg border border-violet-600/50 bg-violet-950/30 p-4'
      }
    >
      <h3
        className={`text-sm font-bold uppercase tracking-wide ${
          inline ? 'text-emerald-300' : 'text-violet-200'
        }`}
      >
        {inline ? 'Slot plan' : `Slot plan — ${entry.name}`}
      </h3>
      <p
        className={`mt-1 text-xs font-medium ${
          inline ? 'text-amber-300' : 'text-amber-200/90'
        }`}
      >
        {formatMorphusSlotPlanRoute(entry.slotPlan)}
      </p>
      <p
        className={`mt-1 text-xs ${inline ? 'text-violet-200' : 'text-violet-300/80'}`}
      >
        Resolved on the Trait Forge tab. No dice rolls — you will pick from listed options.
      </p>
      <ol
        className={`mt-3 list-decimal space-y-1 pl-5 text-sm ${
          inline ? 'text-violet-50' : 'text-violet-100'
        }`}
      >
        {entry.slotPlan.map((slot, i) => (
          <li key={`${entry.id}-slot-${i}`}>{describeSlot(slot)}</li>
        ))}
      </ol>
    </div>
  )
}
