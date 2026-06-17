import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import {
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
  isMorphusLedgerUnlocked,
} from '../forgeNavigation/characterCreationForge'
import { buildDevSkipToMorphusCreationState } from './devSkipToMorphusCreation'

describe('buildDevSkipToMorphusCreationState', () => {
  it('prepares Nightbane Basic through facade dice and opens Morphus tab', () => {
    const prev = createBlankCharacterForGenre('nightbane')
    const next = buildDevSkipToMorphusCreationState(prev)
    const race = getRaceById('nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')

    expect(next.raceId).toBe('nightbane')
    expect(next.occ.id).toBe('occ_nightbane_basic')
    expect(next.creationForgeTab).toBe('tab6_traits')
    expect(next.creationPhase).toBe('morphus')
    expect(next.creationPrimaryDiceFinalized).toBe(true)
    expect(next.creationTraitForgeStubComplete).toBe(false)
    expect(next.morphusForgeState?.activeSubTab).toBe('crossroads')
    expect(isMorphusLedgerUnlocked(next, race, occ, 'none')).toBe(true)

    const ctx = buildCharacterCreationForgeContext(next, race, occ, 'none')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab6_traits')
    const morphusTab = nav.tabs.find((t) => t.id === 'tab6_traits')
    expect(morphusTab?.clickable).toBe(true)
    expect(morphusTab?.visual).not.toBe('locked')
  })
})
