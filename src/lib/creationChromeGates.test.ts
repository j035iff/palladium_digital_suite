import { describe, expect, it } from 'vitest'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  creationDevSkipToMorphusVisible,
  creationRandomPsionicsTabHiddenForPsychicClass,
  creationTalentsAvailable,
  creationTraitsTabVisible,
} from './creationChromeGates'
import { occIsNaturalPsychicClass } from './creationPhases'
import {
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
} from './forgeNavigation/characterCreationForge'
import { createBlankCharacterForGenre } from './characterRoot'
import { traitForgeTabApplicable } from './creationSubForge'

describe('creationChromeGates', () => {
  it('shows Traits only for Nightbane Morphus binding, not Guardian lineage', () => {
    const nightbane = getRaceById('race_nightbane')
    const guardian = getRaceById('race_guardian')
    expect(creationTraitsTabVisible(nightbane, undefined)).toBe(true)
    expect(traitForgeTabApplicable(guardian, undefined)).toBe(false)
    expect(creationTraitsTabVisible(guardian, undefined)).toBe(false)
  })

  it('omits Traits from derived nav for Guardian', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_guardian',
      occ: { id: 'occ_guardian_rcc' },
    }
    const race = getRaceById('race_guardian')
    const occ = getLibraryOccById('occ_guardian_rcc')
    const ctx = buildCharacterCreationForgeContext(character, race, occ, 'none')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab1_configurator')
    expect(nav.tabs.some((t) => t.id === 'tab6_traits')).toBe(false)
  })

  it('keeps Traits in derived nav for Nightbane', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const ctx = buildCharacterCreationForgeContext(character, race, occ, 'none')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab1_configurator')
    expect(nav.tabs.some((t) => t.id === 'tab6_traits')).toBe(true)
  })

  it('gates Talents chrome solely via talentsAvailable flags', () => {
    const nightbane = getRaceById('race_nightbane')
    const guardian = getRaceById('race_guardian')
    const basic = getLibraryOccById('occ_nightbane_basic')
    expect(nightbane?.talentsAvailable).toBe(true)
    expect(creationTalentsAvailable(nightbane, basic)).toBe(true)
    expect(creationTalentsAvailable(guardian, getLibraryOccById('occ_guardian_rcc'))).toBe(
      false,
    )
    expect(
      creationTalentsAvailable(undefined, {
        ...basic!,
        talentsAvailable: true,
      }),
    ).toBe(true)
  })

  it('hides Random Psionics for psychic O.C.C. using occIsNaturalPsychicClass', () => {
    const psychic = getLibraryOccById('occ_pab_psychic_agent')
    expect(occIsNaturalPsychicClass(psychic)).toBe(true)
    expect(creationRandomPsionicsTabHiddenForPsychicClass(psychic)).toBe(true)

    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_human',
      occ: { id: 'occ_pab_psychic_agent' },
    }
    const race = getRaceById('race_human')
    const ctx = buildCharacterCreationForgeContext(character, race, psychic, 'master')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab1_configurator')
    expect(nav.tabs.some((t) => t.id === 'tab3_psionic')).toBe(false)
  })

  it('shows Skip → Morphus only for race_nightbane', () => {
    expect(creationDevSkipToMorphusVisible('race_nightbane')).toBe(true)
    expect(creationDevSkipToMorphusVisible('race_guardian')).toBe(false)
    expect(creationDevSkipToMorphusVisible(undefined)).toBe(false)
  })
})
