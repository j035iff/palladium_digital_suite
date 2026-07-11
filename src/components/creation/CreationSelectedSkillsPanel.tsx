import type { ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'

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
          className={`shrink-0 border-b px-3 py-2 ${
            morphus ? 'border-violet-800' : 'border-slate-200'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Selected skills
          </h3>
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
                />
              </ul>
            </div>
          ) : null}

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
              {renderHandToHandRow()}
              {relatedSelected.map((pick) => renderRelatedRow(pick))}
              {relatedSelected.length === 0 && !hasHandToHandOptions ? (
                <li className="text-xs opacity-50">None selected.</li>
              ) : null}
            </ul>
          </div>

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
              {secondarySelected.map((pick) => renderSecondaryRow(pick))}
              {secondarySelected.length === 0 ? (
                <li className="text-xs opacity-50">None selected.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}
