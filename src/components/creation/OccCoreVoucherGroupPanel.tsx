import type { ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'
import type { OccCoreVoucherTask } from '../../lib/occCoreSkillVouchers'
import { countFilledOccCoreVoucherSlots } from '../../lib/occCoreSkillVouchers'
import { getOccCoreVoucherSlotPicks } from '../../lib/creationSkillPicks'
import { occCategoryRuleToneClass } from '../../lib/occCategoryRuleDisplay'

export function OccCoreVoucherGroupPanel({
  task,
  voucherPicks,
  morphus,
  voucherLabel,
  scopeWithProgress,
  libraryHint,
  renderOccSkillRow,
  onClearSlot,
}: {
  task: OccCoreVoucherTask
  voucherPicks: Readonly<Record<string, unknown>>
  morphus: boolean
  voucherLabel?: string
  scopeWithProgress?: string
  libraryHint?: string
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

  return (
    <li
      className={`rounded-md border text-sm ${
        morphus
          ? 'border-violet-700 bg-slate-900/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`border-b px-2 py-1.5 ${
          morphus ? 'border-violet-800' : 'border-slate-200'
        }`}
      >
        {voucherLabel ? (
          <p
            className={`text-sm font-bold leading-snug ${
              morphus ? 'text-amber-300' : 'text-amber-950'
            }`}
          >
            {voucherLabel}
          </p>
        ) : null}
        <p
          className={`min-w-0 text-sm leading-snug ${
            voucherLabel
              ? morphus
                ? 'text-amber-200/90'
                : 'text-amber-900/90'
              : morphus
                ? 'text-amber-300 font-bold'
                : 'text-amber-950 font-bold'
          }`}
        >
          {scopeWithProgress ?? `${filledCount}/${task.entry.choiceCount}`}
          {!scopeWithProgress &&
          task.entry.bonusPercent != null &&
          task.entry.bonusPercent !== 0 ? (
            <span
              className={`font-medium ${occCategoryRuleToneClass('bonus', morphus)}`}
            >
              {' '}
              (+{task.entry.bonusPercent}%)
            </span>
          ) : null}
        </p>
        {!voucherLabel && !scopeWithProgress ? (
          <span
            className={`shrink-0 text-sm font-bold tabular-nums ${
              morphus ? 'text-amber-300' : 'text-amber-950'
            }`}
          >
            {filledCount}/{task.entry.choiceCount}
          </span>
        ) : null}
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
          {libraryHint ?? 'Choose skills from the library with + Voucher.'}
        </p>
      )}
    </li>
  )
}
