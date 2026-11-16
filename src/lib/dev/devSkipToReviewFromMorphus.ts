import type { CharacterRootState, MorphusForgeState } from '../../types'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import {
  buildCharacterCreationForgeContext,
  completeForgeTab,
  forgeTabToLegacyPhase,
} from '../forgeNavigation/characterCreationForge'
import { defaultMorphusForgeState } from '../morphusForgeNavigation'
import { applyNightbaneMorphusBaseAttributes } from '../morphusNightbaneBase'
import {
  clearMorphusForgeSlotState,
  deriveMorphusSlotResolutionView,
  morphusTraitForgeReady,
} from '../morphusSlotResolution'
import { raceLineageFromDefinition } from '../raceEngine'
import { applyMorphusPendingDiceResolutions } from '../spawnVitalityManual'
import { autoFillMorphusForgeSlotState } from './devAutoFillMorphusTraits'
import { buildDevAutoFillCreationAbilitiesState } from './devAutoFillCreationAbilities'
import { buildDevSkipToMorphusCreationState } from './devSkipToMorphusCreation'
import { buildAutoRolledPendingDiceResolutions } from './devAutoRollPendingDice'
import { withDevSpawnIdentity } from './devSpawnIdentity'

export {
  DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
  DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE,
} from './devSpawnIdentity'

export { autoFillMorphusForgeSlotState } from './devAutoFillMorphusTraits'

/** Fixed Path 1 archetype for Skip → Review — three required tables, no choice/custom gates. */
export const DEV_MORPHUS_APPEARANCE_ENTRY_ID = 'amalgam'

const PSYCHIC_TIER = 'none' as const

function syncMorphusTraitSlots(prev: CharacterRootState): CharacterRootState {
  const forgeState = prev.morphusForgeState ?? defaultMorphusForgeState()
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

/**
 * Dev-only: fill Morphus traits (Amalgam), roll Morphus dice, fill abilities,
 * fill spawn identity, and jump to Review & Spawn ready to finalize.
 * Slot picks within Amalgam are random among legal options.
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
  next = { ...next, ...completeForgeTab(next, 'tab8_gear', ctx) }

  return withDevSpawnIdentity({
    ...next,
    creationForgeTab: 'tab9_review',
    creationPhase: forgeTabToLegacyPhase('tab9_review'),
  })
}
