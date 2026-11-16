import { describe, expect, it } from 'vitest'
import type { OccCategoryAccessRule } from '../types'
import {
  createDefaultCreationCategoryAvailabilityFilter,
  creationBookCategoryPassesAvailabilityFilter,
  filterCreationBookCategoriesByAvailability,
  resolveCreationCategoryAvailabilityKind,
  skillBookCategoriesPassAvailabilityFilter,
  type CreationCategoryAvailabilityFilter,
} from './creationSkillCategoryAvailabilityFilter'

const rules: OccCategoryAccessRule[] = [
  { categoryName: 'Domestic', accessType: 'any', bonusPercent: 0 },
  { categoryName: 'Communications', accessType: 'any', bonusPercent: 10 },
  { categoryName: 'Military', accessType: 'none', bonusPercent: 0 },
  {
    categoryName: 'Physical',
    accessType: 'except',
    exceptions: ['acrobatics'],
    bonusPercent: 0,
  },
  {
    categoryName: 'Medical',
    accessType: 'only',
    exceptions: ['first_aid'],
    bonusPercent: 0,
  },
]

describe('resolveCreationCategoryAvailabilityKind', () => {
  it('maps missing rule to any', () => {
    expect(resolveCreationCategoryAvailabilityKind(undefined)).toBe('any')
  })

  it('maps simple any / bonus / none / restrictions', () => {
    expect(resolveCreationCategoryAvailabilityKind(rules[0])).toBe('any')
    expect(resolveCreationCategoryAvailabilityKind(rules[1])).toBe('bonus')
    expect(resolveCreationCategoryAvailabilityKind(rules[2])).toBe('none')
    expect(resolveCreationCategoryAvailabilityKind(rules[3])).toBe('restrictions')
    expect(resolveCreationCategoryAvailabilityKind(rules[4])).toBe('restrictions')
  })
})

describe('filterCreationBookCategoriesByAvailability', () => {
  const cats = [
    'Domestic',
    'Communications',
    'Military',
    'Physical',
    'Medical',
    'Technical',
  ]

  it('defaults to all kinds on', () => {
    const filter = createDefaultCreationCategoryAvailabilityFilter()
    expect(filterCreationBookCategoriesByAvailability(cats, rules, filter)).toEqual(
      cats,
    )
  })

  it('drops unchecked kinds from the Category dropdown pool', () => {
    const filter: CreationCategoryAvailabilityFilter = {
      any: true,
      none: false,
      restrictions: false,
      bonus: true,
    }
    expect(filterCreationBookCategoriesByAvailability(cats, rules, filter)).toEqual([
      'Domestic',
      'Communications',
      'Technical',
    ])
  })

  it('returns empty when every kind is off', () => {
    const filter: CreationCategoryAvailabilityFilter = {
      any: false,
      none: false,
      restrictions: false,
      bonus: false,
    }
    expect(filterCreationBookCategoriesByAvailability(cats, rules, filter)).toEqual([])
  })
})

describe('creationBookCategoryPassesAvailabilityFilter', () => {
  it('treats unknown categories as Any', () => {
    const filter = createDefaultCreationCategoryAvailabilityFilter()
    filter.any = false
    expect(
      creationBookCategoryPassesAvailabilityFilter('Technical', rules, filter),
    ).toBe(false)
  })
})

describe('skillBookCategoriesPassAvailabilityFilter', () => {
  it('passes when any book category is allowed', () => {
    const filter: CreationCategoryAvailabilityFilter = {
      any: false,
      none: false,
      restrictions: true,
      bonus: false,
    }
    expect(
      skillBookCategoriesPassAvailabilityFilter(
        ['Domestic', 'Physical'],
        rules,
        filter,
      ),
    ).toBe(true)
    expect(
      skillBookCategoriesPassAvailabilityFilter(['Domestic'], rules, filter),
    ).toBe(false)
  })
})
