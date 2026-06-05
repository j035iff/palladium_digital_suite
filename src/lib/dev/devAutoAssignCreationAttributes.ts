import type {
  CharacterRootState,
  PalladiumOcc,
  RaceAttributeFormulas,
} from '../../types'
import type { ForgeAttrKey } from '../attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../attributeKeys'
import { attributePoolNotationBounds } from '../diceNotationBounds'
import { raceAttrNotation } from '../creationAttributeSync'
import { rollDiceNotation } from '../diceNotation'
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
): number {
  const notation = raceAttrNotation(formulas, attr)
  const { min: nMin, max: nMax } = attributePoolNotationBounds(notation)
  const reqMin = occMinFor(occ, specializationId, attr) ?? nMin
  let value = rollDiceNotation(notation)
  value = Math.max(value, reqMin, nMin)
  value = Math.min(value, nMax)
  return Math.round(value)
}

/** Dev-only: roll one value per attribute, fill the 8-slot pool, and assign each slot. */
export function buildDevAutoAttributeCreationState(
  prev: CharacterRootState,
  formulas: RaceAttributeFormulas | undefined,
  occ: PalladiumOcc | undefined,
): CharacterRootState {
  const pool: (number | null)[] = []
  const assignments: Partial<Record<ForgeAttrKey, number>> = {}
  const poolSlots: Partial<Record<ForgeAttrKey, number>> = {}

  FORGE_ATTRIBUTE_KEYS.forEach((attr, index) => {
    const value = rollForAttribute(attr, formulas, occ, prev.occSpecializationId)
    pool[index] = value
    assignments[attr] = value
    poolSlots[attr] = index
  })

  return {
    ...prev,
    creationAttributePool: pool,
    creationAttributeAssignments: assignments,
    creationAttributePoolSlots: poolSlots,
  }
}
