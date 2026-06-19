import { describe, expect, it } from 'vitest'
import {
  getEncounterArchetypeById,
  listEncounterArchetypes,
} from '../data/library/encounterArchetypeCatalogLoader'

describe('encounter archetype catalog', () => {
  it('loads five Nightbane core archetypes', () => {
    const pool = listEncounterArchetypes('nightbane')
    expect(pool).toHaveLength(5)
    expect(pool.map((row) => row.id).sort()).toEqual([
      'encounter_corrupted_police',
      'encounter_night_cultist',
      'encounter_nightbane_gang_member',
      'encounter_nsb_field_agent',
      'encounter_preserver_activist',
    ])
  })

  it('resolves genre-scoped rows by id', () => {
    const preevert = getEncounterArchetypeById(
      'encounter_preserver_activist',
      'nightbane',
    )
    expect(preevert?.catalogGenreId).toBe('nightbane')
    expect(preevert?.composition?.defaultBaseRaceId).toBe('race_human')
    expect(preevert?.handToHand.skillId).toBe('hth_basic')
  })

  it('does not resolve ids across genres', () => {
    expect(
      getEncounterArchetypeById('encounter_preserver_activist', 'rifts'),
    ).toBeUndefined()
  })
})
