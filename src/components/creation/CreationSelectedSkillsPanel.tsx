import { useMemo, useState, type ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'
import {
  CREATION_SELECTED_SKILLS_SORTER_ALL,
  creationSelectedSkillMatchesSorter,
  listCreationSelectedSkillSorterOptions,
} from '../../lib/creationSelectedSkillsSorter'

import { SelectedOccCoreSkills } from './SelectedOccCoreSkills'
import { OccRelatedVoucherGroupPanel } from './OccRelatedVoucherGroupPanel'
import {
  CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,
  CREATION_VOUCHERS_LIBRARY_CATEGORY,
  type OccRelatedVoucherTask,
} from '../../lib/occRelatedSkillVouchers'

export type CreationSelectedSkillsPanelProps = {
  morphus: boolean
  panelStyle: string
  subStyle: string
  handToHandInputClass: string
  occSectionClass: string
  voucherSectionClass: string
  specializationSectionClass: string
  relatedSectionClass: string
  secondarySectionClass: string
  relatedCap: number
  relatedSlotsUsed: number
  specializationSlotsCap?: number
  specializationSlotsUsed?: number
  secondaryCap: number
  secondaryPickSlots: number
  relatedSelected: readonly CreationSkillPick[]
  secondarySelected: readonly CreationSkillPick[]
  /** All creation picks (OCC grants, vouchers, related, secondary) for sorter options. */
  allSelectedPicks: readonly CreationSkillPick[]
  specializationVoucherTasks?: readonly OccRelatedVoucherTask[]
  creationVoucherRelatedTasks?: readonly OccRelatedVoucherTask[]
  showVouchersSection?: boolean
  specializationVoucherPicks?: Readonly<Record<string, unknown>>
  specializationVoucherClusters?: Readonly<Record<string, string>>
  onSpecializationVoucherClearSlot?: (
    taskId: string,
    slot: number,
    choiceCount: number,
  ) => void
  onSpecializationVoucherClusterChange?: (
    voucherId: string,
    category: string,
  ) => void
  hasHandToHandOptions: boolean
  onEditOccPick: (pick: CreationSkillPick) => void
  renderOccSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  renderVoucherRow?: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  renderHandToHandRow: () => ReactNode
  renderSpecializationRow: (pick: CreationSkillPick) => ReactNode
  renderRelatedRow: (pick: CreationSkillPick) => ReactNode
  renderSecondaryRow: (pick: CreationSkillPick) => ReactNode
  shellMode?: boolean
}

export function CreationSelectedSkillsPanel({
  morphus,
  panelStyle,
  subStyle,
  handToHandInputClass,
  occSectionClass,
  voucherSectionClass,
  specializationSectionClass,
  relatedSectionClass,
  secondarySectionClass,
  relatedCap,
  relatedSlotsUsed,
  specializationSlotsCap = 0,
  specializationSlotsUsed = 0,
  secondaryCap,
  secondaryPickSlots,
  relatedSelected,
  secondarySelected,
  allSelectedPicks,
  specializationVoucherTasks = [],
  creationVoucherRelatedTasks = [],
  showVouchersSection = false,
  specializationVoucherPicks = {},
  specializationVoucherClusters = {},
  onSpecializationVoucherClearSlot,
  onSpecializationVoucherClusterChange,
  hasHandToHandOptions,
  onEditOccPick,
  renderOccSkillRow,
  renderVoucherRow,
  renderHandToHandRow,
  renderSpecializationRow,
  renderRelatedRow,
  renderSecondaryRow,
  shellMode = false,
}: CreationSelectedSkillsPanelProps) {
  const Wrapper = shellMode ? 'div' : 'aside'
  const [categoryFilter, setCategoryFilter] = useState(
    CREATION_SELECTED_SKILLS_SORTER_ALL,
  )

  const sorterOptions = useMemo(
    () => listCreationSelectedSkillSorterOptions(allSelectedPicks),
    [allSelectedPicks],
  )

  const activeFilter = sorterOptions.some((o) => o.value === categoryFilter)
    ? categoryFilter
    : CREATION_SELECTED_SKILLS_SORTER_ALL

  const filtering =
    activeFilter !== CREATION_SELECTED_SKILLS_SORTER_ALL

  const pickVisible = useMemo(() => {
    if (!filtering) return undefined
    return (pick: CreationSkillPick) =>
      creationSelectedSkillMatchesSorter(pick, activeFilter)
  }, [filtering, activeFilter])

  const relatedVisible = filtering
    ? relatedSelected.filter((pick) =>
        creationSelectedSkillMatchesSorter(pick, activeFilter),
      )
    : relatedSelected
  const secondaryVisible = filtering
    ? secondarySelected.filter((pick) =>
        creationSelectedSkillMatchesSorter(pick, activeFilter),
      )
    : secondarySelected

  const showHandToHand = hasHandToHandOptions && !filtering
  const showRelatedSection = !filtering || relatedVisible.length > 0 || showHandToHand
  const showSecondarySection =
    !filtering || secondaryVisible.length > 0

  const selectClass = morphus
    ? 'w-full rounded border border-violet-700 bg-slate-900 px-2 py-1 text-xs text-violet-100'
    : 'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900'

  return (
    <Wrapper
      className={
        shellMode
          ? 'flex h-full min-h-0 w-full flex-col'
          : `flex min-h-0 w-full shrink-0 flex-col border-t pt-4 lg:w-80 lg:border-t-0 lg:border-r lg:pr-4 lg:pt-0 xl:w-96 ${
              morphus
                ? 'border-violet-800'
                : 'border-slate-200 dark:border-slate-700'
            }`
      }
      aria-label="Selected skills panel"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${panelStyle}`}
      >
        <div
          className={`shrink-0 space-y-2 border-b px-3 py-2 ${
            morphus ? 'border-violet-800' : 'border-slate-200'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Selected skills
          </h3>
          <label className="block">
            <span className="sr-only">Filter by category</span>
            <select
              value={activeFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={selectClass}
              aria-label="Filter selected skills by category"
            >
              {sorterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain break-words p-3">
          <div>
            <p className={`mb-1 text-sm font-bold ${occSectionClass}`}>
              O.C.C. skills
            </p>
            <ul className="space-y-1">
              <SelectedOccCoreSkills
                subStyle={subStyle}
                inputClass={handToHandInputClass}
                morphus={morphus}
                onEditPick={onEditOccPick}
                renderOccSkillRow={renderOccSkillRow}
                pickVisible={pickVisible}
              />
            </ul>
          </div>

          {specializationVoucherTasks.length > 0 ? (
            <div>
              <p
                className={`mb-1 text-sm font-bold ${specializationSectionClass}`}
              >
                {CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY}{' '}
                {specializationSlotsCap > 0 ? (
                  <span className="tabular-nums">
                    {specializationSlotsUsed}/{specializationSlotsCap}
                  </span>
                ) : null}
              </p>
              <ul className="space-y-1">
                {specializationVoucherTasks.map((task) => (
                  <OccRelatedVoucherGroupPanel
                    key={task.id}
                    task={task}
                    voucherPicks={specializationVoucherPicks}
                    clusterSelections={specializationVoucherClusters}
                    morphus={morphus}
                    inputClass={handToHandInputClass}
                    renderSpecializationSkillRow={renderSpecializationRow}
                    onClearSlot={(slot) =>
                      onSpecializationVoucherClearSlot?.(
                        task.id,
                        slot,
                        task.entry.choiceCount,
                      )
                    }
                    onClusterChange={(voucherId, category) =>
                      onSpecializationVoucherClusterChange?.(
                        voucherId,
                        category,
                      )
                    }
                    pickVisible={pickVisible}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {showVouchersSection ? (
            <div>
              <p className={`mb-1 text-sm font-bold ${voucherSectionClass}`}>
                {CREATION_VOUCHERS_LIBRARY_CATEGORY}
              </p>
              <ul className="space-y-1">
                <SelectedOccCoreSkills
                  section="vouchers"
                  subStyle={subStyle}
                  inputClass={handToHandInputClass}
                  morphus={morphus}
                  onEditPick={onEditOccPick}
                  renderOccSkillRow={renderVoucherRow ?? renderOccSkillRow}
                  relatedVoucherTasks={creationVoucherRelatedTasks}
                  relatedVoucherPicks={specializationVoucherPicks}
                  relatedVoucherClusters={specializationVoucherClusters}
                  onRelatedVoucherClearSlot={onSpecializationVoucherClearSlot}
                  onRelatedVoucherClusterChange={
                    onSpecializationVoucherClusterChange
                  }
                  pickVisible={pickVisible}
                />
              </ul>
            </div>
          ) : null}

          {showRelatedSection ? (
            <div>
              <p className={`mb-1 text-sm font-bold ${relatedSectionClass}`}>
                O.C.C. Related{' '}
                {relatedCap > 0 ? (
                  <span className="tabular-nums">
                    {relatedSlotsUsed}/{relatedCap}
                  </span>
                ) : null}
              </p>
              <ul className="space-y-1">
                {showHandToHand ? renderHandToHandRow() : null}
                {relatedVisible.map((pick) => renderRelatedRow(pick))}
                {relatedVisible.length === 0 && !showHandToHand ? (
                  <li className="text-xs opacity-50">None selected.</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {showSecondarySection ? (
            <div>
              <p className={`mb-1 text-sm font-bold ${secondarySectionClass}`}>
                Secondary{' '}
                {secondaryCap > 0 ? (
                  <span className="tabular-nums">
                    {secondaryPickSlots}/{secondaryCap}
                  </span>
                ) : null}
              </p>
              <ul className="space-y-1">
                {secondaryVisible.map((pick) => renderSecondaryRow(pick))}
                {secondaryVisible.length === 0 ? (
                  <li className="text-xs opacity-50">None selected.</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Wrapper>
  )
}
