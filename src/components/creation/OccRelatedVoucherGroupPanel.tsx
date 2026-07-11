import type { ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'
import type { OccRelatedVoucherTask } from '../../lib/occRelatedSkillVouchers'
import {
  countFilledRelatedVoucherSlots,
  formatRelatedVoucherHeader,
  getRelatedVoucherSlotPicks,
  relatedVoucherNeedsClusterSelection,
} from '../../lib/occRelatedSkillVouchers'
import { occCategoryRuleToneClass } from '../../lib/occCategoryRuleDisplay'

export type OccRelatedVoucherPanelVariant = 'vocational_focus' | 'creation_voucher'

export function OccRelatedVoucherGroupPanel({
  task,
  voucherPicks,
  clusterSelections,
  morphus,
  inputClass,
  variant = 'vocational_focus',
  voucherLabel,
  scopeWithProgress,
  libraryHint,
  renderSpecializationSkillRow,
  onClearSlot,
  onClusterChange,
}: {
  task: OccRelatedVoucherTask
  voucherPicks: Readonly<Record<string, unknown>>
  clusterSelections: Readonly<Record<string, string>>
  morphus: boolean
  inputClass: string
  variant?: OccRelatedVoucherPanelVariant
  voucherLabel?: string
  scopeWithProgress?: string
  libraryHint?: string
  renderSpecializationSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  onClearSlot: (slot: number) => void
  onClusterChange: (voucherId: string, category: string) => void
}) {
  const { entry } = task
  const slots = getRelatedVoucherSlotPicks(
    voucherPicks,
    task.id,
    entry.choiceCount,
  )
  const filledCount = countFilledRelatedVoucherSlots(task, voucherPicks)
  const selectedCluster = clusterSelections[task.id]
  const needsCluster = relatedVoucherNeedsClusterSelection(
    entry,
    clusterSelections,
    task.id,
  )
  const header =
    scopeWithProgress ??
    formatRelatedVoucherHeader(entry, filledCount, selectedCluster)
  const isCreationVoucher = variant === 'creation_voucher'
  const borderTone = isCreationVoucher
    ? morphus
      ? 'border-amber-800'
      : 'border-amber-200'
    : morphus
      ? 'border-sky-700'
      : 'border-sky-200'
  const surfaceTone = isCreationVoucher
    ? morphus
      ? 'border-amber-700 bg-slate-900/60'
      : 'border-amber-200 bg-amber-50/80'
    : morphus
      ? 'border-sky-700 bg-slate-900/60'
      : 'border-sky-200 bg-sky-50/80'
  const titleTone = isCreationVoucher
    ? morphus
      ? 'text-amber-300'
      : 'text-amber-950'
    : morphus
      ? 'text-sky-200'
      : 'text-sky-900'
  const subtitleTone = isCreationVoucher
    ? morphus
      ? 'text-amber-200/90'
      : 'text-amber-900/90'
    : morphus
      ? 'text-sky-200'
      : 'text-sky-900'
  const defaultLibraryHint = isCreationVoucher
    ? needsCluster
      ? 'Choose a category, then pick skills from the matching library category.'
      : voucherLabel
        ? `Choose skills from the matching library category with ${voucherLabel}.`
        : 'Choose skills from the matching library category with + Voucher.'
    : needsCluster
      ? 'Choose a vocational focus category, then pick skills from the library with + Vocational Focus.'
      : 'Choose skills from the library with + Vocational Focus.'

  return (
    <li className={`rounded-md border text-sm ${surfaceTone}`}>
      <div
        className={`border-b px-2 py-1.5 ${borderTone}`}
      >
        {voucherLabel ? (
          <p className={`text-sm font-bold leading-snug ${titleTone}`}>
            {voucherLabel}
          </p>
        ) : (
          <p className={`min-w-0 text-sm font-bold leading-snug ${titleTone}`}>
            {entry.label?.trim() || header}
            {entry.clusterBonusPercent != null && entry.clusterBonusPercent !== 0 ? (
              <span
                className={`font-medium ${occCategoryRuleToneClass('bonus', morphus)}`}
              >
                {' '}
                (+{entry.clusterBonusPercent}%)
              </span>
            ) : null}
          </p>
        )}
        {voucherLabel ? (
          <p className={`min-w-0 text-sm leading-snug ${subtitleTone}`}>
            {header}
            {!scopeWithProgress &&
            entry.clusterBonusPercent != null &&
            entry.clusterBonusPercent !== 0 ? (
              <span
                className={`font-medium ${occCategoryRuleToneClass('bonus', morphus)}`}
              >
                {' '}
                (+{entry.clusterBonusPercent}%)
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {entry.clusterCategoryOptions?.length ? (
        <div className="border-b px-2 py-2">
          <label className="mb-1 block text-xs font-semibold uppercase opacity-70">
            Specialty category
          </label>
          <select
            value={selectedCluster ?? ''}
            onChange={(e) => onClusterChange(task.id, e.target.value)}
            className={`w-full rounded border px-2 py-1.5 text-sm ${inputClass}`}
          >
            <option value="">Choose category first…</option>
            {entry.clusterCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {needsCluster ? (
            <p className="mt-1 text-xs opacity-60">
              Select a category before adding skills.
            </p>
          ) : null}
        </div>
      ) : null}

      {slots.some((pick) => pick != null) ? (
        <ul className="space-y-1 p-2">
          {slots.map((pick, slot) =>
            pick ? (
              <li key={`${task.id}-${slot}`} className="list-none">
                {renderSpecializationSkillRow(pick, () => onClearSlot(slot))}
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="px-2 py-2 text-xs opacity-60">
          {libraryHint ?? defaultLibraryHint}
        </p>
      )}
    </li>
  )
}
