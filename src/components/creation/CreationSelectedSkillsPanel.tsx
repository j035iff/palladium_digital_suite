import type { ReactNode } from 'react'

import type { CreationSkillPick } from '../../types'

import { SelectedOccCoreSkills } from './SelectedOccCoreSkills'

export type CreationSelectedSkillsPanelProps = {
  morphus: boolean
  panelStyle: string
  subStyle: string
  handToHandInputClass: string
  occSectionClass: string
  relatedSectionClass: string
  secondarySectionClass: string
  relatedCap: number
  relatedSlotsUsed: number
  secondaryCap: number
  secondaryPickSlots: number
  relatedSelected: readonly CreationSkillPick[]
  secondarySelected: readonly CreationSkillPick[]
  hasHandToHandOptions: boolean
  onEditOccPick: (pick: CreationSkillPick) => void
  renderOccSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  renderHandToHandRow: () => ReactNode
  renderRelatedRow: (pick: CreationSkillPick) => ReactNode
  renderSecondaryRow: (pick: CreationSkillPick) => ReactNode
}

export function CreationSelectedSkillsPanel({
  morphus,
  panelStyle,
  subStyle,
  handToHandInputClass,
  occSectionClass,
  relatedSectionClass,
  secondarySectionClass,
  relatedCap,
  relatedSlotsUsed,
  secondaryCap,
  secondaryPickSlots,
  relatedSelected,
  secondarySelected,
  hasHandToHandOptions,
  onEditOccPick,
  renderOccSkillRow,
  renderHandToHandRow,
  renderRelatedRow,
  renderSecondaryRow,
}: CreationSelectedSkillsPanelProps) {
  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col border-t pt-4 lg:w-80 lg:border-t-0 lg:border-r lg:pr-4 lg:pt-0 xl:w-96 ${
        morphus
          ? 'border-violet-800'
          : 'border-slate-200 dark:border-slate-700'
      }`}
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
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
    </aside>
  )
}
