import type { Character, PalladiumOcc, Race } from '../types'
import {
  buildPendingDiceBlocks,
  flattenPendingDiceRolls,
  pendingDiceBlocksComplete,
  type PendingDiceBlock,
  type PendingDiceRoll,
} from './spawnDiceBlocks'

/** @deprecated Use {@link PendingDiceRoll} from spawn dice blocks. */
export type PendingDiceEntry = PendingDiceRoll & {
  label: string
  hint?: string
}

export function listPendingDiceBlocks(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): PendingDiceBlock[] {
  return buildPendingDiceBlocks(character, race, occ, opts)
}

/** Flat list for legacy spawn checks — prefer {@link listPendingDiceBlocks}. */
export function listPendingDiceEntries(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): PendingDiceEntry[] {
  return flattenPendingDiceRolls(
    buildPendingDiceBlocks(character, race, occ, opts),
  ).map((roll) => ({
    ...roll,
    label: roll.source,
  }))
}

export function pendingDiceResolutionsComplete(
  entries: readonly { id: string; min: number; max: number }[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  return entries.every((entry) => {
    const value = resolutions[entry.id]
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= entry.min &&
      value <= entry.max
    )
  })
}

export function pendingDiceBlocksResolutionComplete(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  return pendingDiceBlocksComplete(blocks, resolutions)
}
