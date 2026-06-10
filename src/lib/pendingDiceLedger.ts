import type {
  Character,
  CharacterCreationForgeTabId,
  CharacterRootState,
  PalladiumOcc,
  Race,
} from '../types'
import {
  buildPendingDiceBlocks,
  filterPendingDiceBlocksByScope,
  flattenPendingDiceRolls,
  pendingDiceBlocksComplete,
  type PendingDiceBlock,
  type PendingDiceBlockScope,
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
  opts?: {
    supportsDualForm?: boolean
    psychicTier?: string
    scope?: PendingDiceBlockScope
  },
): PendingDiceBlock[] {
  const blocks = buildPendingDiceBlocks(character, race, occ, opts)
  const scope = opts?.scope ?? 'all'
  return filterPendingDiceBlocksByScope(blocks, scope)
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

function rollIdsForScope(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts: { supportsDualForm: boolean; psychicTier: string; scope: PendingDiceBlockScope },
): Set<string> {
  return new Set(
    flattenPendingDiceRolls(
      listPendingDiceBlocks(character, race, occ, opts),
    ).map((roll) => roll.id),
  )
}

function clearForgeTabMark(
  prev: CharacterRootState,
  tabId: CharacterCreationForgeTabId,
): Pick<CharacterRootState, 'creationForgeCompleted' | 'creationForgeSnapshots'> {
  const completed = { ...(prev.creationForgeCompleted ?? {}) }
  const snapshots = { ...(prev.creationForgeSnapshots ?? {}) }
  delete completed[tabId]
  delete snapshots[tabId]
  return { creationForgeCompleted: completed, creationForgeSnapshots: snapshots }
}

/** Re-open Roll Pending / Traits when dice are edited after Continue. */
export function patchPendingDiceResolution(
  prev: CharacterRootState,
  entryId: string,
  value: number,
  opts: { race: Race | undefined; occ: PalladiumOcc | undefined; psychicTier: string; supportsDualForm: boolean },
): CharacterRootState {
  const resolutions = {
    ...(prev.creationPendingDiceResolutions ?? {}),
    [entryId]: value,
  }
  let next: CharacterRootState = {
    ...prev,
    creationPendingDiceResolutions: resolutions,
  }

  const facadeScope = opts.supportsDualForm ? ('facade' as const) : ('all' as const)
  const facadeRollIds = rollIdsForScope(prev, opts.race, opts.occ, {
    supportsDualForm: opts.supportsDualForm,
    psychicTier: opts.psychicTier,
    scope: facadeScope,
  })
  if (prev.creationFacadeDiceFinalized === true && facadeRollIds.has(entryId)) {
    next = {
      ...next,
      ...clearForgeTabMark(next, 'tab5_finalize'),
      creationFacadeDiceFinalized: false,
    }
  }

  if (opts.supportsDualForm && prev.creationMorphusDiceFinalized === true) {
    const morphusRollIds = rollIdsForScope(prev, opts.race, opts.occ, {
      supportsDualForm: true,
      psychicTier: opts.psychicTier,
      scope: 'morphus',
    })
    if (morphusRollIds.has(entryId)) {
      next = {
        ...next,
        ...clearForgeTabMark(next, 'tab6_traits'),
        creationMorphusDiceFinalized: false,
      }
    }
  }

  return next
}
