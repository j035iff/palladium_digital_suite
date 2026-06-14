import type { Character, MorphusForgeState } from '../types'
import {
  deriveMorphusSlotResolutionView,
  morphusTraitForgeReady,
  path2CharacteristicsCountValid,
} from './morphusSlotResolution'
import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
} from '../data/library/morphusForgeRoutingLoader'
import {
  deriveForgeNavigation,
  type ForgeTabDefinition,
} from './forgeNavigation/engine'
import type { ForgeNavigationDerived } from './forgeNavigation/types'
import {
  listPendingDiceBlocks,
  pendingDiceBlocksResolutionComplete,
} from './pendingDiceLedger'

export type MorphusForgeSubTabId = 'crossroads' | 'trait_forge' | 'review'

export const MORPHUS_FORGE_SUB_TAB_ORDER: readonly MorphusForgeSubTabId[] = [
  'crossroads',
  'trait_forge',
  'review',
] as const

export const MORPHUS_FORGE_SUB_TAB_LABELS: Record<MorphusForgeSubTabId, string> = {
  crossroads: 'Crossroads',
  trait_forge: 'Trait Forge',
  review: 'Review',
}

export function formatMorphusPercentileBand(min: number, max: number): string {
  const fmt = (n: number) => (n === 100 ? '00' : String(n).padStart(2, '0'))
  return `${fmt(min)}–${fmt(max)}`
}

export function defaultMorphusForgeState(): MorphusForgeState {
  return {
    activeSubTab: 'crossroads',
    subTabCompleted: {},
    baseStatsApplied: false,
  }
}

export function resolveMorphusForgeState(
  character: Pick<Character, 'morphusForgeState'>,
): MorphusForgeState {
  return { ...defaultMorphusForgeState(), ...character.morphusForgeState }
}

export function isMorphusForgeCrossroadsComplete(state: MorphusForgeState): boolean {
  if (!state.path) return false
  if (state.path === 'appearance') {
    return !!state.appearanceEntryId?.trim()
  }
  return true
}

export function isMorphusForgeTraitTabComplete(
  state: MorphusForgeState,
  character?: Pick<Character, 'morphusForgeSlotState'>,
): boolean {
  if (!isMorphusForgeCrossroadsComplete(state)) return false
  if (!path2CharacteristicsCountValid(state)) return false
  if (!character) return state.path === 'appearance'
  return morphusTraitForgeReady(state, character)
}

export function isMorphusForgeReviewDiceComplete(
  character: Character,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
    race: import('../types').Race | undefined
    occ: import('../types').PalladiumOcc | undefined
  },
): boolean {
  const blocks = listPendingDiceBlocks(character, opts.race, opts.occ, {
    supportsDualForm: opts.supportsDualForm,
    psychicTier: opts.psychicTier,
    scope: 'morphus',
  })
  if (blocks.length === 0) return true
  return pendingDiceBlocksResolutionComplete(
    blocks,
    character.creationPendingDiceResolutions ?? {},
  )
}

export function isMorphusForgeComplete(
  character: Character,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
    race: import('../types').Race | undefined
    occ: import('../types').PalladiumOcc | undefined
  },
): boolean {
  const state = resolveMorphusForgeState(character)
  if (!isMorphusForgeTraitTabComplete(state, character)) return false
  if (!isMorphusForgeReviewDiceComplete(character, opts)) return false
  return character.creationTraitForgeStubComplete === true
}

function crossroadsBlockers(state: MorphusForgeState): string[] {
  const blockers: string[] = []
  if (!state.path) {
    blockers.push('Choose Path 1 (Appearance) or Path 2 (Personality Crafter).')
    return blockers
  }
  if (state.path === 'appearance' && !state.appearanceEntryId?.trim()) {
    blockers.push('Select an Appearance archetype.')
  }
  return blockers
}

function traitForgeBlockers(
  state: MorphusForgeState,
  character: Character,
): string[] {
  const blockers = crossroadsBlockers(state)
  if (blockers.length > 0) {
    blockers.unshift('Complete the Crossroads step first.')
    return blockers
  }
  if (state.path === 'characteristics') {
    const count = state.characteristicsPickCount
    const { notation, min, max } = MORPHUS_FORGE_MANIFEST.path2.countRoll
    if (count == null || count < min || count > max) {
      blockers.push(`Enter your physical ${notation} die result (${min}–${max}).`)
      return blockers
    }
  }
  if (!morphusTraitForgeReady(state, character)) {
    const { blockers: slotBlockers } = deriveMorphusSlotResolutionView(
      state,
      character.morphusForgeSlotState,
    )
    blockers.push(...slotBlockers.slice(0, 5))
    if (slotBlockers.length > 5) {
      blockers.push(`…and ${slotBlockers.length - 5} more unresolved slot(s).`)
    }
  }
  return blockers
}

function reviewBlockers(
  character: Character,
  ctx: MorphusForgeNavContext,
): string[] {
  const state = resolveMorphusForgeState(character)
  const blockers = traitForgeBlockers(state, character)
  if (blockers.length > 0) {
    blockers.unshift('Complete the Trait Forge step first.')
    return blockers
  }
  if (!isMorphusForgeReviewDiceComplete(character, ctx)) {
    blockers.push('Enter all Morphus physical die results.')
  }
  if (character.creationTraitForgeStubComplete !== true) {
    blockers.push('Click Finalize Morphus on this tab.')
  }
  return blockers
}

export type MorphusForgeNavContext = {
  supportsDualForm: boolean
  psychicTier: string
  race: import('../types').Race | undefined
  occ: import('../types').PalladiumOcc | undefined
}

function tab6Snapshot(state: MorphusForgeState): string {
  return JSON.stringify({
    path: state.path,
    appearanceEntryId: state.appearanceEntryId,
    characteristicsPickCount: state.characteristicsPickCount,
  })
}

function buildMorphusSubTabDefs(
  character: Character,
  ctx: MorphusForgeNavContext,
): ForgeTabDefinition<MorphusForgeSubTabId>[] {
  const state = resolveMorphusForgeState(character)
  return MORPHUS_FORGE_SUB_TAB_ORDER.map((id) => {
    const label = MORPHUS_FORGE_SUB_TAB_LABELS[id]
    switch (id) {
      case 'crossroads':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = crossroadsBlockers(state)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab6Snapshot(state),
        }
      case 'trait_forge':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = traitForgeBlockers(state, character)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab6Snapshot(state),
        }
      case 'review':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = reviewBlockers(character, ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () =>
            JSON.stringify({
              finalized: character.creationTraitForgeStubComplete === true,
              dice: isMorphusForgeReviewDiceComplete(character, ctx),
            }),
        }
      default:
        return {
          id,
          label,
          isNa: () => false,
          validate: () => ({ ok: false, blockers: ['Unknown step.'] }),
          snapshot: () => '',
        }
    }
  })
}

export function deriveMorphusForgeNavigation(
  character: Character,
  ctx: MorphusForgeNavContext,
): ForgeNavigationDerived & { activeSubTabId: MorphusForgeSubTabId } {
  const state = resolveMorphusForgeState(character)
  const activeSubTabId = state.activeSubTab ?? 'crossroads'
  const tabDefs = buildMorphusSubTabDefs(character, ctx)
  const completion = {
    completed: state.subTabCompleted ?? {},
    snapshots: state.subTabSnapshots ?? {},
  }
  const nav = deriveForgeNavigation(tabDefs, activeSubTabId, completion, {
    terminalTabId: 'review',
  })
  return { ...nav, activeSubTabId }
}

export function selectedAppearanceEntry(state: MorphusForgeState) {
  if (!state.appearanceEntryId) return undefined
  return MORPHUS_APPEARANCE_ROUTING_TABLE.entries.find(
    (e) => e.id === state.appearanceEntryId,
  )
}

/** Clearing downstream state when the player changes path or archetype. */
export function morphusForgeStateAfterPathChange(
  prev: MorphusForgeState,
  patch: Pick<MorphusForgeState, 'path' | 'appearanceEntryId'>,
): MorphusForgeState {
  const pathChanged = patch.path != null && patch.path !== prev.path
  const next: MorphusForgeState = {
    ...prev,
    ...patch,
  }
  if (pathChanged) {
    next.appearanceEntryId = undefined
    next.characteristicsPickCount = undefined
    next.subTabCompleted = {}
    next.subTabSnapshots = {}
    next.activeSubTab = 'crossroads'
  } else if (
    patch.appearanceEntryId != null &&
    patch.appearanceEntryId !== prev.appearanceEntryId
  ) {
    next.subTabCompleted = { ...prev.subTabCompleted }
    delete next.subTabCompleted.trait_forge
    delete next.subTabCompleted.review
  }
  return next
}
