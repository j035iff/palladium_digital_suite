import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import { isIdentitySpawnPrepComplete } from '../characterIdentity'
import {
  assessTab8SpawnBlockers,
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
} from '../forgeNavigation/characterCreationForge'
import { isMorphusForgeComplete, resolveMorphusForgeState } from '../morphusForgeNavigation'
import { morphusTraitForgeReady } from '../morphusSlotResolution'
import {
  autoFillMorphusForgeSlotState,
  buildDevSkipToReviewFromMorphusState,
  DEV_MORPHUS_APPEARANCE_ENTRY_ID,
  DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
} from './devSkipToReviewFromMorphus'
import { buildDevSkipToMorphusCreationState } from './devSkipToMorphusCreation'

describe('autoFillMorphusForgeSlotState', () => {
  it('completes Amalgam Path 1 slot tree', () => {
    const forgeState = {
      path: 'appearance' as const,
      appearanceEntryId: DEV_MORPHUS_APPEARANCE_ENTRY_ID,
    }
    const slots = autoFillMorphusForgeSlotState(forgeState, {})
    expect(morphusTraitForgeReady(forgeState, { morphusForgeSlotState: slots })).toBe(
      true,
    )
  })
})

describe('buildDevSkipToReviewFromMorphusState', () => {
  it('fills Morphus + talent and opens Review & Spawn', () => {
    const prev = buildDevSkipToMorphusCreationState(
      createBlankCharacterForGenre('nightbane'),
    )
    const next = buildDevSkipToReviewFromMorphusState(prev)
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')

    expect(next.creationForgeTab).toBe('tab8_review')
    expect(next.creationPhase).toBe('review')
    expect(next.morphusForgeState?.path).toBe('appearance')
    expect(next.morphusForgeState?.appearanceEntryId).toBe(
      DEV_MORPHUS_APPEARANCE_ENTRY_ID,
    )
    expect(next.creationTraitForgeStubComplete).toBe(true)
    expect(next.creationMorphusDiceFinalized).toBe(true)
    expect(next.morphusTraitSlotResolutions?.length).toBeGreaterThan(0)
    expect(
      (next.selectedAbilities ?? []).some((id) => id.startsWith('talent_')),
    ).toBe(true)

    const forgeState = resolveMorphusForgeState(next)
    expect(morphusTraitForgeReady(forgeState, next)).toBe(true)
    expect(
      isMorphusForgeComplete(next, {
        supportsDualForm: true,
        psychicTier: 'none',
        race,
        occ,
      }),
    ).toBe(true)

    expect(next.name).toBe(DEV_SKIP_TO_REVIEW_CHARACTER_NAME)
    expect(next.primary.alignment?.trim()).toBeTruthy()
    expect(isIdentitySpawnPrepComplete(next.name, next.identityProfile)).toBe(true)

    const ctx = buildCharacterCreationForgeContext(next, race, occ, 'none')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab8_review')
    const review = nav.tabs.find((t) => t.id === 'tab8_review')
    expect(review?.clickable).toBe(true)
    expect(review?.visual).not.toBe('locked')
    expect(assessTab8SpawnBlockers(ctx)).toEqual([])
  })
})
