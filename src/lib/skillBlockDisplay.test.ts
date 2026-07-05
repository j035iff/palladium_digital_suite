import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import {
  formatSkillPrerequisiteSummary,
  formatSynergyHintLine,
  listSkillSynergyHints,
} from './skillBlockDisplay'

const occWithWildernessBlocked: PalladiumOcc = {
  id: 'occ_test_wilderness_none',
  name: 'Test Researcher',
  description: '',
  gameSystems: ['nightbane'],
  sources: [],
  tags: [],
  occType: 'scholar_civilian',
  occSkillsCore: [],
  occRelatedSkills: {
    initialSlotsCount: 8,
    categoryRules: [
      {
        categoryName: 'Wilderness',
        accessType: 'none',
        bonusPercent: 0,
      },
      {
        categoryName: 'Domestic',
        accessType: 'any',
        bonusPercent: 5,
      },
    ],
  },
  secondarySkills: { initialSlotsCount: 6, forbiddenCategories: [] },
  wpRules: { coreWps: [], forbiddenWps: [] },
  handToHandRules: { defaultSkillId: null, upgradePaths: [] },
  staticBonuses: {},
  attributeRequirements: {},
  finances: {},
  startingEquipment: {},
}

describe('skillBlockDisplay', () => {
  it('formats AND prerequisites as a natural Requires list', () => {
    const def = getEngineSkillDefFromCatalog('skill_navigation')
    expect(def?.prerequisite).toBeDefined()
    const summary = formatSkillPrerequisiteSummary(def?.prerequisite)
    expect(summary).toBe(
      'Requires Math: Basic, Read Sensory Equipment, and Literacy',
    )
  })

  it('formats OR prerequisites inside allOf with semicolon', () => {
    const def = getEngineSkillDefFromCatalog('skill_surveillance_systems')
    const summary = formatSkillPrerequisiteSummary(def?.prerequisite)
    expect(summary).toContain('Requires')
    expect(summary).toMatch(/Electronics|Electrical/i)
    expect(summary).toContain('Computer Operation')
  })

  it('shows outgoing synergies on the granting skill', () => {
    const def = getEngineSkillDefFromCatalog('skill_carpentry')
    expect(def).toBeDefined()
    if (!def) return
    const hints = listSkillSynergyHints(def)
    const outgoing = hints.find((h) => h.direction === 'outgoing')
    expect(outgoing?.targetName).toBe('Boat Building')
    expect(formatSynergyHintLine(outgoing!)).toBe('+5% to Boat Building')
  })

  it('resolves legacy prerequisite ids to skill names', () => {
    const summary = formatSkillPrerequisiteSummary({
      gate: 'and',
      skillIds: ['skill_math_advanced'],
    })
    expect(summary).toBe('Requires Math: Advanced')
  })

  it('shows incoming synergies on the receiving skill', () => {
    const def = getEngineSkillDefFromCatalog('skill_boat_building')
    expect(def).toBeDefined()
    if (!def) return
    const hints = listSkillSynergyHints(def)
    const incoming = hints.find(
      (h) => h.direction === 'incoming' && h.sourceName === 'Carpentry',
    )
    expect(incoming?.bonusPercent).toBe(5)
    expect(formatSynergyHintLine(incoming!)).toBe('+5% if Carpentry is known')
  })

  it('hides incoming synergies when the source skill is excluded from the O.C.C.', () => {
    const def = getEngineSkillDefFromCatalog('skill_cook')
    expect(def).toBeDefined()
    if (!def) return
    const hints = listSkillSynergyHints(def, {
      effectiveOcc: occWithWildernessBlocked,
      specializationId: null,
    })
    expect(
      hints.some(
        (h) => h.direction === 'incoming' && h.sourceSkillId === 'skill_hunting',
      ),
    ).toBe(false)
  })

  it('lists catalog synergy hints on optic systems', () => {
    const def = getEngineSkillDefFromCatalog('skill_optic_systems')
    expect(def).toBeDefined()
    if (!def) return
    const hints = listSkillSynergyHints(def)
    expect(
      hints.some(
        (h) => h.direction === 'outgoing' && h.targetName === 'T.V./Video',
      ),
    ).toBe(true)
  })
})
