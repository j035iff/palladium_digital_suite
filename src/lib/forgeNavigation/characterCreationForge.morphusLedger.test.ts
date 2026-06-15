import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import {
  forgeTabVisitUnlocksMorphusLedger,
  isMorphusLedgerUnlocked,
  morphusLedgerUnlockPatchIfEligible,
} from './characterCreationForge'

describe('Morphus ledger unlock', () => {
  const nightbane = getRaceById('nightbane')
  const occ = getLibraryOccById('occ_nightbane_basic')

  const throughRollPending = {
    tab1_configurator: true as const,
    tab2_attributes: true as const,
    tab3_psionic: true as const,
    tab4_skills: true as const,
    tab5_finalize: true as const,
  }

  it('does not unlock until Traits is visited', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'nightbane',
      creationForgeTab: 'tab5_finalize' as const,
      creationForgeCompleted: throughRollPending,
      creationFacadeDiceFinalized: true,
    }
    expect(isMorphusLedgerUnlocked(character, nightbane, occ, 'none')).toBe(false)
  })

  it('stays unlocked after upstream forge rollback once Traits was opened', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'nightbane',
      creationMorphusLedgerUnlocked: true,
      creationForgeTab: 'tab5_finalize' as const,
      creationForgeCompleted: {},
      creationFacadeDiceFinalized: false,
    }
    expect(isMorphusLedgerUnlocked(character, nightbane, occ, 'none')).toBe(true)
  })

  it('sets sticky unlock when navigating to Traits', () => {
    const prev = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'nightbane',
      creationForgeTab: 'tab5_finalize' as const,
      creationForgeCompleted: throughRollPending,
      creationFacadeDiceFinalized: true,
    }
    expect(forgeTabVisitUnlocksMorphusLedger('tab6_traits')).toBe(true)
    expect(
      morphusLedgerUnlockPatchIfEligible(prev, 'tab6_traits', nightbane, occ, 'none'),
    ).toEqual({ creationMorphusLedgerUnlocked: true })
    expect(
      morphusLedgerUnlockPatchIfEligible(
        { ...prev, creationMorphusLedgerUnlocked: true },
        'tab4_skills',
        nightbane,
        occ,
        'none',
      ),
    ).toEqual({})
    expect(
      morphusLedgerUnlockPatchIfEligible(
        {
          ...prev,
          creationForgeCompleted: {},
          creationFacadeDiceFinalized: false,
        },
        'tab6_traits',
        nightbane,
        occ,
        'none',
      ),
    ).toEqual({})
  })
})
