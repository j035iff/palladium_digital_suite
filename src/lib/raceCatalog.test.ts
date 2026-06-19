import { describe, expect, it } from 'vitest'
import {
  getPalladiumRaceById,
  PALLADIUM_RACE_CATALOG,
} from '../data/library/raceCatalogLoader'
import {
  listRacesForCharacterCreation,
  listNpcRaces,
  listGmApprovalRaces,
  listCreatureRaces,
  raceAllowedInCharacterCreation,
  isGmApprovalRacePool,
} from './raceCatalog'

describe('race catalog pools', () => {
  it('loads human from nightbane player pool', () => {
    const human = getPalladiumRaceById('race_human', 'nightbane')
    expect(human?.raceAudience).toBe('player')
    expect(human?.catalogGenreId).toBe('nightbane')
  })

  it('resolves genre-scoped human rows with same id', () => {
    const nightbane = getPalladiumRaceById('race_human', 'nightbane')
    const rifts = getPalladiumRaceById('race_human', 'rifts')
    expect(nightbane?.gameSystems).toEqual(['nightbane'])
    expect(rifts?.gameSystems).toEqual(['rifts'])
    expect(nightbane?.psionics.capabilityType).toBe('none')
    expect(rifts?.psionics.capabilityType).toBe('standard')
  })

  it('lists only player races for creation in host genre', () => {
    const pool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(pool.some((r) => r.id === 'race_human')).toBe(true)
    expect(pool.some((r) => r.id === 'nightbane')).toBe(true)
    expect(pool.every((r) => r.raceAudience === 'player')).toBe(true)
    expect(pool.length).toBe(7)
  })

  it('loads wild vampire as playable race with shadow occ', () => {
    const wild = getPalladiumRaceById('race_wild_vampire', 'nightbane')
    expect(wild?.raceAudience).toBe('player')
    expect(wild?.forcedOccId).toBe('occ_wild_vampire_rcc')
    expect(wild?.vitals.hpFormula).toBe('2D4*10')
    expect(wild?.psionics.naturalIspFormula).toBe('1D6*10')
    expect(wild?.vitals.averageStandardPpe).toBe('6D6')
  })

  it('loads secondary vampire as playable race with shadow occ', () => {
    const secondary = getPalladiumRaceById('race_secondary_vampire', 'nightbane')
    expect(secondary?.raceAudience).toBe('player')
    expect(secondary?.forcedOccId).toBe('occ_secondary_vampire_rcc')
    expect(secondary?.vitals.hpFormula).toBe('3D4*10')
    expect(secondary?.psionics.naturalIspFormula).toBe('2D6*10')
    expect(secondary?.innateBonuses.metadata?.associatedNpcRaceId).toBe('race_master_vampire')
  })

  it('excludes other genres from creation list', () => {
    const riftsPool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'rifts')
    expect(riftsPool.map((r) => r.id)).toEqual(['race_human'])
  })

  it('excludes npc pool from character creation', () => {
    const npcOnly = [
      {
        ...PALLADIUM_RACE_CATALOG[0]!,
        id: 'race_test_npc',
        raceAudience: 'npc' as const,
      },
    ]
    expect(raceAllowedInCharacterCreation(npcOnly[0]!, 'nightbane')).toBe(false)
    expect(listNpcRaces(npcOnly, 'nightbane').length).toBe(1)
    expect(listRacesForCharacterCreation(npcOnly, 'nightbane').length).toBe(0)
  })

  it('loads hound from nightbane npc pool', () => {
    const hound = getPalladiumRaceById('race_hound', 'nightbane')
    expect(hound?.raceAudience).toBe('npc')
    expect(hound?.vitals.sdc).toBe(200)
    const npcPool = listNpcRaces(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(npcPool.some((r) => r.id === 'race_hound')).toBe(true)
    expect(npcPool.some((r) => r.id === 'race_hunter')).toBe(true)
    expect(npcPool.length).toBe(10)
  })

  it('loads master vampire with shadow occ and xp link', () => {
    const master = getPalladiumRaceById('race_master_vampire', 'nightbane')
    expect(master?.raceAudience).toBe('npc')
    expect(master?.forcedOccId).toBe('occ_master_vampire_rcc')
    expect(master?.vitals.hpFormula).toBe('3D6*10')
    expect(master?.psionics.naturalIspFormula).toBe('3D6*10')
    expect(master?.strengthCategory).toBe('supernatural')
  })

  it('loads priest of night as human-baseline npc race', () => {
    const priest = getPalladiumRaceById('race_priest_of_night', 'nightbane')
    expect(priest?.raceAudience).toBe('npc')
    expect(priest?.attributes.ps).toBe('3D6')
    expect(priest?.innateBonuses.modifiers?.ps).toBe(4)
    expect(priest?.innateBonuses.metadata?.speciesBaselineRaceId).toBe('race_human')
    expect(priest?.vitals.sdc).toBe('3D6+30')
    expect(priest?.vitals.hpFormula).toBe('PE+1D6+3D6')
    expect(priest?.forcedOccId).toBe('occ_priest_of_night_rcc')
  })

  it('loads night prince with nightlord hierarchy link', () => {
    const prince = getPalladiumRaceById('race_night_prince', 'nightbane')
    expect(prince?.raceAudience).toBe('npc')
    expect(prince?.innateBonuses.metadata?.associatedNpcRaceId).toBe('race_nightlord')
    expect(prince?.vitals.sdc).toBe('2D4*10+120')
  })

  it('loads namtar from nightbane npc pool', () => {
    const namtar = getPalladiumRaceById('race_namtar', 'nightbane')
    expect(namtar?.raceAudience).toBe('npc')
    expect(namtar?.vitals.sdc).toBe(10)
    expect(namtar?.strengthCategory).toBe('standard')
    expect(namtar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_hollow_man')
  })

  it('links hollow man construct to namtar pilot', () => {
    const hollow = getPalladiumRaceById('race_hollow_man', 'nightbane')
    const namtar = getPalladiumRaceById('race_namtar', 'nightbane')
    expect(hollow?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_namtar')
    expect(hollow?.vitals.hpFormula).toBe('0')
    expect(hollow?.vitals.sdc).toBe('2D4*10+80')
    expect(namtar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_hollow_man')
  })

  it('links nightlord avatars to parent nightlord', () => {
    const lord = getPalladiumRaceById('race_nightlord', 'nightbane')
    const avatar = getPalladiumRaceById('race_nightlord_avatar', 'nightbane')
    expect(lord?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_nightlord_avatar')
    expect(avatar?.innateBonuses.metadata?.pairedNpcRaceId).toBe('race_nightlord')
    expect(lord?.vitals.sdc).toBe('3D6*100+500')
    expect(avatar?.vitals.sdc).toBe('1D4*100+100')
  })

  it('loads ashmedai from nightbane npc pool', () => {
    const ashmedai = getPalladiumRaceById('race_ashmedai', 'nightbane')
    expect(ashmedai?.raceAudience).toBe('npc')
    expect(ashmedai?.psionics.capabilityType).toBe('innate')
    expect(ashmedai?.vitals.sdc).toBe('3D6*10+150')
  })

  it('loads hound master from gm_approval pool', () => {
    const master = getPalladiumRaceById('race_hound_master', 'nightbane')
    expect(master?.raceAudience).toBe('gm_approval')
    expect(master?.forcedOccId).toBe('occ_hound_master_rcc')
    expect(isGmApprovalRacePool(master!)).toBe(true)
    expect(
      listGmApprovalRaces(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_hound_master',
      ),
    ).toBe(true)
    expect(
      listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_hound_master',
      ),
    ).toBe(false)
  })

  it('loads snake bird from gm_approval pool with mystic xp table', () => {
    const snakeBird = getPalladiumRaceById('race_snake_bird', 'nightbane')
    expect(snakeBird?.raceAudience).toBe('gm_approval')
    expect(snakeBird?.forcedOccId).toBe('occ_snake_bird_rcc')
    expect(snakeBird?.psionics.capabilityType).toBe('none')
    expect(snakeBird?.vitals.sdc).toBe('5D6')
    expect(snakeBird?.attributes.spd).toBe('1D6*10+50')
    expect(listGmApprovalRaces(PALLADIUM_RACE_CATALOG, 'nightbane').length).toBe(2)
  })

  it('loads waste coyote from creatures pool', () => {
    const coyote = getPalladiumRaceById('race_waste_coyote', 'nightbane')
    expect(coyote?.raceAudience).toBe('creature')
    expect(coyote?.raceComposition).toBe('creature')
    expect(coyote?.vitals.sdc).toBe('2D6*10+20')
    expect(coyote?.forcedOccId).toBeUndefined()
    const creatures = listCreatureRaces(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(creatures.some((r) => r.id === 'race_waste_coyote')).toBe(true)
    expect(
      listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane').some(
        (r) => r.id === 'race_waste_coyote',
      ),
    ).toBe(false)
  })

  it('loads lizard king from creatures pool', () => {
    const lizard = getPalladiumRaceById('race_lizard_king', 'nightbane')
    expect(lizard?.raceComposition).toBe('creature')
    expect(lizard?.vitals.hpFormula).toBe('1D6*10+20')
    expect(lizard?.vitals.sdc).toBe('2D6*10+100')
    expect(lizard?.attributes.ps).toBe('2D6+29')
    expect(listCreatureRaces(PALLADIUM_RACE_CATALOG, 'nightbane').length).toBe(2)
  })
})
