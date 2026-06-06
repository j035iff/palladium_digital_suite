import type { ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'
import type { OccCoreVoucherTask } from '../../lib/occCoreSkillVouchers'
import {
  countFilledOccCoreVoucherSlots,
  formatOccCoreVoucherCategoryScope,
} from '../../lib/occCoreSkillVouchers'
import { getOccCoreVoucherSlotPicks } from '../../lib/creationSkillPicks'
import { occCategoryRuleToneClass } from '../../lib/occCategoryRuleDisplay'

export function OccCoreVoucherGroupPanel({
  task,
  voucherPicks,
  morphus,
  renderOccSkillRow,
  onClearSlot,
}: {
  task: OccCoreVoucherTask
  voucherPicks: Readonly<Record<string, unknown>>
  morphus: boolean
  renderOccSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  onClearSlot: (slot: number) => void
}) {
  const slots = getOccCoreVoucherSlotPicks(
    voucherPicks,
    task.id,
    task.entry.choiceCount,
  )
  const filled = slots.filter((pick): pick is CreationSkillPick => pick != null)
  const filledCount = countFilledOccCoreVoucherSlots(task, voucherPicks)
  const scope = formatOccCoreVoucherCategoryScope(task.entry)

  return (
    <li
      className={`rounded-md border text-sm ${
        morphus
          ? 'border-violet-700 bg-slate-900/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`flex items-baseline justify-between gap-2 border-b px-2 py-1.5 ${
          morphus ? 'border-violet-800' : 'border-slate-200'
        }`}
      >
        <p
          className={`min-w-0 text-sm font-bold leading-snug ${
            morphus ? 'text-amber-300' : 'text-amber-950'
          }`}
        >
          {scope}
          {task.entry.bonusPercent != null && task.entry.bonusPercent !== 0 ? (
            <span
              className={`font-medium ${occCategoryRuleToneClass('bonus', morphus)}`}
            >
              {' '}
              (+{task.entry.bonusPercent}%)
            </span>
          ) : null}
        </p>
        <span
          className={`shrink-0 text-sm font-bold tabular-nums ${
            morphus ? 'text-amber-300' : 'text-amber-950'
          }`}
        >
          {filledCount}/{task.entry.choiceCount}
        </span>
      </div>

      {filled.length > 0 ? (
        <ul className="space-y-1 p-2">
          {slots.map((pick, slot) =>
            pick ? (
              <li key={`${task.id}-${slot}`} className="list-none">
                {renderOccSkillRow(pick, () => onClearSlot(slot))}
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="px-2 py-2 text-xs opacity-60">
          Choose skills from the library with + O.C.C.
        </p>
      )}
    </li>
  )
}
