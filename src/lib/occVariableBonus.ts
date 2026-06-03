import type { OccStaticBonusValue, PalladiumOcc } from '../types'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { diceNotationBounds, isDiceNotation } from './diceNotationBounds'

export type OccVariableBonusTask = {
  id: string
  label: string
  notation: string
  min: number
  max: number
  section: 'attributes' | 'vitals' | 'combat' | 'saves'
  statKey: string
}

function collectDiceTasksFromMap(
  section: OccVariableBonusTask['section'],
  map: Readonly<Record<string, OccStaticBonusValue>> | undefined,
): OccVariableBonusTask[] {
  if (!map) return []
  const out: OccVariableBonusTask[] = []
  for (const [statKey, raw] of Object.entries(map)) {
    if (typeof raw !== 'string' || !isDiceNotation(raw)) continue
    const bounds = diceNotationBounds(raw)
    out.push({
      id: `${section}.${statKey}`,
      label: `${section} — ${statKey}`,
      notation: raw,
      min: bounds.min,
      max: bounds.max,
      section,
      statKey,
    })
  }
  return out
}

/** Phase I.2 — dice-valued entries in O.C.C. staticBonuses (merged specialization). */
export function listOccVariableBonusTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccVariableBonusTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const bonuses = effective.staticBonuses
  if (!bonuses) return []
  return [
    ...collectDiceTasksFromMap('attributes', bonuses.attributes),
    ...collectDiceTasksFromMap('vitals', bonuses.vitals),
    ...collectDiceTasksFromMap('combat', bonuses.combat),
    ...collectDiceTasksFromMap('saves', bonuses.saves),
  ]
}

export function occVariableBonusTasksComplete(
  tasks: readonly OccVariableBonusTask[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  return tasks.every((t) => {
    const v = resolutions[t.id]
    return (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      v >= t.min &&
      v <= t.max
    )
  })
}

export function validateOccVariableResolution(
  task: OccVariableBonusTask,
  value: number,
): string | null {
  if (!Number.isFinite(value)) return 'Enter a number.'
  if (value < task.min || value > task.max) {
    return `${task.notation} must be between ${task.min} and ${task.max}.`
  }
  return null
}
