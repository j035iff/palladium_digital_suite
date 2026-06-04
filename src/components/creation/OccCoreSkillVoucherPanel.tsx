import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getSkillById } from '../../data/library/skills'
import { listCreationSkillLibrary } from '../../lib/creationSkillCatalog'
import {
  formatOccCoreSkillEntry,
  isOccCoreSkillChoiceVoucher,
} from '../../lib/occComposition'
import {
  listOccCoreVoucherTasks,
  listEligibleVoucherSkillIds,
} from '../../lib/occCoreSkillVouchers'

export function OccCoreSkillVoucherPanel() {
  const {
    character,
    effectiveOcc,
    hostGenreId,
    supportsDualForm,
    activeForm,
    setCreationOccCoreVoucherPick,
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

  const picks = character.creationOccCoreVoucherPicks ?? {}

  if (!tasks.length) return null

  const panel = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const sub = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

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
        Resolve open-choice grants from your O.C.C. core package before continuing
        (skill_selection.md).
      </p>
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
          const chosen = picks[task.id] ?? []
          const slots = Array.from({ length: entry.choiceCount }, (_, i) => i)

          return (
            <li key={task.id} className={`rounded-md border p-3 ${sub}`}>
              <p className="text-sm font-semibold">{label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <label key={slot} className="flex flex-col gap-1 text-xs">
                    <span className="opacity-70">Pick {slot + 1}</span>
                    <select
                      value={chosen[slot] ?? ''}
                      onChange={(e) => {
                        const next = [...chosen]
                        while (next.length < entry.choiceCount) next.push('')
                        next[slot] = e.target.value
                        setCreationOccCoreVoucherPick(
                          task.id,
                          next.filter(Boolean),
                        )
                      }}
                      className={`min-w-[160px] rounded border px-2 py-1 font-mono text-xs ${
                        morphus
                          ? 'border-violet-700 bg-slate-900 text-violet-100'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="">— select —</option>
                      {eligible.map((id) => (
                        <option key={id} value={id}>
                          {getSkillById(id)?.name ?? id}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {eligible.length === 0 ? (
                <p className="mt-2 text-xs text-amber-600">
                  No eligible skills in catalog for this voucher (check genre whitelist).
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
