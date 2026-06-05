import { useEffect, useState } from 'react'

import {
  additionalSlotsForSkillAdd,
  findMatchingCreationSkillPick,
  formatCreationSkillPickLabel,
  getSpecializationPrompt,
  professionalQualityLabel,
  skillRequiresSpecialization,
  skillSupportsProfessionalQuality,
  validateSpecializationInput,
} from '../../lib/creationSkillPicks'
import { getSkillById } from '../../data/library/skills'
import type { CreationSkillPick } from '../../types'

export type SkillPickAddDialogState = {
  skillId: string
  variant: 'related' | 'secondary' | 'voucher'
  existingPicks: readonly CreationSkillPick[]
  slotsRemaining?: number
}

type Step = 'specialization' | 'professional'

export function SkillPickAddDialog({
  state,
  morphus,
  onConfirm,
  onCancel,
}: {
  state: SkillPickAddDialogState | null
  morphus: boolean
  onConfirm: (result: {
    specialization?: string
    professionalQuality: boolean
    upgradeInstanceId?: string
  }) => void
  onCancel: () => void
}) {
  const [specialization, setSpecialization] = useState('')
  const [step, setStep] = useState<Step>('specialization')
  const [error, setError] = useState<string | null>(null)

  const skillId = state?.skillId ?? ''
  const def = skillId ? getSkillById(skillId) : undefined
  const requiresSpec = skillId ? skillRequiresSpecialization(skillId) : false
  const supportsPro =
    state?.variant !== 'voucher' &&
    skillId &&
    skillSupportsProfessionalQuality(skillId)
  const existing = state
    ? findMatchingCreationSkillPick(state.existingPicks, skillId, specialization)
    : undefined

  useEffect(() => {
    if (!state) return
    setSpecialization('')
    setStep(
      requiresSpec ? 'specialization' : supportsPro ? 'professional' : 'specialization',
    )
    setError(null)
  }, [state, requiresSpec, supportsPro])

  if (!state || !def) return null

  const panelClass = morphus
    ? 'border-violet-700 bg-slate-950 text-violet-50'
    : 'border-slate-300 bg-white text-slate-900'

  const inputClass = morphus
    ? 'border-violet-700 bg-slate-900 text-violet-50'
    : 'border-slate-300 bg-white text-slate-900'

  function handleSpecializationContinue() {
    if (requiresSpec && !validateSpecializationInput(specialization)) {
      setError('Enter at least one character.')
      return
    }
    const match = findMatchingCreationSkillPick(
      state!.existingPicks,
      skillId,
      specialization,
    )
    if (match?.professionalQuality) {
      setError('This skill is already at professional quality.')
      return
    }
    if (match && !supportsPro) {
      setError('This skill and type is already selected on this character.')
      return
    }
    setError(null)
    if (supportsPro) {
      setStep('professional')
      return
    }
    if (match) {
      setError('This skill and type is already selected on this character.')
      return
    }
    onConfirm({
      specialization: requiresSpec ? specialization.trim() : undefined,
      professionalQuality: false,
    })
  }

  function handleProfessionalChoice(professionalQuality: boolean) {
    const match = findMatchingCreationSkillPick(
      state!.existingPicks,
      skillId,
      specialization,
    )
    const slotsNeeded = additionalSlotsForSkillAdd(match, professionalQuality)
    const slotsRemaining = state!.slotsRemaining ?? 0
    if (
      state!.variant !== 'voucher' &&
      slotsNeeded > slotsRemaining
    ) {
      setError(
        professionalQuality
          ? 'Not enough skill slots for professional quality (needs 2 slots total).'
          : 'Not enough skill slots.',
      )
      return
    }
    if (match && !professionalQuality) {
      setError('This skill and type is already selected on this character.')
      return
    }
    onConfirm({
      specialization: requiresSpec ? specialization.trim() : undefined,
      professionalQuality,
      ...(match ? { upgradeInstanceId: match.instanceId } : {}),
    })
  }

  const previewPick: CreationSkillPick = {
    instanceId: 'preview',
    skillId,
    ...(requiresSpec && specialization.trim()
      ? { specialization: specialization.trim() }
      : {}),
    professionalQuality: step === 'professional',
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-pick-add-title"
    >
      <div className={`max-w-md rounded-xl border-2 p-5 shadow-2xl ${panelClass}`}>
        <h2 id="skill-pick-add-title" className="text-base font-bold">
          Add {def.name}
        </h2>

        {step === 'specialization' ? (
          <>
            <div className="mt-3">
              <label className="block text-sm font-medium opacity-90">
                {getSpecializationPrompt(skillId)}
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => {
                  setSpecialization(e.target.value)
                  setError(null)
                }}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${inputClass}`}
                autoFocus
                placeholder="e.g. Spanish, Guitar…"
              />
            </div>

            {error ? (
              <p className="mt-2 text-sm font-semibold text-rose-500">{error}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold opacity-80 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSpecializationContinue}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                {supportsPro ? 'Continue' : 'Add skill'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              Make <strong>{formatCreationSkillPickLabel(previewPick, def.name)}</strong>{' '}
              {professionalQualityLabel(skillId).toLowerCase()} at the cost of{' '}
              <strong>1 additional skill slot</strong> (2 slots total)?
            </p>
            {error ? (
              <p className="mt-2 text-sm font-semibold text-rose-500">{error}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold opacity-80 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleProfessionalChoice(false)}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-slate-100/10"
              >
                No — standard ({additionalSlotsForSkillAdd(existing, false) || 1} slot)
              </button>
              <button
                type="button"
                onClick={() => handleProfessionalChoice(true)}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Yes — professional (2 slots)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
