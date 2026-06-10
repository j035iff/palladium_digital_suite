import { describe, expect, it } from 'vitest'
import {
  getLibraryOccById,
  listPalladiumPsionicsForGenreCategory,
  listPsionicCategoryIdsForGenre,
} from '../data/library/registry'
import { psionicRowIsSelectable } from './supernaturalAbilityDisplay'
import {
  assessPsychicGatePsionicBlockers,
  listGatePsionicSelections,
  lockedPsychicGatePool,
  psychicGatePsionicPickAllowed,
  psychicGateRequiredPickCount,
  resolveGateAwareCreationAbilityBudget,
} from './psychicGatePsionicBudget'

describe('psychicGatePsionicBudget', () => {
  const civilian = getLibraryOccById('occ_ex_government_agent')

  it('requires 2 single-pool picks for Minor', () => {
    expect(psychicGateRequiredPickCount('minor', null)).toBe(2)
    expect(
      resolveGateAwareCreationAbilityBudget({
        occ: civilian,
        psychicTier: 'minor',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(2)
  })

  it('requires allocation before Major picks', () => {
    const blockers = assessPsychicGatePsionicBlockers({
      occ: civilian,
      tier: 'major',
      selectedIds: [],
      genreId: 'nightbane',
    })
    expect(blockers[0]).toMatch(/allocation/i)
    expect(
      psychicGatePsionicPickAllowed({
        tier: 'major',
        occ: civilian,
        selectedIds: [],
        candidateId: 'psionic_astral_projection',
        genreId: 'nightbane',
      })?.allowed,
    ).toBe(false)
  })

  it('locks Minor picks to one category after the first selection', () => {
    const locked = lockedPsychicGatePool(
      'minor',
      null,
      ['psionic_astral_projection'],
      'nightbane',
    )
    expect(locked).toBe('sensitive')
    const samePool = psychicGatePsionicPickAllowed({
      tier: 'minor',
      occ: civilian,
      selectedIds: ['psionic_astral_projection'],
      candidateId: 'psionic_see_aura',
      genreId: 'nightbane',
    })
    expect(samePool?.allowed).toBe(true)
    const blocked = psychicGatePsionicPickAllowed({
      tier: 'minor',
      occ: civilian,
      selectedIds: ['psionic_astral_projection'],
      candidateId: 'psionic_alter_aura',
      genreId: 'nightbane',
    })
    expect(blocked?.allowed).toBe(false)
  })

  it('supports Major mixed allocation with 6 picks across pools', () => {
    expect(psychicGateRequiredPickCount('major', 'mixed_pools')).toBe(6)
    expect(
      resolveGateAwareCreationAbilityBudget({
        occ: civilian,
        psychicTier: 'major',
        majorAllocation: 'mixed_pools',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(6)

    const picks = [
      'psionic_astral_projection',
      'psionic_alter_aura',
      'psionic_bio_manipulation',
    ]
    expect(listGatePsionicSelections(picks, 'nightbane')).toHaveLength(3)
    expect(
      psychicGatePsionicPickAllowed({
        tier: 'major',
        majorAllocation: 'mixed_pools',
        occ: civilian,
        selectedIds: picks,
        candidateId: 'psionic_death_trance',
        genreId: 'nightbane',
      })?.allowed,
    ).toBe(true)
  })

  it('locks Minor picks via shared pool intersection, not primary pool only', () => {
    expect(
      lockedPsychicGatePool('minor', null, ['psionic_suggestion'], 'nightbane'),
    ).toBeNull()
    expect(
      lockedPsychicGatePool(
        'minor',
        null,
        ['psionic_sixth_sense'],
        'nightbane',
      ),
    ).toBe('sensitive')
    expect(
      lockedPsychicGatePool(
        'minor',
        null,
        ['psionic_suggestion', 'psionic_sixth_sense'],
        'nightbane',
      ),
    ).toBe('sensitive')
  })

  it('blocks cross-pool browsing after single-pool lock but allows same pool', () => {
    const selectedIds = ['psionic_sixth_sense']

    const suggestionFromSensitive = psychicGatePsionicPickAllowed({
      tier: 'minor',
      occ: civilian,
      selectedIds,
      candidateId: 'psionic_suggestion',
      genreId: 'nightbane',
      viewingCategory: 'sensitive',
    })
    expect(suggestionFromSensitive?.allowed).toBe(true)

    const suggestionFromHealer = psychicGatePsionicPickAllowed({
      tier: 'minor',
      occ: civilian,
      selectedIds,
      candidateId: 'psionic_suggestion',
      genreId: 'nightbane',
      viewingCategory: 'healer',
    })
    expect(suggestionFromHealer?.allowed).toBe(false)

    const ctx = {
      activeOcc: civilian,
      spellCap: 5,
      genreId: 'nightbane',
      psychicTier: 'minor' as const,
      psychicGateBypassed: false,
      majorAllocation: null,
      selectedIds,
    }
    const availableCategories = listPsionicCategoryIdsForGenre('nightbane').filter(
      (categoryId) =>
        listPalladiumPsionicsForGenreCategory('nightbane', categoryId).some(
          (row) =>
            psionicRowIsSelectable(row, {
              ...ctx,
              viewingCategory: categoryId,
            }),
        ),
    )
    expect(availableCategories).toContain('sensitive')
    expect(availableCategories).not.toContain('healer')
  })

  it('requires later picks to share a category while the pool is still ambiguous', () => {
    const selectedIds = ['psionic_suggestion']
    expect(
      psychicGatePsionicPickAllowed({
        tier: 'minor',
        occ: civilian,
        selectedIds,
        candidateId: 'psionic_sixth_sense',
        genreId: 'nightbane',
        viewingCategory: 'sensitive',
      })?.allowed,
    ).toBe(true)
    expect(
      psychicGatePsionicPickAllowed({
        tier: 'minor',
        occ: civilian,
        selectedIds,
        candidateId: 'psionic_alter_aura',
        genreId: 'nightbane',
        viewingCategory: 'physical',
      })?.allowed,
    ).toBe(false)
  })

  it('blocks super psionics from Psychic Gate picks', () => {
    const gate = psychicGatePsionicPickAllowed({
      tier: 'major',
      majorAllocation: 'single_pool',
      occ: civilian,
      selectedIds: [],
      candidateId: 'psionic_astral_transference',
      genreId: 'nightbane',
    })
    expect(gate?.allowed).toBe(false)
    expect(gate?.reason).toMatch(/super/i)
  })
})
