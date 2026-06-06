import { describe, expect, it } from 'vitest'
import type { OccCategoryAccessRule } from '../types'
import {
  formatOccCategoryRuleDropdown,
  formatOccCategoryRuleHeader,
  mapFilterCategoryToOccCategory,
  resolveOccCategoryRuleForFilter,
} from './occCategoryRuleDisplay'

describe('mapFilterCategoryToOccCategory', () => {
  it('maps WP filter categories to Weapon Proficiencies', () => {
    expect(mapFilterCategoryToOccCategory('WP: Ancient')).toBe('Weapon Proficiencies')
    expect(mapFilterCategoryToOccCategory('WP: Modern')).toBe('Weapon Proficiencies')
    expect(mapFilterCategoryToOccCategory('Domestic')).toBe('Domestic')
  })
})

describe('formatOccCategoryRuleHeader', () => {
  it('returns black Any when no rule', () => {
    expect(formatOccCategoryRuleHeader(undefined)).toEqual({
      label: 'Any',
      tone: 'default',
    })
  })

  it('returns green Any (+bonus%) for simple any with bonus', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Communications',
      accessType: 'any',
      bonusPercent: 5,
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'Any (+5%)',
      tone: 'bonus',
    })
  })

  it('returns black Any for simple any without bonus', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Domestic',
      accessType: 'any',
      bonusPercent: 0,
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'Any',
      tone: 'default',
    })
  })

  it('returns red None for blocked categories', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Military',
      accessType: 'none',
      bonusPercent: 0,
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'None',
      tone: 'blocked',
    })
  })

  it('returns blue exception detail for except rules', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Physical',
      accessType: 'except',
      exceptions: ['acrobatics', 'boxing', 'wrestling'],
      bonusPercent: 0,
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'Any (Except Acrobatics, Boxing, Wrestling)',
      tone: 'exception',
    })
  })

  it('returns blue exception detail for only rules with a single skill', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Medical',
      accessType: 'only',
      exceptions: ['first_aid'],
      bonusPercent: 0,
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'First Aid Only',
      tone: 'exception',
    })
  })

  it('returns blue exception detail for overrides on any', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Medical',
      accessType: 'any',
      bonusPercent: 5,
      skillSpecificOverrides: { skill_language: 10 },
    }
    expect(formatOccCategoryRuleHeader(rule)).toEqual({
      label: 'Any (+5%, Language +10%)',
      tone: 'exception',
    })
  })
})

describe('formatOccCategoryRuleDropdown', () => {
  it('collapses exception rules to Exception', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Physical',
      accessType: 'except',
      exceptions: ['acrobatics'],
      bonusPercent: 0,
    }
    expect(formatOccCategoryRuleDropdown(rule)).toEqual({
      label: 'Exception',
      tone: 'exception',
    })
  })

  it('keeps simple Any labels in the dropdown', () => {
    const rule: OccCategoryAccessRule = {
      categoryName: 'Technical',
      accessType: 'any',
      bonusPercent: 10,
    }
    expect(formatOccCategoryRuleDropdown(rule)).toEqual({
      label: 'Any (+10%)',
      tone: 'bonus',
    })
  })
})

describe('resolveOccCategoryRuleForFilter', () => {
  const rules: OccCategoryAccessRule[] = [
    {
      categoryName: 'Weapon Proficiencies',
      accessType: 'any',
      bonusPercent: 0,
    },
    {
      categoryName: 'Technical',
      accessType: 'any',
      bonusPercent: 10,
    },
  ]

  it('resolves WP filter through Weapon Proficiencies rule', () => {
    expect(resolveOccCategoryRuleForFilter('WP: Modern', rules)?.categoryName).toBe(
      'Weapon Proficiencies',
    )
  })

  it('returns undefined for All', () => {
    expect(resolveOccCategoryRuleForFilter('All', rules)).toBeUndefined()
  })
})
