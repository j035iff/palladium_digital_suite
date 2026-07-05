import { useEffect, useState } from 'react'

import { getSkillById } from '../../data/library/skills'
import {
  formatCreationSkillPickLabel,
  getSpecializationPrompt,
  isCreationSkillIdentityTaken,
  validateSpecializationInput,
} from '../../lib/creationSkillPicks'
import type { CreationSkillPick } from '../../types'

export type SkillSpecializationEditState = {
  pick: CreationSkillPick
  allPicks: readonly CreationSkillPick[]
}

export function SkillSpecializationEditDialog({
  state,
  morphus,
  onSave,
  onCancel,
}: {
  state: SkillSpecializationEditState | null
  morphus: boolean
  onSave: (specialization: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pick = state?.pick
  const def = pick ? getSkillById(pick.skillId) : undefined

  useEffect(() => {
    if (!state) return
    setValue(state.pick.specialization ?? '')
    setError(null)
  }, [state])

  if (!state || !pick || !def) return null

  const panelClass = morphus
    ? 'border-violet-700 bg-slate-950 text-violet-50'
    : 'border-slate-300 bg-white text-slate-900'

  const inputClass = morphus
    ? 'border-violet-700 bg-slate-900 text-violet-50'
    : 'border-slate-300 bg-white text-slate-900'

  function handleSave() {
    if (!state || !pick) return
    if (!validateSpecializationInput(value)) {
      setError('Enter at least one character.')
      return
    }
    const trimmed = value.trim()
    if (
      isCreationSkillIdentityTaken(
        state.allPicks,
        pick.skillId,
        trimmed,
        [pick.instanceId],
      )
    ) {
      setError('This skill and type is already selected on this character.')
      return
    }
    onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-spec-edit-title"
    >
      <div className={`max-w-md rounded-xl border-2 p-5 shadow-2xl ${panelClass}`}>
        <h2 id="skill-spec-edit-title" className="text-base font-bold">
          Edit {def.name}
        </h2>
        <div className="mt-3">
          <label className="block text-sm font-medium opacity-90">
            {getSpecializationPrompt(pick.skillId)}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${inputClass}`}
            autoFocus
          />
        </div>
        {value.trim() ? (
          <p className="mt-2 text-xs opacity-70">
            Preview:{' '}
            {formatCreationSkillPickLabel(
              { ...pick, specialization: value.trim() },
              def.name,
            )}
          </p>
        ) : null}
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
            onClick={handleSave}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
