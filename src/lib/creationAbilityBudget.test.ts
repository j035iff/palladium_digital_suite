import { describe, expect, it } from 'vitest'
import { getLibraryOccById } from '../data/library/registry'
import {
  assessAbilitiesBudgetBlockers,
  countSelectedAbilitiesByBudgetCategory,
  formatAbilityBudgetRequirementLabel,
  listAbilityBudgetShortfalls,
  resolveEffectiveCreationAbilityBudget,
} from './creationAbilityBudget'

describe('creationAbilityBudget', () => {
  it('counts selections by supernatural category', () => {
    expect(
      countSelectedAbilitiesByBudgetCategory([
        'psionic_astral_projection',
        'psionic_bio_manipulation',
      ]),
    ).toEqual({ spell: 0, psionic: 2, talent: 0 })
  })

  it('lists shortfalls per lane with remaining counts', () => {
    const shortfalls = listAbilityBudgetShortfalls(
      { spellSlots: 0, psionicSlots: 3, talentSlots: 1 },
      { spell: 0, psionic: 1, talent: 0 },
    )
    expect(shortfalls).toHaveLength(2)
    expect(shortfalls[0]).toMatchObject({
      kind: 'psionic',
      remaining: 2,
      selected: 1,
      required: 3,
    })
    expect(shortfalls[1]).toMatchObject({
      kind: 'talent',
      remaining: 1,
      selected: 0,
      required: 1,
    })
  })

  it('formats requirement labels for satisfied and open picks', () => {
    expect(formatAbilityBudgetRequirementLabel('psionic', 3, 3)).toBe(
      'Psionics selected (3/3)',
    )
    expect(formatAbilityBudgetRequirementLabel('psionic', 1, 3)).toBe(
      'Select 2 more psionic powers (1/3)',
    )
  })

  it('blocks continue until every budget lane is full', () => {
    const blockers = assessAbilitiesBudgetBlockers({
      budget: { spellSlots: 0, psionicSlots: 3, talentSlots: 0 },
      creationGenreId: 'nightbane',
      selectedIds: ['psionic_astral_projection'],
    })
    expect(blockers).toEqual(['Select 2 more psionic powers (1/3)'])
  })

  it('grants psionic slots from Psychic Gate minor/major for non-psychic O.C.C.', () => {
    const occ = getLibraryOccById('occ_ex_government_agent')
    expect(occ).toBeDefined()
    expect(
      resolveEffectiveCreationAbilityBudget({
        occ,
        psychicTier: 'none',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(0)
    expect(
      resolveEffectiveCreationAbilityBudget({
        occ,
        psychicTier: 'minor',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(2)
    expect(
      resolveEffectiveCreationAbilityBudget({
        occ,
        psychicTier: 'major',
        majorAllocation: 'single_pool',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(8)
    expect(
      resolveEffectiveCreationAbilityBudget({
        occ,
        psychicTier: 'major',
        majorAllocation: 'mixed_pools',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(6)
  })

  it('keeps O.C.C. ispEngine budget for psychic-class O.C.C.', () => {
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    expect(occ).toBeDefined()
    expect(
      resolveEffectiveCreationAbilityBudget({
        occ,
        psychicTier: 'master',
        creationGenreId: 'nightbane',
      }).psionicSlots,
    ).toBe(3)
  })
})
