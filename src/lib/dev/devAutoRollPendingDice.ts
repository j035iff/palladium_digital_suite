import type { Character, PalladiumOcc, Race } from '../../types'
import { rollDiceNotation } from '../diceNotation'
import { listPendingDiceBlocks } from '../pendingDiceLedger'
import {
  flattenPendingDiceRolls,
  type PendingDiceBlock,
  type PendingDiceRoll,
} from '../spawnDiceBlocks'

function rollInRange(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function rollPendingDiceValue(roll: PendingDiceRoll): number {
  if (roll.allowedValues?.length) {
    const index = Math.floor(Math.random() * roll.allowedValues.length)
    return roll.allowedValues[index]!
  }
  try {
    const rolled = rollDiceNotation(roll.notation)
    return Math.max(roll.min, Math.min(roll.max, rolled))
  } catch {
    return rollInRange(roll.min, roll.max)
  }
}

export function rollAllPendingDiceBlocks(
  blocks: readonly PendingDiceBlock[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const roll of flattenPendingDiceRolls(blocks)) {
    out[roll.id] = rollPendingDiceValue(roll)
  }
  return out
}

export function buildAutoRolledPendingDiceResolutions(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): Record<string, number> {
  const blocks = listPendingDiceBlocks(character, race, occ, opts)
  return rollAllPendingDiceBlocks(blocks)
}
