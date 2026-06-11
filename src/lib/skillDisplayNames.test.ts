import { describe, expect, it } from 'vitest'
import { formatSkillPrerequisiteSummary } from './skillBlockDisplay'
import { resolveSkillDisplayName } from './skillDisplayNames'
import { prerequisiteSatisfied } from './skillPrerequisites'

describe('skillDisplayNames', () => {
  it('resolves legacy math ids to catalog names', () => {
    expect(resolveSkillDisplayName('skill_math_basic')).toBe('Math: Basic')
    expect(resolveSkillDisplayName('skill_math_advanced')).toBe('Math: Advanced')
  })

  it('humanizes unknown skill ids instead of showing raw tokens', () => {
    expect(resolveSkillDisplayName('skill_basic_mechanics')).toBe(
      'Basic Mechanics',
    )
  })

  it('formats prerequisites with legacy math ids as skill names', () => {
    const summary = formatSkillPrerequisiteSummary({
      gate: 'and',
      skillIds: ['skill_math_basic'],
    })
    expect(summary).toBe('Requires Math: Basic')
  })

  it('treats legacy and canonical math ids as equivalent for satisfaction', () => {
    const prereq = { gate: 'and' as const, skillIds: ['skill_math_basic'] }
    expect(
      prerequisiteSatisfied(prereq, new Set(['skill_math_basic'])),
    ).toBe(true)
  })
})
