import type { CharacterRootState, RaceAttributeFormulas } from '../../types'
import type { ForgeAttrKey } from '../attributeKeys'
import { attributePoolNotationBounds } from '../diceNotationBounds'
import { raceAttrNotation } from '../creationAttributeSync'
import {
  assignmentToPoolRoll,
  buildAttributePoolDiceGroups,
} from '../attributePoolGroups'

/** Random exceptional total for pool entry (17–30, capped by race dice notation). */
export function devExceptionalRollForAttribute(
  attr: ForgeAttrKey,
  formulas: RaceAttributeFormulas | undefined,
): number {
  const notation = raceAttrNotation(formulas, attr)
  const { max } = attributePoolNotationBounds(notation)
  const ceiling = Math.min(30, max)
  const floor = Math.min(17, ceiling)
  if (ceiling <= floor) return ceiling
  return floor + Math.floor(Math.random() * (ceiling - floor + 1))
}

function resolvePoolIndex(
  attr: ForgeAttrKey,
  poolSlots: Partial<Record<ForgeAttrKey, number>>,
  formulas: RaceAttributeFormulas | undefined,
): number {
  const existing = poolSlots[attr]
  if (typeof existing === 'number' && existing >= 0 && existing <= 7) {
    return existing
  }
  const group = buildAttributePoolDiceGroups(formulas).find((entry) =>
    entry.attrs.includes(attr),
  )
  if (!group) return 0
  const used = new Set(
    Object.values(poolSlots).filter(
      (idx): idx is number => typeof idx === 'number' && idx >= 0 && idx <= 7,
    ),
  )
  for (let i = group.slotStart; i < group.slotStart + group.slotCount; i += 1) {
    if (!used.has(i)) return i
  }
  return group.slotStart
}

/** Dev-only: assign one attribute an exceptional pool value (17–30). */
export function buildDevExceptionalAttributeState(
  prev: CharacterRootState,
  attr: ForgeAttrKey,
  formulas: RaceAttributeFormulas | undefined,
): CharacterRootState {
  const pool = [...(prev.creationAttributePool ?? Array(8).fill(null))]
  const poolSlots = { ...(prev.creationAttributePoolSlots ?? {}) }
  const assignments = { ...(prev.creationAttributeAssignments ?? {}) }

  const assignment = devExceptionalRollForAttribute(attr, formulas)
  const diceRoll = assignmentToPoolRoll(formulas, attr, assignment)
  const poolIndex = resolvePoolIndex(attr, poolSlots, formulas)

  pool[poolIndex] = diceRoll
  poolSlots[attr] = poolIndex
  assignments[attr] = assignment

  for (const key of Object.keys(poolSlots) as ForgeAttrKey[]) {
    if (key !== attr && poolSlots[key] === poolIndex) {
      delete assignments[key]
      delete poolSlots[key]
    }
  }

  return {
    ...prev,
    creationAttributePool: pool,
    creationAttributeAssignments: assignments,
    creationAttributePoolSlots: poolSlots,
  }
}
