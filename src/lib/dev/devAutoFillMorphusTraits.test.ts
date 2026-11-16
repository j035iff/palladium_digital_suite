import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import { morphusTraitForgeReady } from '../morphusSlotResolution'
import { buildDevSkipToMorphusCreationState } from './devSkipToMorphusCreation'
import {
  autoFillMorphusForgeSlotState,
  buildDevAutoFillMorphusTraitsState,
} from './devAutoFillMorphusTraits'

describe('buildDevAutoFillMorphusTraitsState', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('always uses Path 1 with a random player-selectable appearance archetype', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const prev = buildDevSkipToMorphusCreationState(
      createBlankCharacterForGenre('nightbane'),
    )
    const next = buildDevAutoFillMorphusTraitsState(prev)

    expect(next.creationForgeTab).toBe('tab6_traits')
    expect(next.morphusForgeState?.path).toBe('appearance')
    expect(next.morphusForgeState?.appearanceEntryId).toBeTruthy()
    expect(next.morphusForgeState?.activeSubTab).toBe('trait_forge')
    expect(next.morphusTraitSlotResolutions?.length).toBeGreaterThan(0)
    expect(
      morphusTraitForgeReady(next.morphusForgeState!, next),
    ).toBe(true)
  })

  it('no-ops for Guardian (Traits chrome unavailable)', () => {
    const prev = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_guardian',
      occ: { id: 'occ_guardian_rcc' },
    }
    const next = buildDevAutoFillMorphusTraitsState(prev)
    expect(next.morphusForgeState?.appearanceEntryId).toBeUndefined()
    expect(getRaceById('race_guardian')?.talentsAvailable).not.toBe(true)
    expect(getLibraryOccById('occ_guardian_rcc')).toBeDefined()
  })
})

describe('autoFillMorphusForgeSlotState', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('completes Amalgam Path 1 slot tree with random legal picks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
    const forgeState = {
      path: 'appearance' as const,
      appearanceEntryId: 'amalgam',
    }
    const slots = autoFillMorphusForgeSlotState(forgeState, {})
    expect(morphusTraitForgeReady(forgeState, { morphusForgeSlotState: slots })).toBe(
      true,
    )
  })
})
