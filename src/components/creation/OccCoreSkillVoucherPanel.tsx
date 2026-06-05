import { useMemo, useState } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import { getSkillById } from '../../data/library/skills'

import { listCreationSkillLibrary } from '../../lib/creationSkillCatalog'

import {
  canAffordHandToHandTier,
  creationHandToHandElectiveSlotCost,
  creationHandToHandRequiresSelection,
  listOccHandToHandOptions,
} from '../../lib/creationHandToHandChoice'

import {
  formatOccCoreSkillEntry,
  isOccCoreSkillChoiceVoucher,
} from '../../lib/occComposition'

import {
  collectAllCreationSkillPicks,
  findOccCoreVoucherSlotForPick,
  isOccCoreGrantSkillPick,
  listOccCoreVoucherTasks,
  listEligibleVoucherSkillIds,
  resolveOccCoreSkillPicks,
} from '../../lib/occCoreSkillVouchers'

import { occStartingOccSkillIds } from '../../lib/occCatalogEngine'

import type { CreationHandToHandTier } from '../../lib/creationHandToHandChoice'

import {
  buildCreationSkillPick,
  creationSkillPickHasEditableSpecialization,
  downgradePickToStandard,
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  getOccCoreVoucherSlotPicks,
  getSpecializationPrompt,
  isCreationSkillIdentityTaken,
  professionalQualityLabel,
  skillNeedsVoucherPickDialog,
  skillRequiresSpecialization,
  skillSupportsProfessionalQuality,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
  upgradePickToProfessional,
  validateSpecializationInput,
} from '../../lib/creationSkillPicks'

import {
  SkillPickAddDialog,
  type SkillPickAddDialogState,
} from './SkillPickAddDialog'
import { SkillSpecializationEditDialog } from './SkillSpecializationEditDialog'

import type { CreationSkillPick } from '../../types'

type PendingVoucherSlot = {
  taskId: string
  slot: number
  skillId: string
}

export function OccCoreSkillVoucherPanel() {
  const {
    character,
    effectiveOcc,
    hostGenreId,
    supportsDualForm,
    activeForm,
    skillSlotMultiplier,
    setCreationOccCoreVoucherPick,
    setCreationOccGrantPickDetail,
    setCreationHandToHandTier,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'

  const tasks = useMemo(
    () => listOccCoreVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const catalogIds = useMemo(
    () => listCreationSkillLibrary(hostGenreId).map((s) => s.id),
    [hostGenreId],
  )

  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const grantDetails = character.creationOccGrantPickDetails ?? {}
  const handToHandTier = character.creationHandToHandTier ?? 'none'

  const relatedSelected = getCreationRelatedPicks(character)

  const relatedCap = Math.floor(
    (character.occRelatedSkillSlotBudget ?? 0) * skillSlotMultiplier,
  )

  const handToHandOptions = useMemo(
    () => (effectiveOcc ? listOccHandToHandOptions(effectiveOcc) : []),
    [effectiveOcc],
  )

  const handToHandReserved = effectiveOcc
    ? creationHandToHandElectiveSlotCost(effectiveOcc, handToHandTier)
    : 0

  const resolvedOccPicks = useMemo(
    () =>
      resolveOccCoreSkillPicks(
        effectiveOcc,
        character.occSpecializationId,
        voucherPicks,
        grantDetails,
      ),
    [effectiveOcc, character.occSpecializationId, voucherPicks, grantDetails],
  )

  const relatedSkillCap = Math.max(0, relatedCap - handToHandReserved)

  const relatedSlotsUsed = sumRelatedPoolSlotUsage(
    relatedSelected,
    resolvedOccPicks,
    handToHandReserved,
  )

  const relatedSlotCount = sumCreationSkillPickSlots(relatedSelected)

  const parameterizedGrants = useMemo(() => {
    if (!effectiveOcc) return []
    return occStartingOccSkillIds(effectiveOcc, character.occSpecializationId).filter(
      skillRequiresSpecialization,
    )
  }, [effectiveOcc, character.occSpecializationId])

  const [pendingVoucherSlot, setPendingVoucherSlot] =
    useState<PendingVoucherSlot | null>(null)

  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({})
  const [grantDrafts, setGrantDrafts] = useState<Record<string, string>>({})
  const [editPick, setEditPick] = useState<CreationSkillPick | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [grantError, setGrantError] = useState<string | null>(null)

  const allCreationPicks = useMemo(
    () => collectAllCreationSkillPicks(character, effectiveOcc ?? undefined),
    [character, effectiveOcc],
  )

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

  const panel = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const sub = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  const inputClass = morphus
    ? 'border-violet-700 bg-slate-900 text-violet-100'
    : 'border-slate-300 bg-white text-slate-900'

  const requiresHandToHand =
    effectiveOcc != null && creationHandToHandRequiresSelection(effectiveOcc)

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

  function handleGrantAdd(skillId: string) {
    const draft = grantDrafts[skillId] ?? ''
    if (!validateSpecializationInput(draft)) {
      setGrantError('Enter at least one character.')
      return
    }
    const trimmed = draft.trim()
    if (isCreationSkillIdentityTaken(allCreationPicks, skillId, trimmed)) {
      setGrantError('This skill and type is already selected on this character.')
      return
    }
    setGrantError(null)
    setCreationOccGrantPickDetail(skillId, {
      instanceId: skillId,
      skillId,
      specialization: trimmed,
    })
    setGrantDrafts((prev) => ({ ...prev, [skillId]: '' }))
  }

  function handleGrantClear(skillId: string) {
    setGrantError(null)
    setCreationOccGrantPickDetail(skillId, null)
    setGrantDrafts((prev) => ({ ...prev, [skillId]: '' }))
  }

  function persistOccPickUpdate(
    pick: CreationSkillPick,
    updated: CreationSkillPick,
  ) {
    if (
      isOccCoreGrantSkillPick(
        pick,
        effectiveOcc,
        character.occSpecializationId,
      )
    ) {
      setCreationOccGrantPickDetail(pick.skillId, updated)
      return
    }
    const slot = findOccCoreVoucherSlotForPick(
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      pick.instanceId,
    )
    if (!slot) return
    const slots = getOccCoreVoucherSlotPicks(
      voucherPicks,
      slot.taskId,
      slot.choiceCount,
    )
    slots[slot.slot] = updated
    setCreationOccCoreVoucherPick(slot.taskId, slots)
  }

  function saveSpecializationEdit(
    pick: CreationSkillPick,
    specialization: string,
  ) {
    persistOccPickUpdate(pick, { ...pick, specialization })
  }

  function toggleOccPickProfessionalQuality(pick: CreationSkillPick) {
    const slotsRemaining = Math.max(0, relatedSkillCap - relatedSlotsUsed)
    if (!pick.professionalQuality && slotsRemaining < 1) return
    persistOccPickUpdate(
      pick,
      pick.professionalQuality
        ? downgradePickToStandard(pick)
        : upgradePickToProfessional(pick),
    )
  }

  function renderProfessionalQualityToggle(pick: CreationSkillPick) {
    if (!skillSupportsProfessionalQuality(pick.skillId)) return null
    const slotsRemaining = Math.max(0, relatedSkillCap - relatedSlotsUsed)
    const canUpgrade = !pick.professionalQuality && slotsRemaining >= 1
    return pick.professionalQuality ? (
      <button
        type="button"
        className="w-fit rounded border px-2 py-1 text-xs font-semibold text-sky-500 opacity-80 hover:opacity-100"
        onClick={() => toggleOccPickProfessionalQuality(pick)}
      >
        Set to standard quality
      </button>
    ) : (
      <button
        type="button"
        disabled={!canUpgrade}
        title={
          canUpgrade
            ? undefined
            : 'Not enough O.C.C. related skill slots (professional quality costs 1 related slot)'
        }
        className="w-fit rounded border px-2 py-1 text-xs font-semibold text-sky-500 opacity-80 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => toggleOccPickProfessionalQuality(pick)}
      >
        Set to {professionalQualityLabel(pick.skillId).toLowerCase()}
      </button>
    )
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

  return (
    <div
      className={`mb-4 rounded-lg border p-4 ${panel}`}
      aria-labelledby="occ-voucher-heading"
    >
      <h3
        id="occ-voucher-heading"
        className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80"
      >
        O.C.C. core skill choices
      </h3>
      <p className="mb-3 text-xs opacity-75">
        Hand-to-Hand fighting style and any open-choice grants from your O.C.C.
        core package (skill_selection.md).
      </p>

      <div className={`mb-3 rounded-md border p-3 ${sub}`}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Hand-to-Hand</span>
          {handToHandOptions.length > 0 ? (
            <>
              <select
                value={
                  handToHandOptions.some((o) => o.tier === handToHandTier)
                    ? handToHandTier
                    : ''
                }
                onChange={(e) => {
                  const value = e.target.value as CreationHandToHandTier | ''
                  if (!value) return
                  setCreationHandToHandTier(value)
                }}
                className={`max-w-md rounded border px-2 py-1.5 font-mono text-sm ${inputClass}`}
              >
                {requiresHandToHand ? (
                  <option value="">— select —</option>
                ) : null}
                {handToHandOptions.map((opt) => {
                  const affordable =
                    !effectiveOcc ||
                    canAffordHandToHandTier(
                      effectiveOcc,
                      opt.tier,
                      relatedCap,
                      relatedSlotsUsed - handToHandReserved,
                    )
                  const isCurrent = opt.tier === handToHandTier
                  return (
                    <option
                      key={opt.tier}
                      value={opt.tier}
                      disabled={!affordable && !isCurrent}
                    >
                      {opt.label}
                      {!affordable && !isCurrent
                        ? ' — insufficient related slots'
                        : ''}
                    </option>
                  )
                })}
              </select>
              {relatedCap > 0 ? (
                <span className="text-xs opacity-70">
                  {handToHandReserved > 0
                    ? `Reserves ${handToHandReserved} O.C.C. related slot${handToHandReserved === 1 ? '' : 's'} for Hand-to-Hand. `
                    : null}
                  {relatedSlotsUsed} / {relatedCap}{' '}
                  related slots used
                  {handToHandReserved > 0
                    ? ` (${relatedSlotCount} skills + ${handToHandReserved} Hand-to-Hand)`
                    : null}
                  .
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-xs opacity-70">
              No Hand-to-Hand options for this O.C.C. yet — select a
              specialization if required, or add rules to the O.C.C. data.
            </p>
          )}
        </label>
      </div>

      {parameterizedGrants.length > 0 ? (
        <div className={`mb-3 rounded-md border p-3 ${sub}`}>
          <p className="text-sm font-semibold">Parameterized O.C.C. grants</p>
          <p className="mt-1 text-xs opacity-70">
            These skills are granted by your O.C.C. but require you to specify
            the type (same rules as Language / Literacy in the skill library).
          </p>
          <ul className="mt-2 space-y-2">
            {parameterizedGrants.map((skillId) => {
              const def = getSkillById(skillId)
              const locked = grantDetails[skillId]
              const isLocked =
                locked != null &&
                validateSpecializationInput(locked.specialization ?? '')
              const draft = grantDrafts[skillId] ?? ''
              return (
                <li key={skillId}>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-medium">
                      {def?.name ?? skillId} — {getSpecializationPrompt(skillId)}
                    </span>
                    {isLocked && locked ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {formatCreationSkillPickLabel(locked, def?.name)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {creationSkillPickHasEditableSpecialization(locked) ? (
                            <button
                              type="button"
                              className="w-fit rounded border px-2 py-1 text-xs font-semibold text-violet-500 opacity-80 hover:opacity-100"
                              onClick={() => setEditPick(locked)}
                            >
                              Edit
                            </button>
                          ) : null}
                          {renderProfessionalQualityToggle(locked)}
                          <button
                            type="button"
                            className="w-fit rounded border px-2 py-1 text-xs font-semibold opacity-80 hover:opacity-100"
                            onClick={() => handleGrantClear(skillId)}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) => {
                            setGrantError(null)
                            setGrantDrafts((prev) => ({
                              ...prev,
                              [skillId]: e.target.value,
                            }))
                          }}
                          className={`max-w-md rounded border px-2 py-1.5 text-sm ${inputClass}`}
                          placeholder="e.g. English, Spanish…"
                        />
                        <button
                          type="button"
                          disabled={!validateSpecializationInput(draft)}
                          className="w-fit rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => handleGrantAdd(skillId)}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <ul className="space-y-3">
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

            return (
              <li key={task.id} className={`rounded-md border p-3 ${sub}`}>
                <p className="text-sm font-semibold">{label}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {slots.map((slot) => {
                    const pick = slotPicks[slot]
                    const draft = slotDrafts[slotKey(task.id, slot)] ?? ''
                    return (
                      <div key={slot} className="flex flex-col gap-1 text-xs">
                        <span className="opacity-70">Pick {slot + 1}</span>
                        {pick ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {formatCreationSkillPickLabel(
                                pick,
                                getSkillById(pick.skillId)?.name,
                              )}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {creationSkillPickHasEditableSpecialization(pick) ? (
                                <button
                                  type="button"
                                  className="w-fit rounded border px-2 py-1 text-xs font-semibold text-violet-500 opacity-80 hover:opacity-100"
                                  onClick={() => setEditPick(pick)}
                                >
                                  Edit
                                </button>
                              ) : null}
                              {renderProfessionalQualityToggle(pick)}
                              <button
                                type="button"
                                className="w-fit rounded border px-2 py-1 text-xs font-semibold opacity-80 hover:opacity-100"
                                onClick={() =>
                                  handleVoucherClear(task.id, slot, entry.choiceCount)
                                }
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <select
                              value={draft}
                              onChange={(e) => {
                                setVoucherError(null)
                                setSlotDrafts((prev) => ({
                                  ...prev,
                                  [slotKey(task.id, slot)]: e.target.value,
                                }))
                              }}
                              className={`min-w-[160px] rounded border px-2 py-1 font-mono text-xs ${inputClass}`}
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
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {eligible.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-600">
                    No eligible skills in catalog for this voucher (check genre
                    whitelist).
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {grantError ? (
        <p className="mt-2 text-sm font-semibold text-rose-500">{grantError}</p>
      ) : null}
      {voucherError ? (
        <p className="mt-2 text-sm font-semibold text-rose-500">{voucherError}</p>
      ) : null}

      <SkillPickAddDialog
        state={pickDialog}
        morphus={morphus}
        onCancel={() => setPendingVoucherSlot(null)}
        onConfirm={(result) => handleVoucherDialogConfirm(result)}
      />

      <SkillSpecializationEditDialog
        state={
          editPick ? { pick: editPick, allPicks: allCreationPicks } : null
        }
        morphus={morphus}
        onCancel={() => setEditPick(null)}
        onSave={(specialization) => {
          if (!editPick) return
          saveSpecializationEdit(editPick, specialization)
          setEditPick(null)
        }}
      />
    </div>
  )
}
