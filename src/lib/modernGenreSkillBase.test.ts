import { describe, expect, it } from 'vitest'
import { getLibraryOccById } from '../data/library/registry'
import {
  listEffectiveOccCoreGrantSkillIds,
  modernGenreDefaultBonusPercent,
  resolveSkillEquationBasePercent,
  shouldApplyModernGenreDefaultSkillBase,
  stackModernGenreEducationalBonus,
} from './modernGenreSkillBase'
import {
  rawEducationalSkillBonusPercent,
  rawOccSkillBonusPercent,
} from './creationPsychicSkills'

describe('modernGenreSkillBase', () => {
  it('applies only to modern-default genres (Nightbane)', () => {
    expect(shouldApplyModernGenreDefaultSkillBase('nightbane')).toBe(true)
    expect(shouldApplyModernGenreDefaultSkillBase('rifts')).toBe(false)
    expect(shouldApplyModernGenreDefaultSkillBase('palladium_fantasy')).toBe(false)
  })

  it('stacks Math Basic modern +10 with OCC grant', () => {
    const ex = getLibraryOccById('occ_ex_government_agent')
    expect(ex).toBeDefined()
    const occRaw = rawOccSkillBonusPercent(
      ex!,
      'skill_math_basic',
      new Set(),
      null,
    )
    expect(occRaw).toBe(20)
    expect(modernGenreDefaultBonusPercent('nightbane', 'skill_math_basic')).toBe(10)
    expect(
      rawEducationalSkillBonusPercent(
        ex!,
        'skill_math_basic',
        new Set(),
        null,
        undefined,
        'nightbane',
      ),
    ).toBe(30)
    expect(stackModernGenreEducationalBonus('rifts', 'skill_math_basic', 20)).toBe(20)
  })

  it('uses Language Native flat 98% for Nightbane', () => {
    expect(
      resolveSkillEquationBasePercent('skill_language', 50, {
        genreId: 'nightbane',
      }),
    ).toBe(98)
    expect(
      resolveSkillEquationBasePercent('skill_language', 50, {
        genreId: 'rifts',
      }),
    ).toBe(50)
  })

  it('merges modern-base skill ids into OCC grants for Nightbane', () => {
    const warlord = getLibraryOccById('occ_nightbane_warlord')
    expect(warlord).toBeDefined()
    const ids = listEffectiveOccCoreGrantSkillIds(warlord!, null, 'nightbane')
    expect(ids).toContain('skill_language')
    expect(ids).toContain('skill_literacy')
    expect(ids).toContain('skill_math_basic')
    expect(ids).toContain('skill_bicycling')
    expect(ids).toContain('skill_computer_operation')
  })

  it('gives Literacy +30 modern base for Computer Operation prereq ownership signal', () => {
    expect(modernGenreDefaultBonusPercent('nightbane', 'skill_literacy')).toBe(30)
    const epsilon = getLibraryOccById('occ_team_epsilon_trooper')
    const ids = listEffectiveOccCoreGrantSkillIds(epsilon!, null, 'nightbane')
    expect(ids).toContain('skill_literacy')
    expect(ids).toContain('skill_computer_operation')
  })
})
