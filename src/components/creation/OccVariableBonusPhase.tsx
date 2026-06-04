import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  listOccVariableBonusTasks,
  validateOccVariableResolution,
} from '../../lib/occVariableBonus'

export function OccVariableBonusPhase() {
  const {
    character,
    effectiveOcc,
    setCreationOccVariableResolution,
    supportsDualForm,
    activeForm,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const tasks = useMemo(
    () =>
      listOccVariableBonusTasks(
        effectiveOcc ?? undefined,
        character.occSpecializationId,
      ),
    [effectiveOcc, character.occSpecializationId],
  )

  const resolutions = character.creationOccVariableResolutions ?? {}

  if (!tasks.length) {
    return (
      <p className="text-sm opacity-80">
        No variable O.C.C. dice bonuses for this build.
      </p>
    )
  }

  const panel = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  return (
    <section aria-labelledby="occ-var-heading">
      <h2
        id="occ-var-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Phase I.2: O.C.C. Variable Bonuses
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Roll each required die physically and enter the result. Values must fall within
        the notation bounds (forge-character_creation.md Tab 2).
      </p>
      <ul className={`space-y-3 rounded-lg border p-4 ${panel}`}>
        {tasks.map((task) => {
          const v = resolutions[task.id]
          const err =
            v != null ? validateOccVariableResolution(task, v) : null
          return (
            <li key={task.id} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase opacity-70">
                  {task.label}
                </p>
                <p className="font-mono text-sm">{task.notation}</p>
                <p className="text-[10px] opacity-60">
                  Allowed: {task.min}–{task.max}
                </p>
              </div>
              <label className="flex flex-col gap-1 text-xs">
                Result
                <input
                  type="number"
                  min={task.min}
                  max={task.max}
                  value={v ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') return
                    const n = Number(raw)
                    if (Number.isFinite(n)) {
                      setCreationOccVariableResolution(task.id, n)
                    }
                  }}
                  className={`w-24 rounded border px-2 py-1.5 font-mono text-sm ${
                    morphus
                      ? 'border-violet-700 bg-slate-900 text-violet-100'
                      : 'border-slate-300 bg-white'
                  }`}
                />
              </label>
              {err ? (
                <span className="text-xs font-semibold text-rose-500">{err}</span>
              ) : v != null ? (
                <span className="text-xs font-semibold text-emerald-600">OK</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
