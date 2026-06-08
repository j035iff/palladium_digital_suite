import type { OccStaticBonusValue, PalladiumOcc } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { OCC_VARIABLE_PHASE_ATTRIBUTE_KEYS } from './attributeKeys'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { diceNotationBounds, isDiceNotation } from './diceNotationBounds'

const OCC_VARIABLE_PHASE_ATTR_SET = new Set<string>(OCC_VARIABLE_PHASE_ATTRIBUTE_KEYS)

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

/** Spawn / Review — O.C.C. attribute dice resolved after the attribute strip (e.g. Spd). */
export function listSpawnPhaseOccAttributeBonusTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccVariableBonusTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  return collectDiceTasksFromMap(
    'attributes',
    effective.staticBonuses?.attributes,
  ).filter((task) => !OCC_VARIABLE_PHASE_ATTR_SET.has(task.statKey))
}

/** Phase I.2 — O.C.C. attribute dice only (merged specialization). */
export function listOccVariableAttributeBonusTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccVariableBonusTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  return collectDiceTasksFromMap(
    'attributes',
    effective.staticBonuses?.attributes,
  ).filter((task) => OCC_VARIABLE_PHASE_ATTR_SET.has(task.statKey))
}

/** Resolved Phase I.2 dice bonus for one attribute (0 when not rolled or not applicable). */
export function occVariableAttributeResolution(
  attr: ForgeAttrKey,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  resolutions: Readonly<Record<string, number>>,
): number {
  const task = listOccVariableAttributeBonusTasks(occ, specializationId).find(
    (t) => t.statKey === attr,
  )
  if (!task) return 0
  const v = resolutions[task.id]
  return v != null && Number.isFinite(v) ? v : 0
}

/** All dice-valued O.C.C. staticBonuses (attributes resolved in Phase I.2; vitals at spawn). */
export function listOccVariableBonusTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccVariableBonusTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const bonuses = effective.staticBonuses
  if (!bonuses) return []
  return [
    ...listOccVariableAttributeBonusTasks(occ, specializationId),
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
