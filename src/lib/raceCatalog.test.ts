import { describe, expect, it } from 'vitest'
import { PALLADIUM_RACE_CATALOG } from '../data/library/raceCatalogLoader'
import {
  listRacesForCharacterCreation,
  listNpcRaces,
  raceAllowedInCharacterCreation,
} from './raceCatalog'

describe('race catalog pools', () => {
  it('loads human from player pool', () => {
    const human = PALLADIUM_RACE_CATALOG.find((r) => r.id === 'race_human')
    expect(human?.raceAudience).toBe('player')
  })

  it('lists only player races for creation', () => {
    const pool = listRacesForCharacterCreation(PALLADIUM_RACE_CATALOG, 'nightbane')
    expect(pool.some((r) => r.id === 'race_human')).toBe(true)
    expect(pool.every((r) => r.raceAudience === 'player')).toBe(true)
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
