import type { CharacterRootState, RaceAttributeFormulas } from '../../types'
import type { ForgeAttrKey } from '../attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../attributeKeys'
import { attributePoolNotationBounds } from '../diceNotationBounds'
import { raceAttrNotation } from '../creationAttributeSync'

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
  pool: readonly (number | null)[],
): number {
  const existing = poolSlots[attr]
  if (typeof existing === 'number' && existing >= 0 && existing <= 7) {
    return existing
  }
  const used = new Set(
    Object.values(poolSlots).filter(
      (idx): idx is number => typeof idx === 'number' && idx >= 0 && idx <= 7,
    ),
  )
  for (let i = 0; i < pool.length; i++) {
    if (!used.has(i)) return i
  }
  return FORGE_ATTRIBUTE_KEYS.indexOf(attr)
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

  const value = devExceptionalRollForAttribute(attr, formulas)
  const poolIndex = resolvePoolIndex(attr, poolSlots, pool)

  pool[poolIndex] = value
  poolSlots[attr] = poolIndex
  assignments[attr] = value

  for (const key of FORGE_ATTRIBUTE_KEYS) {
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
