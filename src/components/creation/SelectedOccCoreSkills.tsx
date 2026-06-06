import { Fragment, useMemo, useState, type ReactNode } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import { getSkillById } from '../../data/library/skills'

import { listCreationSkillLibrary } from '../../lib/creationSkillCatalog'

import {
  formatOccCoreSkillEntry,
  isOccCoreSkillChoiceVoucher,
} from '../../lib/occComposition'

import {
  collectAllCreationSkillPicks,
  listOccCoreVoucherTasks,
  listEligibleVoucherSkillIds,
} from '../../lib/occCoreSkillVouchers'

import { occStartingOccSkillIds } from '../../lib/occCatalogEngine'

import {
  buildCreationSkillPick,
  isCreationSkillIdentityTaken,
  migrateSkillIdToPick,
  occGrantSelectionPlaceholder,
  getOccCoreVoucherSlotPicks,
  skillNeedsVoucherPickDialog,
  skillRequiresSpecialization,
  validateSpecializationInput,
} from '../../lib/creationSkillPicks'

import {
  SkillPickAddDialog,
  type SkillPickAddDialogState,
} from './SkillPickAddDialog'

import type { CreationSkillPick } from '../../types'

type PendingVoucherSlot = {
  taskId: string
  slot: number
  skillId: string
}

type SelectedOccCoreSkillsProps = {
  subStyle: string
  inputClass: string
  morphus: boolean
  onEditPick: (pick: CreationSkillPick) => void
  renderOccSkillRow: (
    pick: CreationSkillPick,
    onClear?: () => void,
  ) => ReactNode
}

export function SelectedOccCoreSkills({
  subStyle,
  inputClass,
  morphus,
  onEditPick,
  renderOccSkillRow,
}: SelectedOccCoreSkillsProps) {
  const {
    character,
    effectiveOcc,
    hostGenreId,
    setCreationOccCoreVoucherPick,
    setCreationOccGrantPickDetail,
  } = useCharacter()

  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const grantDetails = character.creationOccGrantPickDetails ?? {}

  const tasks = useMemo(
    () => listOccCoreVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const catalogIds = useMemo(
    () => listCreationSkillLibrary(hostGenreId).map((s) => s.id),
    [hostGenreId],
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

  const allCreationPicks = useMemo(
    () => collectAllCreationSkillPicks(character, effectiveOcc ?? undefined),
    [character, effectiveOcc],
  )

  const [pendingVoucherSlot, setPendingVoucherSlot] =
    useState<PendingVoucherSlot | null>(null)
  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({})
  const [voucherError, setVoucherError] = useState<string | null>(null)

  const pickDialog: SkillPickAddDialogState | null = pendingVoucherSlot
    ? {
        skillId: pendingVoucherSlot.skillId,
        variant: 'voucher',
        existingPicks: allCreationPicks,
      }
    : null

  function slotKey(taskId: string, slot: number) {
    return `${taskId}:${slot}`
  }

  function setVoucherSlotPick(
    taskId: string,
    slot: number,
    pick: CreationSkillPick | null,
    choiceCount: number,
  ) {
    const next = getOccCoreVoucherSlotPicks(voucherPicks, taskId, choiceCount)
    next[slot] = pick
    setCreationOccCoreVoucherPick(taskId, next)
  }

  function commitVoucherPick(
    taskId: string,
    slot: number,
    skillId: string,
    choiceCount: number,
    specialization?: string,
  ) {
    if (
      isCreationSkillIdentityTaken(allCreationPicks, skillId, specialization)
    ) {
      setVoucherError('This skill and type is already selected on this character.')
      return
    }
    setVoucherError(null)
    setVoucherSlotPick(
      taskId,
      slot,
      buildCreationSkillPick(skillId, { specialization }),
      choiceCount,
    )
    setSlotDrafts((prev) => ({ ...prev, [slotKey(taskId, slot)]: '' }))
  }

  function handleVoucherAdd(
    taskId: string,
    slot: number,
    skillId: string,
    choiceCount: number,
  ) {
    if (!skillId) return
    setVoucherError(null)
    if (skillNeedsVoucherPickDialog(skillId)) {
      setPendingVoucherSlot({ taskId, slot, skillId })
      return
    }
    commitVoucherPick(taskId, slot, skillId, choiceCount)
  }

  function handleVoucherClear(
    taskId: string,
    slot: number,
    choiceCount: number,
  ) {
    setVoucherError(null)
    setVoucherSlotPick(taskId, slot, null, choiceCount)
    setSlotDrafts((prev) => ({ ...prev, [slotKey(taskId, slot)]: '' }))
  }

  function handleGrantClear(skillId: string) {
    setCreationOccGrantPickDetail(skillId, null)
  }

  function handleVoucherDialogConfirm(result: {
    specialization?: string
    professionalQuality: boolean
  }) {
    if (!pendingVoucherSlot) return
    const { taskId, slot, skillId } = pendingVoucherSlot
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    commitVoucherPick(
      taskId,
      slot,
      skillId,
      task.entry.choiceCount,
      result.specialization,
    )
    setPendingVoucherSlot(null)
  }

  const hasContent =
    fixedGrantIds.length > 0 ||
    parameterizedGrantIds.length > 0 ||
    tasks.length > 0

  if (!hasContent) {
    return <li className="text-xs opacity-50">None yet.</li>
  }

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
          return renderOccSkillRow(locked, () => handleGrantClear(skillId))
        }

        const stubPick: CreationSkillPick = {
          instanceId: skillId,
          skillId,
        }

        return (
          <li
            key={`grant-${skillId}`}
            className={`rounded border px-2 py-1.5 text-sm ${subStyle}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{def?.name ?? skillId}</p>
                <p className="text-xs italic opacity-60">
                  {occGrantSelectionPlaceholder(skillId)}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs text-violet-500 hover:underline"
                onClick={() => onEditPick(stubPick)}
              >
                Edit
              </button>
            </div>
          </li>
        )
      })}

      {tasks.map((task) => {
        const entry = task.entry
        const label = isOccCoreSkillChoiceVoucher(entry)
          ? formatOccCoreSkillEntry(entry)
          : task.id
        const eligible = listEligibleVoucherSkillIds(
          entry,
          hostGenreId,
          catalogIds,
        )
        const slotPicks = getOccCoreVoucherSlotPicks(
          voucherPicks,
          task.id,
          entry.choiceCount,
        )
        const slots = Array.from({ length: entry.choiceCount }, (_, i) => i)

        return slots.map((slot) => {
          const pick = slotPicks[slot]
          const draft = slotDrafts[slotKey(task.id, slot)] ?? ''
          const slotLabel =
            entry.choiceCount > 1 ? `${label} · Pick ${slot + 1}` : label

          if (pick) {
            return (
              <Fragment key={`${task.id}-${slot}`}>
                {renderOccSkillRow(pick, () =>
                  handleVoucherClear(task.id, slot, entry.choiceCount),
                )}
              </Fragment>
            )
          }

          return (
            <li
              key={`${task.id}-${slot}`}
              className={`rounded border px-2 py-1.5 text-sm ${subStyle}`}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium opacity-80">{slotLabel}</p>
                <select
                  value={draft}
                  onChange={(e) => {
                    setVoucherError(null)
                    setSlotDrafts((prev) => ({
                      ...prev,
                      [slotKey(task.id, slot)]: e.target.value,
                    }))
                  }}
                  className={`w-full max-w-md rounded border px-2 py-1.5 text-sm ${inputClass}`}
                >
                  <option value="">— select —</option>
                  {eligible.map((id) => (
                    <option key={id} value={id}>
                      {getSkillById(id)?.name ?? id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!draft}
                  className="w-fit rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    handleVoucherAdd(
                      task.id,
                      slot,
                      draft,
                      entry.choiceCount,
                    )
                  }
                >
                  Add
                </button>
                {eligible.length === 0 ? (
                  <p className="text-xs text-amber-600">
                    No eligible skills in catalog for this voucher.
                  </p>
                ) : null}
              </div>
            </li>
          )
        })
      })}

      {voucherError ? (
        <li className="text-sm font-semibold text-rose-500">{voucherError}</li>
      ) : null}

      <SkillPickAddDialog
        state={pickDialog}
        morphus={morphus}
        onCancel={() => setPendingVoucherSlot(null)}
        onConfirm={(result) => handleVoucherDialogConfirm(result)}
      />
    </>
  )
}
