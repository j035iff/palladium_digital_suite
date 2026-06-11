import type { MorphusForgeRoutingEntry, MorphusForgeSlotRequirement } from '../../../types'

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

export function MorphusSlotPlanPreview({ entry }: { entry: MorphusForgeRoutingEntry }) {
  return (
    <div className="rounded-lg border border-violet-600/50 bg-violet-950/30 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-violet-200">
        Slot plan — {entry.name}
      </h3>
      <p className="mt-1 text-xs text-violet-300/80">
        Resolved on the Trait Forge tab (coming next). No dice rolls — you will pick from listed
        options.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-violet-100">
        {entry.slotPlan.map((slot, i) => (
          <li key={`${entry.id}-slot-${i}`}>{describeSlot(slot)}</li>
        ))}
      </ol>
    </div>
  )
}
