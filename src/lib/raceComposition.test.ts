import { describe, expect, it } from 'vitest'
import { getPalladiumRaceById } from '../data/library/raceCatalogLoader'
import {
  isCreatureRace,
  isRccRace,
  raceUsesOccSkillProgram,
  resolveRaceComposition,
} from './raceComposition'

describe('raceComposition', () => {
  it('resolves creature rows from catalog', () => {
    const coyote = getPalladiumRaceById('race_waste_coyote', 'nightbane')
    expect(coyote?.raceAudience).toBe('creature')
    expect(coyote?.raceComposition).toBe('creature')
    expect(resolveRaceComposition(coyote)).toBe('creature')
    expect(isCreatureRace(coyote)).toBe(true)
    expect(raceUsesOccSkillProgram(coyote)).toBe(false)
  })

  it('resolves rcc from forcedOccId when composition omitted', () => {
    const wild = getPalladiumRaceById('race_wild_vampire', 'nightbane')
    expect(resolveRaceComposition(wild)).toBe('rcc')
    expect(isRccRace(wild)).toBe(true)
    expect(raceUsesOccSkillProgram(wild)).toBe(true)
  })

  it('resolves playable character races', () => {
    const human = getPalladiumRaceById('race_human', 'nightbane')
    expect(resolveRaceComposition(human)).toBe('character')
    expect(raceUsesOccSkillProgram(human)).toBe(true)
  })

  it('npc minions without forcedOccId do not use occ skill program', () => {
    const astralEntity = getPalladiumRaceById('race_astral_entity', 'nightbane')
    expect(astralEntity?.canPickOcc).toBe(false)
    expect(astralEntity?.forcedOccId).toBeUndefined()
    expect(resolveRaceComposition(astralEntity)).toBe('character')
    expect(raceUsesOccSkillProgram(astralEntity)).toBe(false)
  })
})
