import type {
  CharacterRootState,
  MorphusForgeSlotState,
  MorphusForgeState,
  MorphusSlotNode,
} from '../../types'
import {
  listPlayerSelectableMorphusForgeRoutingEntries,
  MORPHUS_APPEARANCE_ROUTING_TABLE,
} from '../../data/library/morphusForgeRoutingLoader'
import { getMorphusCharacteristicById } from '../../data/library/morphusTableCatalogLoader'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import { creationTraitsTabVisible } from '../creationChromeGates'
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
import { pickRandom, shuffledCopy } from './devRandomPick'

const MAX_SLOT_RESOLVE_STEPS = 250

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
  const legal = shuffledCopy(node.pickEntries ?? []).filter((entry) => {
    if (entry.disabled) return false
    const catalog = getMorphusCharacteristicById(entry.id)
    if (catalog?.customTraitResolution) return false
    if (
      isMorphusTraitPickAlreadySelected(node, entry.id, selectedIds, slotState)
    ) {
      return false
    }
    return true
  })
  return pickRandom(legal)?.id
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
    const option = pickRandom(node.options)
    if (!option) return null
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      branchTableIds: { [node.path]: option.tableId },
    })
  }

  if (node.kind === 'dice' && node.diceSpec) {
    const { min, max } = node.diceSpec
    const value = min + Math.floor(Math.random() * (max - min + 1))
    const dicePath = `${node.path}/count`
    const cleared = clearMorphusSlotPathState(slotState, node.path)
    return patchMorphusForgeSlotState(cleared, {
      diceValues: { [dicePath]: value },
    })
  }

  if (node.kind === 'sub_trait_choice') {
    const match = /^(.*)\/sub:(\d+)$/.exec(node.path)
    if (!match || !node.pickEntries?.length) return null
    const parentPath = match[1]!
    const index = Number(match[2])
    const subTraitKey = `${parentPath}#${index}`
    const legal = shuffledCopy(node.pickEntries).filter((entry) => {
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
    const pick = pickRandom(legal)
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
 * Picks randomly among legal catalog/branch options (skips duplicates / blocked).
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
 * Dev-only Traits auto-select: always Path 1, random appearance archetype,
 * then random legal category/slot picks. Stays on Traits (trait forge).
 * Retries other random archetypes if the first stalls on custom-only gates.
 */
export function buildDevAutoFillMorphusTraitsState(
  prev: CharacterRootState,
): CharacterRootState {
  const race = getRaceById(prev.raceId ?? '')
  const occ = getLibraryOccById(prev.occ.id)
  if (!creationTraitsTabVisible(race, occ)) return prev

  const archetypes = shuffledCopy(
    listPlayerSelectableMorphusForgeRoutingEntries(
      MORPHUS_APPEARANCE_ROUTING_TABLE,
    ),
  )
  if (archetypes.length === 0) return prev

  let best: CharacterRootState | null = null

  for (const appearance of archetypes) {
    const forgeState: MorphusForgeState = {
      ...defaultMorphusForgeState(),
      path: 'appearance',
      appearanceEntryId: appearance.id,
      activeSubTab: 'trait_forge',
      subTabCompleted: {
        crossroads: true,
      },
      baseStatsApplied: true,
    }

    let next = applyNightbaneMorphusBaseAttributes(
      {
        ...prev,
        morphusForgeState: forgeState,
        morphusForgeSlotState: clearMorphusForgeSlotState(),
        morphusTraitSlotResolutions: [],
        activeMorphusCharacteristicIds: [],
        creationTraitForgeStubComplete: false,
        creationMorphusDiceFinalized: false,
        creationForgeTab: 'tab6_traits',
        creationPhase: 'morphus',
      },
      occ ?? undefined,
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

    best = next
    if (morphusTraitForgeReady(forgeState, next)) {
      return next
    }
  }

  return best ?? prev
}
