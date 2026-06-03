import { describe, expect, it, vi, afterEach } from 'vitest'
import * as genres from '../data/genres'
import { getGenreManifest } from '../data/genres'
import {
  getPalladiumOccById,
  listPalladiumOccsForCreation,
} from '../data/library/occCatalogLoader'
import {
  creationNeedsAbilitySelection,
  creationShowsPsychicGate,
  resolvePsychicGateBypassed,
} from './creationPhases'
import { occOffersSupernaturalCreation } from './occSupernatural'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('genreSupernaturalAbilitiesDisallowed', () => {
  it('manifest exposes the flag on playable genres', () => {
    expect(getGenreManifest('nightbane')?.genreSupernaturalAbilitiesDisallowed).toBe(
      false,
    )
  })

  it('bypasses psychic gate and ability picks when genre disallows supernatural', () => {
    vi.spyOn(genres, 'isGenreSupernaturalAbilitiesDisallowed').mockReturnValue(true)
    const psychicOcc = getPalladiumOccById('occ_pab_psychic_agent')
    expect(psychicOcc).toBeDefined()
    expect(
      resolvePsychicGateBypassed('race_human', psychicOcc, 'nightbane'),
    ).toBe(true)
    expect(
      creationShowsPsychicGate(
        { raceId: 'race_human' },
        psychicOcc,
        'nightbane',
      ),
    ).toBe(false)
    expect(
      creationNeedsAbilitySelection(
        { spellSlots: 4, psionicSlots: 3, talentSlots: 0 },
        'nightbane',
      ),
    ).toBe(false)
  })

  it('filters supernatural O.C.C.s from creation pool when flag is true', () => {
    vi.spyOn(genres, 'isGenreSupernaturalAbilitiesDisallowed').mockReturnValue(true)
    const pool = listPalladiumOccsForCreation('nightbane', 'nightbane')
    expect(pool.every((o) => !occOffersSupernaturalCreation(o))).toBe(true)
    expect(pool.some((o) => o.id === 'occ_ex_government_agent')).toBe(true)
    expect(pool.some((o) => o.id === 'occ_pab_psychic_agent')).toBe(false)
  })

  it('keeps psychic gate for standard human on supernatural-allowed genre', () => {
    vi.spyOn(genres, 'isGenreSupernaturalAbilitiesDisallowed').mockReturnValue(false)
    const mundaneOcc = getPalladiumOccById('occ_ex_government_agent')
    expect(
      resolvePsychicGateBypassed('race_human', mundaneOcc, 'nightbane'),
    ).toBe(false)
  })
})
