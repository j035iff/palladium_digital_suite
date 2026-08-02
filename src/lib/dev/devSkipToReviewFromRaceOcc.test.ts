import { describe, expect, it } from 'vitest'
import { getAbilityById } from '../../data/abilityLibrary'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import { createBlankCharacterForGenre } from '../characterRoot'
import { isIdentitySpawnPrepComplete } from '../characterIdentity'
import {
  assessTab8SpawnBlockers,
  buildCharacterCreationForgeContext,
} from '../forgeNavigation/characterCreationForge'
import { raceLineageFromDefinition } from '../raceEngine'
import { applyOccSelectionToCharacterState } from '../shadowOcc'
import { resolvePsychicGateBypassed } from '../creationPhases'
import { syncRaceOccPrimarySdc } from '../creationRaceOccSync'
import { raceCatalogGenreId } from '../raceCatalog'
import { creationInvalidationPatch } from '../creationInvalidate'
import { buildDevSkipToReviewFromRaceOccState } from './devSkipToReviewFromRaceOcc'
import { DEV_SKIP_TO_REVIEW_CHARACTER_NAME } from './devSpawnIdentity'

function withRaceOcc(
  genreId: 'nightbane',
  raceId: string,
  occId: string,
) {
  const race = getRaceById(raceId, genreId)
  const blank = createBlankCharacterForGenre(genreId)
  let next = syncRaceOccPrimarySdc({
    ...blank,
    ...creationInvalidationPatch(blank, 'race'),
    raceId,
    lineage: raceLineageFromDefinition(race),
    psychicGateBypassed: resolvePsychicGateBypassed(raceId, undefined, genreId),
  })
  next = applyOccSelectionToCharacterState(next, occId, {
    activeForm: 'primary',
    invalidateScope: 'race',
  })
  return next
}

describe('buildDevSkipToReviewFromRaceOccState', () => {
  it('completes Nightbane Basic through Review & Spawn with Morphus', () => {
    const prev = withRaceOcc('nightbane', 'race_nightbane', 'occ_nightbane_basic')
    const next = buildDevSkipToReviewFromRaceOccState(prev)
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')

    expect(next.raceId).toBe('race_nightbane')
    expect(next.occ.id).toBe('occ_nightbane_basic')
    expect(next.creationForgeTab).toBe('tab8_review')
    expect(next.creationTraitForgeStubComplete).toBe(true)
    expect(next.creationMorphusDiceFinalized).toBe(true)
    expect(next.morphusTraitSlotResolutions?.length).toBeGreaterThan(0)
    expect(next.name).toBe(DEV_SKIP_TO_REVIEW_CHARACTER_NAME)
    expect(isIdentitySpawnPrepComplete(next.name, next.identityProfile)).toBe(true)
    expect(
      (next.selectedAbilities ?? []).some((id) => getAbilityById(id)?.category === 'Talent'),
    ).toBe(true)

    const ctx = buildCharacterCreationForgeContext(next, race, occ, 'none')
    expect(assessTab8SpawnBlockers(ctx)).toEqual([])
  })

  it('keeps Nightbane Sorcerer and fills starting spells plus Morphus', () => {
    const prev = withRaceOcc('nightbane', 'race_nightbane', 'occ_nightbane_sorcerer')
    const next = buildDevSkipToReviewFromRaceOccState(prev)
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_sorcerer')

    expect(next.occ.id).toBe('occ_nightbane_sorcerer')
    expect(next.creationForgeTab).toBe('tab8_review')
    expect(next.creationTraitForgeStubComplete).toBe(true)
    const spells = (next.selectedAbilities ?? []).filter(
      (id) => getAbilityById(id)?.category === 'Spell',
    )
    expect(spells.length).toBeGreaterThan(0)
    expect(
      (next.selectedAbilities ?? []).some((id) => getAbilityById(id)?.category === 'Talent'),
    ).toBe(true)

    const ctx = buildCharacterCreationForgeContext(
      next,
      race,
      occ,
      next.creationPsychicTier ?? 'none',
    )
    expect(assessTab8SpawnBlockers(ctx)).toEqual([])
  })

  it('completes Human Sorcerer without Morphus and fills spells', () => {
    const prev = withRaceOcc('nightbane', 'race_human', 'occ_sorcerer')
    const next = buildDevSkipToReviewFromRaceOccState(prev)
    const race = getRaceById(
      'race_human',
      raceCatalogGenreId(next.hostGenreId, next.creationGenreId),
    )
    const occ = getLibraryOccById('occ_sorcerer')

    expect(next.raceId).toBe('race_human')
    expect(next.creationForgeTab).toBe('tab8_review')
    expect(next.creationTraitForgeStubComplete).not.toBe(true)
    expect(next.morphusTraitSlotResolutions?.length ?? 0).toBe(0)
    const spells = (next.selectedAbilities ?? []).filter(
      (id) => getAbilityById(id)?.category === 'Spell',
    )
    expect(spells.length).toBeGreaterThan(0)

    const ctx = buildCharacterCreationForgeContext(
      next,
      race,
      occ,
      next.creationPsychicTier ?? 'none',
    )
    expect(assessTab8SpawnBlockers(ctx)).toEqual([])
  })

  it('auto-picks specialization for Human ADA and reaches Review & Spawn', () => {
    const prev = withRaceOcc('nightbane', 'race_human', 'occ_ada_field_agent')
    const next = buildDevSkipToReviewFromRaceOccState(prev)
    const race = getRaceById(
      'race_human',
      raceCatalogGenreId(next.hostGenreId, next.creationGenreId),
    )
    const occ = getLibraryOccById('occ_ada_field_agent')

    expect(next.occSpecializationId).toBeTruthy()
    expect(next.creationForgeTab).toBe('tab8_review')
    expect(isIdentitySpawnPrepComplete(next.name, next.identityProfile)).toBe(true)

    const ctx = buildCharacterCreationForgeContext(
      next,
      race,
      occ,
      next.creationPsychicTier ?? 'none',
    )
    expect(assessTab8SpawnBlockers(ctx)).toEqual([])
  })

  it('no-ops when race/O.C.C. are incomplete', () => {
    const blank = createBlankCharacterForGenre('nightbane')
    const next = buildDevSkipToReviewFromRaceOccState(blank)
    expect(next).toBe(blank)
  })
})
