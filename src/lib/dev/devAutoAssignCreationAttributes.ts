import type {
  CharacterRootState,
  PalladiumOcc,
  RaceAttributeFormulas,
} from '../types'
import type { ForgeAttrKey } from '../attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../attributeKeys'
import { attributePoolNotationBounds } from '../diceNotationBounds'
import { raceAttrNotation } from '../creationAttributeSync'
import {
  assignmentToPoolRoll,
  attributePoolDiceCoreBounds,
  buildAttributePoolDiceGroups,
  raceAttrPoolExceptionalEligible,
} from '../attributePoolGroups'
import { parsePhysicalDiceRoll, rollDiceNotation } from '../diceNotation'
import { resolveEffectivePalladiumOcc } from '../occComposition'

function occMinFor(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  attr: ForgeAttrKey,
): number | undefined {
  if (!occ) return undefined
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const reqs = effective.attributeRequirements as Record<string, number> | undefined
  const key = attr === 'ps' ? 'ps' : attr
  const v = reqs?.[key]
  return typeof v === 'number' && v > 0 ? v : undefined
}

function rollForAttribute(
  attr: ForgeAttrKey,
  formulas: RaceAttributeFormulas | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): { diceRoll: number; assignment: number } {
  const notation = raceAttrNotation(formulas, attr)
  const parsed = parsePhysicalDiceRoll(notation)
  const exceptionalEligible = raceAttrPoolExceptionalEligible(formulas, attr)
  const diceCore = parsed.diceNotation
  const { min: dMin, max: dMax } = attributePoolDiceCoreBounds(
    diceCore,
    exceptionalEligible,
  )
  const { min: nMin, max: nMax } = attributePoolNotationBounds(notation)
  const reqMin = occMinFor(occ, specializationId, attr) ?? nMin
  let diceRoll = rollDiceNotation(parsed.diceNotation)
  diceRoll = Math.max(diceRoll, dMin)
  diceRoll = Math.min(diceRoll, dMax)
  let assignment = Math.round(diceRoll + parsed.flatBonus)
  assignment = Math.max(assignment, reqMin, nMin)
  assignment = Math.min(assignment, nMax)
  diceRoll = assignmentToPoolRoll(formulas, attr, assignment)
  return { diceRoll, assignment }
}

/** Dev-only: roll one value per attribute, fill the 8-slot pool, and assign each slot. */
export function buildDevAutoAttributeCreationState(
  prev: CharacterRootState,
  formulas: RaceAttributeFormulas | undefined,
  occ: PalladiumOcc | undefined,
): CharacterRootState {
  const pool: (number | null)[] = Array.from({ length: 8 }, () => null)
  const assignments: Partial<Record<ForgeAttrKey, number>> = {}
  const poolSlots: Partial<Record<ForgeAttrKey, number>> = {}

  for (const group of buildAttributePoolDiceGroups(formulas)) {
    group.attrs.forEach((attr, offset) => {
      const slotIndex = group.slotStart + offset
      const { diceRoll, assignment } = rollForAttribute(
        attr,
        formulas,
        occ,
        prev.occSpecializationId,
      )
      pool[slotIndex] = diceRoll
      assignments[attr] = assignment
      poolSlots[attr] = slotIndex
    })
  }

  return {
    ...prev,
    creationAttributePool: pool,
    creationAttributeAssignments: assignments,
    creationAttributePoolSlots: poolSlots,
  }
}
