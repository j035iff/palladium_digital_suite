import type { CharacterCreationForgeTabId, CharacterRootState } from '../../types'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import { syncCreationAttributeBranches } from '../creationAttributeSync'
import { creationInvalidationPatch } from '../creationInvalidate'
import { resolvePsychicGateBypassed } from '../creationPhases'
import { syncRaceOccFacadeSdc } from '../creationRaceOccSync'
import { raceLineageFromDefinition } from '../raceEngine'
import { applyOccSelectionToCharacterState } from '../shadowOcc'
import { applyFacadePendingDiceResolutions } from '../spawnVitalityManual'
import {
  buildCharacterCreationForgeContext,
  completeForgeTab,
  morphusLedgerUnlockPatchIfEligible,
} from '../forgeNavigation/characterCreationForge'
import { defaultMorphusForgeState } from '../morphusForgeNavigation'
import { buildDevAutoAttributeCreationState } from './devAutoAssignCreationAttributes'
import { buildDevAutoFillCreationSkillsState } from './devAutoFillCreationSkills'
import { buildAutoRolledPendingDiceResolutions } from './devAutoRollPendingDice'

export const DEV_NIGHTBANE_MORPHUS_RACE_ID = 'nightbane'
export const DEV_NIGHTBANE_MORPHUS_OCC_ID = 'occ_nightbane_basic'
export const DEV_NIGHTBANE_MORPHUS_ALIGNMENT = 'Unprincipled'

const FORGE_TABS_BEFORE_MORPHUS: readonly CharacterCreationForgeTabId[] = [
  'tab1_configurator',
  'tab2_attributes',
  'tab3_psionic',
  'tab4_skills',
  'tab5_finalize',
] as const

const PSYCHIC_TIER = 'none' as const

function markForgeTabsComplete(
  state: CharacterRootState,
): CharacterRootState {
  const race = getRaceById(state.raceId ?? DEV_NIGHTBANE_MORPHUS_RACE_ID)
  const occ = getLibraryOccById(state.occ.id)
  const ctx = buildCharacterCreationForgeContext(
    { ...state, creationGenreId: state.creationGenreId },
    race,
    occ,
    PSYCHIC_TIER,
  )

  let next = state
  for (const tabId of FORGE_TABS_BEFORE_MORPHUS) {
    next = { ...next, ...completeForgeTab(next, tabId, ctx) }
  }
  return next
}

/**
 * Dev-only: Nightbane + Basic Skill Package through facade dice, ready for Morphus Sub-Forge.
 */
export function buildDevSkipToMorphusCreationState(
  prev: CharacterRootState,
): CharacterRootState {
  const race = getRaceById(DEV_NIGHTBANE_MORPHUS_RACE_ID)
  const occ = getLibraryOccById(DEV_NIGHTBANE_MORPHUS_OCC_ID)
  if (!race || !occ) return prev

  let next = syncRaceOccFacadeSdc({
    ...prev,
    ...creationInvalidationPatch(prev, 'race'),
    raceId: DEV_NIGHTBANE_MORPHUS_RACE_ID,
    lineage: raceLineageFromDefinition(race),
    psychicGateBypassed: resolvePsychicGateBypassed(
      DEV_NIGHTBANE_MORPHUS_RACE_ID,
      undefined,
      prev.creationGenreId,
    ),
  })

  next = applyOccSelectionToCharacterState(next, DEV_NIGHTBANE_MORPHUS_OCC_ID, {
    activeForm: 'facade',
    invalidateScope: 'race',
  })

  next = {
    ...next,
    facade: {
      ...next.facade,
      alignment: DEV_NIGHTBANE_MORPHUS_ALIGNMENT,
    },
  }

  next = buildDevAutoAttributeCreationState(next, race.attributes, occ)
  next = syncRaceOccFacadeSdc(syncCreationAttributeBranches(next, occ))

  next = buildDevAutoFillCreationSkillsState(
    next,
    occ,
    next.hostGenreId ?? next.creationGenreId,
    PSYCHIC_TIER,
  )

  const resolutions = buildAutoRolledPendingDiceResolutions(next, race, occ, {
    supportsDualForm: true,
    psychicTier: PSYCHIC_TIER,
  })
  next = {
    ...next,
    creationPendingDiceResolutions: resolutions,
  }

  next = applyFacadePendingDiceResolutions(next, race, occ, {
    supportsDualForm: true,
    psychicTier: PSYCHIC_TIER,
  })

  next = markForgeTabsComplete(next)

  next = {
    ...next,
    morphusForgeState: defaultMorphusForgeState(),
    creationTraitForgeStubComplete: false,
    creationMorphusDiceFinalized: false,
    creationForgeTab: 'tab6_traits',
    creationPhase: 'morphus',
    ...morphusLedgerUnlockPatchIfEligible(
      next,
      'tab6_traits',
      race,
      occ,
      PSYCHIC_TIER,
    ),
  }

  return next
}
