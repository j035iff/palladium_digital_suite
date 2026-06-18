import { describe, expect, it } from 'vitest'
import {
  getPalladiumRaceById,
  PALLADIUM_RACE_CATALOG,
} from '../data/library/raceCatalogLoader'
import {
  listRacesForCharacterCreation,
  listNpcRaces,
  raceAllowedInCharacterCreation,
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
  })

  it('lists only player races for creation in host genre', () => {
    const pool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(pool.some((r) => r.id === 'race_human')).toBe(true)
    expect(pool.some((r) => r.id === 'nightbane')).toBe(true)
    expect(pool.every((r) => r.raceAudience === 'player')).toBe(true)
    expect(pool.length).toBe(4)
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
})
