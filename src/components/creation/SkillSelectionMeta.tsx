import type { SkillSynergyHint } from '../../lib/skillBlockDisplay'
import { formatActiveSynergyLine, formatSynergyHintLine } from '../../lib/skillBlockDisplay'

export function SkillPrerequisiteMeta({
  summary,
  satisfied,
}: {
  summary: string
  satisfied?: boolean
}) {
  return (
    <p
      className={`mt-1 text-xs leading-snug ${
        satisfied === false
          ? 'font-medium text-red-800 dark:text-red-300'
          : satisfied === true
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-slate-600 dark:text-slate-300'
      }`}
    >
      {summary}
    </p>
  )
}

export function SkillSynergyMeta({
  hints,
  activeLines,
}: {
  hints?: readonly SkillSynergyHint[]
  activeLines?: readonly { label: string; value: number }[]
}) {
  const hintRows = hints ?? []
  const activeRows = (activeLines ?? []).filter(
    (line) => line.label !== 'Professional quality',
  )

  if (hintRows.length === 0 && activeRows.length === 0) return null

  return (
    <div className="mt-1 space-y-1 text-xs leading-snug">
      {hintRows.length > 0 ? (
        <div>
          <p className="font-bold uppercase tracking-wide text-orange-700/90 dark:text-orange-300/90">
            Synergies
          </p>
          <ul className="mt-0.5 list-inside list-disc text-amber-700 dark:text-amber-300">
            {hintRows.map((hint) => (
              <li
                key={`${hint.direction}-${hint.sourceSkillId}-${hint.targetSkillId ?? ''}-${hint.bonusPercent}`}
              >
                {formatSynergyHintLine(hint)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {activeRows.length > 0 ? (
        <div>
          <p className="font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300">
            Active synergies
          </p>
          <ul className="mt-0.5 list-inside list-disc font-medium text-orange-700 dark:text-orange-200">
            {activeRows.map((line) => (
              <li key={`${line.label}-${line.value}`}>
                {formatActiveSynergyLine(line.label, line.value)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
