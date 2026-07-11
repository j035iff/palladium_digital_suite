import { Fragment, useMemo, type ReactNode } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import { getSkillById } from '../../data/library/skills'

import {
  collectAllCreationSkillPicks,
  listOccCoreVoucherTasks,
} from '../../lib/occCoreSkillVouchers'

import {
  creationVoucherDisplayName,
  formatCreationVoucherScopeWithProgress,
  listCreationVoucherTaskRefs,
  resolveCreationVoucherDisplayNumber,
} from '../../lib/creationVoucherSlots'

import { occStartingOccSkillIds } from '../../lib/occCatalogEngine'

import {
  migrateSkillIdToPick,
  occGrantSelectionPlaceholder,
  getOccCoreVoucherSlotPicks,
  skillRequiresSpecialization,
  validateSpecializationInput,
} from '../../lib/creationSkillPicks'

import type { CreationSkillPick } from '../../types'

import { OccCoreVoucherGroupPanel } from './OccCoreVoucherGroupPanel'
import { OccRelatedVoucherGroupPanel } from './OccRelatedVoucherGroupPanel'
import type { OccRelatedVoucherTask } from '../../lib/occRelatedSkillVouchers'

type SelectedOccCoreSkillsProps = {
  section?: 'grants' | 'vouchers'
  subStyle: string
  inputClass: string
  morphus: boolean
  onEditPick: (pick: CreationSkillPick) => void
  renderOccSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
  relatedVoucherTasks?: readonly OccRelatedVoucherTask[]
  relatedVoucherPicks?: Readonly<Record<string, unknown>>
  relatedVoucherClusters?: Readonly<Record<string, string>>
  onRelatedVoucherClearSlot?: (
    taskId: string,
    slot: number,
    choiceCount: number,
  ) => void
  onRelatedVoucherClusterChange?: (
    voucherId: string,
    category: string,
  ) => void
}

export function SelectedOccCoreSkills({
  section = 'grants',
  subStyle,
  inputClass,
  morphus,
  onEditPick,
  renderOccSkillRow,
  relatedVoucherTasks = [],
  relatedVoucherPicks = {},
  relatedVoucherClusters = {},
  onRelatedVoucherClearSlot,
  onRelatedVoucherClusterChange,
}: SelectedOccCoreSkillsProps) {
  const { character, effectiveOcc, setCreationOccCoreVoucherPick } =
    useCharacter()

  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const grantDetails = character.creationOccGrantPickDetails ?? {}

  const tasks = useMemo(
    () => listOccCoreVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const creationVoucherRefs = useMemo(
    () => listCreationVoucherTaskRefs(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const fixedGrantIds = useMemo(() => {
    if (!effectiveOcc) return []
    return occStartingOccSkillIds(effectiveOcc, character.occSpecializationId).filter(
      (id) => !skillRequiresSpecialization(id),
    )
  }, [effectiveOcc, character.occSpecializationId])

  const parameterizedGrantIds = useMemo(() => {
    if (!effectiveOcc) return []
    return occStartingOccSkillIds(effectiveOcc, character.occSpecializationId).filter(
      skillRequiresSpecialization,
    )
  }, [effectiveOcc, character.occSpecializationId])

  function handleVoucherClear(
    taskId: string,
    slot: number,
    choiceCount: number,
  ) {
    const next = getOccCoreVoucherSlotPicks(voucherPicks, taskId, choiceCount)
    next[slot] = null
    setCreationOccCoreVoucherPick(taskId, next)
  }

  const hasGrantContent =
    fixedGrantIds.length > 0 || parameterizedGrantIds.length > 0
  const hasVoucherContent =
    tasks.length > 0 || relatedVoucherTasks.length > 0

  if (section === 'grants') {
    if (!hasGrantContent) {
      return <li className="text-xs opacity-50">None yet.</li>
    }
  } else if (!hasVoucherContent) {
    return <li className="text-xs opacity-50">None yet.</li>
  }

  if (section === 'grants') {
    return (
      <>
        {fixedGrantIds.map((skillId) => {
          const pick =
            grantDetails[skillId] ?? migrateSkillIdToPick(skillId)
          return (
            <Fragment key={`fixed-${skillId}`}>
              {renderOccSkillRow(pick)}
            </Fragment>
          )
        })}

        {parameterizedGrantIds.map((skillId) => {
          const def = getSkillById(skillId)
          const locked = grantDetails[skillId]
          const isComplete =
            locked != null &&
            validateSpecializationInput(locked.specialization ?? '')

          if (isComplete && locked) {
            return renderOccSkillRow(locked)
          }

          const stubPick: CreationSkillPick = {
            instanceId: skillId,
            skillId,
          }
          const placeholder = occGrantSelectionPlaceholder(skillId)

          return (
            <li
              key={`grant-${skillId}`}
              className={`rounded border px-2 py-1.5 text-sm ${subStyle}`}
            >
              <div className="min-w-0">
                <p className="font-medium">{def?.name ?? skillId}</p>
                <button
                  type="button"
                  className={`mt-0.5 text-xs italic hover:underline ${
                    morphus ? 'text-amber-300' : 'text-amber-950'
                  }`}
                  onClick={() => onEditPick(stubPick)}
                >
                  {placeholder}
                </button>
              </div>
            </li>
          )
        })}
      </>
    )
  }

  return (
    <>
      {tasks.map((task) => {
        const displayNumber = resolveCreationVoucherDisplayNumber(
          task.id,
          creationVoucherRefs,
        )
        const voucherLabel =
          displayNumber != null
            ? creationVoucherDisplayName(displayNumber)
            : undefined
        const ref = creationVoucherRefs.find(
          (item) => item.kind === 'occ_core' && item.task.id === task.id,
        )
        const scopeWithProgress =
          ref != null
            ? formatCreationVoucherScopeWithProgress(
                ref,
                voucherPicks,
                relatedVoucherPicks,
                relatedVoucherClusters,
              )
            : undefined
        return (
          <OccCoreVoucherGroupPanel
            key={task.id}
            task={task}
            voucherPicks={voucherPicks}
            morphus={morphus}
            voucherLabel={voucherLabel}
            scopeWithProgress={scopeWithProgress}
            libraryHint={
              voucherLabel
                ? `Choose skills from the matching library category with ${voucherLabel}.`
                : undefined
            }
            renderOccSkillRow={renderOccSkillRow}
            onClearSlot={(slot) =>
              handleVoucherClear(task.id, slot, task.entry.choiceCount)
            }
          />
        )
      })}

      {relatedVoucherTasks.map((task) => {
        const displayNumber = resolveCreationVoucherDisplayNumber(
          task.id,
          creationVoucherRefs,
        )
        const voucherLabel =
          displayNumber != null
            ? creationVoucherDisplayName(displayNumber)
            : undefined
        const ref = creationVoucherRefs.find(
          (item) => item.kind === 'related' && item.task.id === task.id,
        )
        const scopeWithProgress =
          ref != null
            ? formatCreationVoucherScopeWithProgress(
                ref,
                voucherPicks,
                relatedVoucherPicks,
                relatedVoucherClusters,
              )
            : undefined
        return (
          <OccRelatedVoucherGroupPanel
            key={task.id}
            task={task}
            voucherPicks={relatedVoucherPicks}
            clusterSelections={relatedVoucherClusters}
            morphus={morphus}
            inputClass={inputClass}
            variant="creation_voucher"
            voucherLabel={voucherLabel}
            scopeWithProgress={scopeWithProgress}
            libraryHint={
              voucherLabel
                ? `Choose skills from the matching library category with ${voucherLabel}.`
                : undefined
            }
            renderSpecializationSkillRow={renderOccSkillRow}
            onClearSlot={(slot) =>
              onRelatedVoucherClearSlot?.(
                task.id,
                slot,
                task.entry.choiceCount,
              )
            }
            onClusterChange={(voucherId, category) =>
              onRelatedVoucherClusterChange?.(voucherId, category)
            }
          />
        )
      })}
    </>
  )
}
