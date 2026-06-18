import { Fragment, useMemo, useState, type ReactNode } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import { getSkillById } from '../../data/library/skills'

import {
  filterSkillIdsByWeaponProficiencyEra,
  listCreationSkillLibrary,
  type WeaponProficiencyEra,
} from '../../lib/creationSkillCatalog'

import {
  formatOccCoreSkillEntry,
  isOccCoreSkillChoiceVoucher,
} from '../../lib/occComposition'

import {
  collectAllCreationSkillPicks,
  listOccCoreVoucherTasks,
  listEligibleVoucherSkillIds,
  resolveVoucherWeaponProficiencyEra,
  voucherUsesDedicatedPickerUi,
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

import { OccCoreVoucherGroupPanel } from './OccCoreVoucherGroupPanel'

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
  const forbiddenWpIds = effectiveOcc?.wpRules?.forbiddenWps ?? []

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
  const [wpEraDrafts, setWpEraDrafts] = useState<
    Record<string, WeaponProficiencyEra>
  >({})
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

  const libraryVoucherTasks = tasks.filter(
    (task) => !voucherUsesDedicatedPickerUi(task.entry),
  )
  const dedicatedPickerVoucherTasks = tasks.filter((task) =>
    voucherUsesDedicatedPickerUi(task.entry),
  )

  return (
    <>
      {libraryVoucherTasks.map((task) => (
        <OccCoreVoucherGroupPanel
          key={task.id}
          task={task}
          voucherPicks={voucherPicks}
          morphus={morphus}
          renderOccSkillRow={renderOccSkillRow}
          onClearSlot={(slot) =>
            handleVoucherClear(task.id, slot, task.entry.choiceCount)
          }
        />
      ))}

      {dedicatedPickerVoucherTasks
        .map((task) => {
          const entry = task.entry
          const label = isOccCoreSkillChoiceVoucher(entry)
            ? formatOccCoreSkillEntry(entry)
            : task.id
          const eligible = listEligibleVoucherSkillIds(
            entry,
            hostGenreId,
            catalogIds,
            forbiddenWpIds,
          )
          const slotPicks = getOccCoreVoucherSlotPicks(
            voucherPicks,
            task.id,
            entry.choiceCount,
          )
          const slots = Array.from({ length: entry.choiceCount }, (_, i) => i)

          return slots.map((slot) => {
            const pick = slotPicks[slot]
            const key = slotKey(task.id, slot)
            const draft = slotDrafts[key] ?? ''
            const lockedEra = resolveVoucherWeaponProficiencyEra(entry)
            const wpEra = lockedEra ?? wpEraDrafts[key] ?? 'ancient'
            const eraEligible = lockedEra
              ? eligible
              : filterSkillIdsByWeaponProficiencyEra(eligible, wpEra)
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
                  {lockedEra ? (
                    <p className="text-xs font-medium opacity-80">
                      Era: {lockedEra === 'ancient' ? 'Ancient' : 'Modern'}{' '}
                      <span className="font-normal opacity-70">
                        (required by O.C.C.)
                      </span>
                    </p>
                  ) : (
                    <label className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium opacity-80">Era</span>
                      <select
                        value={wpEra}
                        onChange={(e) => {
                          const nextEra = e.target.value as WeaponProficiencyEra
                          setVoucherError(null)
                          setWpEraDrafts((prev) => ({
                            ...prev,
                            [key]: nextEra,
                          }))
                          const nextEligible = filterSkillIdsByWeaponProficiencyEra(
                            eligible,
                            nextEra,
                          )
                          if (draft && !nextEligible.includes(draft)) {
                            setSlotDrafts((prev) => ({ ...prev, [key]: '' }))
                          }
                        }}
                        className={`rounded border px-2 py-1 text-sm ${inputClass}`}
                        aria-label={`${slotLabel} weapon proficiency era`}
                      >
                        <option value="ancient">Ancient</option>
                        <option value="modern">Modern</option>
                      </select>
                    </label>
                  )}
                  <select
                    value={draft}
                    onChange={(e) => {
                      setVoucherError(null)
                      setSlotDrafts((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }}
                    className={`w-full max-w-md rounded border px-2 py-1.5 text-sm ${inputClass}`}
                  >
                    <option value="">— select —</option>
                    {eraEligible.map((id) => (
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
                  ) : eraEligible.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      No {wpEra} weapon proficiencies available for this O.C.C.
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })
        })}

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
