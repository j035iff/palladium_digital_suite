import type {
  CharacterRootState,
  MorphusForgeSlotState,
  MorphusForgeState,
  MorphusSlotNode,
} from '../../types'
import { getMorphusCharacteristicById } from '../../data/library/morphusTableCatalogLoader'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import {
  buildCharacterCreationForgeContext,
  completeForgeTab,
  forgeTabToLegacyPhase,
} from '../forgeNavigation/characterCreationForge'
import {
  defaultMorphusForgeState,
  resolveMorphusForgeState,
} from '../morphusForgeNavigation'
import { applyNightbaneMorphusBaseAttributes } from '../morphusNightbaneBase'
import {
  buildMorphusSlotTree,
  clearMorphusForgeSlotState,
  clearMorphusSlotPathState,
  collectSelectedMorphusCatalogEntryIds,
  deriveMorphusSlotResolutionView,
  flattenMorphusSlotNodes,
  isMorphusSlotTreeComplete,
  isMorphusSubTraitTablePickBlocked,
  isMorphusTraitPickAlreadySelected,
  morphusTraitForgeReady,
  patchMorphusForgeSlotState,
} from '../morphusSlotResolution'
import { raceLineageFromDefinition } from '../raceEngine'
import { applyMorphusPendingDiceResolutions } from '../spawnVitalityManual'
import { buildDevAutoFillCreationAbilitiesState } from './devAutoFillCreationAbilities'
import { buildDevSkipToMorphusCreationState } from './devSkipToMorphusCreation'
import { buildAutoRolledPendingDiceResolutions } from './devAutoRollPendingDice'
import {
  DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
  DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE,
  withDevSpawnIdentity,
} from './devSpawnIdentity'

export {
  DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
  DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE,
} from './devSpawnIdentity'

/** Fixed Path 1 archetype — three required tables, no choice/custom gates. */
export const DEV_MORPHUS_APPEARANCE_ENTRY_ID = 'amalgam'

const MAX_SLOT_RESOLVE_STEPS = 250
const PSYCHIC_TIER = 'none' as const

function syncMorphusTraitSlots(prev: CharacterRootState): CharacterRootState {
  const forgeState = resolveMorphusForgeState(prev)
  const view = deriveMorphusSlotResolutionView(
    forgeState,
    prev.morphusForgeSlotState,
  )
  return {
    ...prev,
    morphusTraitSlotResolutions: view.traitSlots,
    activeMorphusCharacteristicIds: view.traitSlots.map(
      (slot) => slot.catalogEntryId,
    ),
  }
}

/** Hub routers stay `ready` while children are incomplete but have no pick UI. */
function isActionableReadyNode(node: MorphusSlotNode): boolean {
  if (node.status !== 'ready') return false
  if (node.kind === 'choice') return (node.options?.length ?? 0) > 0
  if (node.kind === 'dice') return node.diceSpec != null
  if (node.kind === 'custom_trait') return false
  return (node.pickEntries?.length ?? 0) > 0
}

function firstActionableReadyNode(
  nodes: readonly MorphusSlotNode[],
): MorphusSlotNode | undefined {
  return flattenMorphusSlotNodes(nodes).find(isActionableReadyNode)
}

function pickCatalogEntryId(
  node: MorphusSlotNode,
  slotState: MorphusForgeSlotState,
  selectedIds: ReadonlySet<string>,
): string | undefined {
  const entries = node.pickEntries ?? []
  for (const entry of entries) {
    if (entry.disabled) continue
    const catalog = getMorphusCharacteristicById(entry.id)
    if (catalog?.customTraitResolution) continue
    if (
      isMorphusTraitPickAlreadySelected(
        node,
        entry.id,
        selectedIds,
        slotState,
      )
    ) {
      continue
    }
    return entry.id
  }
  return undefined
}

function applyReadyNode(
  forgeState: MorphusForgeState,
  slotState: MorphusForgeSlotState,
  node: MorphusSlotNode,
  houseRules: CharacterRootState['morphusHouseRules'],
): MorphusForgeSlotState | null {
  const nodes = buildMorphusSlotTree(forgeState, slotState)
  const selectedIds = collectSelectedMorphusCatalogEntryIds(nodes, slotState)

  if (node.kind === 'choice' && node.options?.length) {
    const option = node.options[0]!
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      branchTableIds: { [node.path]: option.tableId },
    })
  }

  if (node.kind === 'dice' && node.diceSpec) {
    const dicePath = `${node.path}/count`
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      diceValues: { [dicePath]: node.diceSpec.min },
    })
  }

  if (node.kind === 'sub_trait_choice') {
    const match = /^(.*)\/sub:(\d+)$/.exec(node.path)
    if (!match || !node.pickEntries?.length) return null
    const parentPath = match[1]!
    const index = Number(match[2])
    const subTraitKey = `${parentPath}#${index}`
    const pick = node.pickEntries.find((entry) => {
      if (entry.disabled) return false
      if (
        isMorphusSubTraitTablePickBlocked(
          entry.id,
          slotState,
          houseRules,
          subTraitKey,
        )
      ) {
        return false
      }
      if (
        isMorphusTraitPickAlreadySelected(
          node,
          entry.id,
          selectedIds,
          slotState,
        )
      ) {
        return false
      }
      return true
    })
    if (!pick) return null
    const subPath = `${parentPath}/sub:${index}`
    const cleared = clearMorphusSlotPathState(slotState, subPath)
    return patchMorphusForgeSlotState(cleared, {
      subTraitPicks: { [subTraitKey]: pick.id },
    })
  }

  if (node.kind === 'variant_choice') {
    const label = pickCatalogEntryId(node, slotState, selectedIds)
    if (!label) return null
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      variantPicks: { [node.path]: label },
    })
  }

  if (node.kind === 'table' || node.kind === 'characteristic') {
    const entryId = pickCatalogEntryId(node, slotState, selectedIds)
    if (!entryId) return null
    const isCharacteristics =
      node.kind === 'characteristic' || node.tableId === 'characteristics'
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      ...(isCharacteristics
        ? { routingPicks: { [node.path]: entryId } }
        : { picks: { [node.path]: entryId } }),
    })
  }

  return null
}

/**
 * Walk Morphus Trait Forge ready nodes until the slot tree is complete.
 * Prefers non-custom catalog picks; skips already-selected / duplicate rows.
 */
export function autoFillMorphusForgeSlotState(
  forgeState: MorphusForgeState,
  initialSlotState: MorphusForgeSlotState | undefined,
  houseRules?: CharacterRootState['morphusHouseRules'],
): MorphusForgeSlotState {
  let slotState = initialSlotState ?? clearMorphusForgeSlotState()

  for (let step = 0; step < MAX_SLOT_RESOLVE_STEPS; step += 1) {
    const nodes = buildMorphusSlotTree(forgeState, slotState)
    if (isMorphusSlotTreeComplete(nodes)) return slotState

    const ready = firstActionableReadyNode(nodes)
    if (!ready) return slotState

    const next = applyReadyNode(forgeState, slotState, ready, houseRules)
    if (!next) return slotState
    slotState = next
  }

  return slotState
}

/**
 * Dev-only: fill Morphus traits (Amalgam), roll Morphus dice, fill abilities,
 * fill spawn identity, and jump to Review & Spawn ready to finalize.
 */
export function buildDevSkipToReviewFromMorphusState(
  prev: CharacterRootState,
): CharacterRootState {
  const priorRace = getRaceById(prev.raceId ?? '')
  const facadeReady =
    prev.creationPrimaryDiceFinalized === true &&
    raceLineageFromDefinition(priorRace) === 'nightbane'

  let next = facadeReady
    ? prev
    : buildDevSkipToMorphusCreationState(prev)

  const race = getRaceById(next.raceId ?? 'race_nightbane')
  const occ = getLibraryOccById(next.occ.id)
  if (!race || !occ) return prev

  const forgeState: MorphusForgeState = {
    ...defaultMorphusForgeState(),
    path: 'appearance',
    appearanceEntryId: DEV_MORPHUS_APPEARANCE_ENTRY_ID,
    activeSubTab: 'review',
    subTabCompleted: {
      crossroads: true,
      trait_forge: true,
      review: true,
    },
    baseStatsApplied: true,
  }

  next = applyNightbaneMorphusBaseAttributes(
    {
      ...next,
      morphusForgeState: forgeState,
      morphusForgeSlotState: clearMorphusForgeSlotState(),
      morphusTraitSlotResolutions: [],
      activeMorphusCharacteristicIds: [],
      creationTraitForgeStubComplete: false,
      creationMorphusDiceFinalized: false,
    },
    occ,
  )

  const filledSlots = autoFillMorphusForgeSlotState(
    forgeState,
    clearMorphusForgeSlotState(),
    next.morphusHouseRules,
  )
  next = syncMorphusTraitSlots({
    ...next,
    morphusForgeSlotState: filledSlots,
  })

  if (!morphusTraitForgeReady(forgeState, next)) {
    return next
  }

  const morphusDice = buildAutoRolledPendingDiceResolutions(next, race, occ, {
    supportsDualForm: true,
    psychicTier: PSYCHIC_TIER,
    scope: 'morphus',
  })
  next = {
    ...next,
    creationPendingDiceResolutions: {
      ...(next.creationPendingDiceResolutions ?? {}),
      ...morphusDice,
    },
    creationTraitForgeStubComplete: true,
  }

  next = applyMorphusPendingDiceResolutions(next, race, occ, {
    supportsDualForm: true,
    psychicTier: PSYCHIC_TIER,
  })

  let ctx = buildCharacterCreationForgeContext(
    { ...next, creationGenreId: next.creationGenreId },
    race,
    occ,
    PSYCHIC_TIER,
  )
  next = { ...next, ...completeForgeTab(next, 'tab6_traits', ctx) }

  next = buildDevAutoFillCreationAbilitiesState(next)

  ctx = buildCharacterCreationForgeContext(
    { ...next, creationGenreId: next.creationGenreId },
    race,
    occ,
    PSYCHIC_TIER,
  )
  next = { ...next, ...completeForgeTab(next, 'tab7_abilities', ctx) }

  return withDevSpawnIdentity({
    ...next,
    creationForgeTab: 'tab8_review',
    creationPhase: forgeTabToLegacyPhase('tab8_review'),
  })
}
