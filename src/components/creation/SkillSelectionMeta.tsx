import type {
  SkillPrerequisiteDisplayPart,
  SkillSynergyHint,
} from '../../lib/skillBlockDisplay'
import {
  formatActiveSynergyLine,
  formatSynergyHintLine,
  formatSynergyStatusLine,
} from '../../lib/skillBlockDisplay'
import { SkillSynergyLinkIcon } from './SkillSynergyLinkIcon'

function prerequisiteSkillClass(owned: boolean): string {
  return owned
    ? 'font-medium normal-case text-emerald-700 dark:text-emerald-400'
    : 'font-medium normal-case text-red-800 dark:text-red-300'
}

/** Shared Tab 4 prerequisite coloring — owned green, missing red (per skill name). */
export function SkillPrerequisiteMeta({
  parts,
  className = 'mt-1 text-xs leading-snug text-slate-600 dark:text-slate-300',
  inline = false,
}: {
  parts: readonly SkillPrerequisiteDisplayPart[]
  className?: string
  /** Render as a span for compact library-row chips. */
  inline?: boolean
}) {
  const content = parts.map((part, index) =>
    part.kind === 'text' ? (
      <span key={`t-${index}`} className="normal-case">
        {part.text}
      </span>
    ) : (
      <span
        key={`s-${part.skillId}-${index}`}
        className={prerequisiteSkillClass(part.owned)}
      >
        {part.name}
      </span>
    ),
  )

  if (inline) {
    return <span className={className}>{content}</span>
  }

  return <p className={className}>{content}</p>
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

/** Library description panel: active (green) above available (orange). */
export function SkillLibrarySynergyLines({
  active,
  available,
}: {
  active: readonly SkillSynergyHint[]
  available: readonly SkillSynergyHint[]
}) {
  if (active.length === 0 && available.length === 0) return null

  return (
    <ul className="space-y-1 text-xs leading-snug">
      {active.map((hint) => (
        <li
          key={`active-${hint.direction}-${hint.sourceSkillId}-${hint.targetSkillId ?? ''}-${hint.bonusPercent}`}
          className="flex items-start gap-1.5 font-medium text-emerald-700 dark:text-emerald-300"
        >
          <SkillSynergyLinkIcon status="active" className="mt-0.5" />
          <span>{formatSynergyStatusLine(hint, 'active')}</span>
        </li>
      ))}
      {available.map((hint) => (
        <li
          key={`available-${hint.direction}-${hint.sourceSkillId}-${hint.targetSkillId ?? ''}-${hint.bonusPercent}`}
          className="flex items-start gap-1.5 font-medium text-orange-600 dark:text-orange-300"
        >
          <SkillSynergyLinkIcon status="available" className="mt-0.5" />
          <span>{formatSynergyStatusLine(hint, 'available')}</span>
        </li>
      ))}
    </ul>
  )
}
