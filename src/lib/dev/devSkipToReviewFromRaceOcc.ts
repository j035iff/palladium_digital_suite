import type { CharacterRootState } from '../../types'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import { assessConfiguratorPairConflict } from '../configuratorMatrix'
import { traitForgeTabApplicable } from '../creationSubForge'
import { resolveCreationPsychicTier } from '../creationPsychicSkills'
import {
  buildCharacterCreationForgeContext,
  completeForgeTab,
  forgeTabToLegacyPhase,
} from '../forgeNavigation/characterCreationForge'
import { raceCatalogGenreId } from '../raceCatalog'
import { raceCanPickOcc } from '../raceEngine'
import { raceForcedOccId } from '../shadowOcc'
import { buildDevAutoFillCreationAbilitiesState } from './devAutoFillCreationAbilities'
import {
  buildDevFillThroughFacadeState,
  ensureDevOccSpecialization,
} from './devFillThroughFacade'
import { buildDevSkipToReviewFromMorphusState } from './devSkipToReviewFromMorphus'
import { withDevSpawnIdentity } from './devSpawnIdentity'

function canDevSkipFromConfigurator(
  prev: CharacterRootState,
  race: NonNullable<ReturnType<typeof getRaceById>>,
  occ: NonNullable<ReturnType<typeof getLibraryOccById>>,
): boolean {
  if (!prev.raceId) return false
  if (!prev.occ?.id || !prev.occ.xpTable?.floors?.length) return false

  const picksOcc = raceCanPickOcc(race)
  const forcedShadowOcc = raceForcedOccId(race)
  if (picksOcc) {
    const pair = assessConfiguratorPairConflict(race, occ, null)
    if (pair) return false
    return true
  }
  if (forcedShadowOcc) {
    return prev.occ.id === forcedShadowOcc
  }
  return true
}

/**
 * Dev-only: from the currently selected race/O.C.C., auto-complete creation through
 * Review & Spawn (Morphus + abilities when applicable).
 */
export function buildDevSkipToReviewFromRaceOccState(
  prev: CharacterRootState,
): CharacterRootState {
  const genreId = raceCatalogGenreId(prev.hostGenreId, prev.creationGenreId)
  const race = getRaceById(prev.raceId ?? '', genreId)
  const occ = prev.occ?.id ? getLibraryOccById(prev.occ.id) : undefined
  if (!race || !occ) return prev
  if (!canDevSkipFromConfigurator(prev, race, occ)) return prev

  // Auto-pick specialization when required so Human + ADA/etc. can proceed.
  const prepared = ensureDevOccSpecialization(prev, occ)

  if (traitForgeTabApplicable(race, occ)) {
    const facade = buildDevFillThroughFacadeState(prepared, race, occ, {
      endAt: 'morphus',
    })
    return buildDevSkipToReviewFromMorphusState(facade)
  }

  let next = buildDevFillThroughFacadeState(prepared, race, occ, {
    endAt: 'finalize',
  })
  next = buildDevAutoFillCreationAbilitiesState(next)
  next = withDevSpawnIdentity(next)

  const psychicTier = resolveCreationPsychicTier(
    next,
    next.creationPsychicTier ?? 'none',
  )
  const ctx = buildCharacterCreationForgeContext(
    { ...next, creationGenreId: next.creationGenreId },
    race,
    occ,
    psychicTier,
  )
  next = { ...next, ...completeForgeTab(next, 'tab7_abilities', ctx) }

  return {
    ...next,
    creationForgeTab: 'tab8_review',
    creationPhase: forgeTabToLegacyPhase('tab8_review'),
  }
}
