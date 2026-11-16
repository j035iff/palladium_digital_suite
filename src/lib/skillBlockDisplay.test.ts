import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import {
  buildSkillPrerequisiteDescriptionDisplay,
  buildSkillPrerequisiteDisplay,
  buildSkillUnmetPrerequisiteDisplay,
  formatSkillPrerequisiteSummary,
  formatSynergyHintLine,
  formatSynergyStatusLine,
  listSkillSynergyHints,
  partitionSkillSynergyHints,
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

  it('marks each AND prerequisite skill owned or missing', () => {
    const def = getEngineSkillDefFromCatalog('skill_navigation')
    expect(def?.prerequisite).toBeDefined()
    const parts = buildSkillPrerequisiteDisplay(
      def?.prerequisite,
      new Set(['skill_math_basic', 'skill_literacy']),
    )
    expect(parts).not.toBeNull()
    const skills = (parts ?? []).filter((p) => p.kind === 'skill')
    expect(skills.map((p) => (p.kind === 'skill' ? p.name : ''))).toEqual([
      'Math: Basic',
      'Read Sensory Equipment',
      'Literacy',
    ])
    expect(skills.map((p) => (p.kind === 'skill' ? p.owned : false))).toEqual([
      true,
      false,
      true,
    ])
  })

  it('marks each OR prerequisite skill owned or missing individually', () => {
    const def = getEngineSkillDefFromCatalog('skill_surveillance_systems')
    const parts = buildSkillPrerequisiteDisplay(
      def?.prerequisite,
      new Set(['skill_computer_operation']),
    )
    expect(parts).not.toBeNull()
    const skills = (parts ?? []).filter((p) => p.kind === 'skill')
    expect(skills.length).toBeGreaterThanOrEqual(2)
    const computer = skills.find(
      (p) => p.kind === 'skill' && p.name === 'Computer Operation',
    )
    expect(computer && computer.kind === 'skill' && computer.owned).toBe(true)
    const missingElectronics = skills.find(
      (p) =>
        p.kind === 'skill' &&
        /Electronics|Electrical/i.test(p.name) &&
        !p.owned,
    )
    expect(missingElectronics).toBeDefined()
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

  it('library row unmet display keeps only missing OR group', () => {
    const def = getEngineSkillDefFromCatalog('skill_surveillance_systems')
    const parts = buildSkillUnmetPrerequisiteDisplay(
      def?.prerequisite,
      new Set(['skill_computer_operation', 'skill_literacy']),
    )
    expect(parts).not.toBeNull()
    const text = (parts ?? [])
      .map((p) => (p.kind === 'text' ? p.text : p.name))
      .join('')
    expect(text).toMatch(/Electronics|Electrical/i)
    expect(text).not.toContain('Computer Operation')
    expect(text).not.toContain('Literacy')
    expect(text).not.toMatch(/^Requires/i)
    expect((parts ?? []).every((p) => p.kind === 'text' || !p.owned)).toBe(true)
  })

  it('description REQUIRES lists unmet first with OR parentheses, then met', () => {
    const def = getEngineSkillDefFromCatalog('skill_surveillance_systems')
    const parts = buildSkillPrerequisiteDescriptionDisplay(
      def?.prerequisite,
      new Set(['skill_computer_operation', 'skill_literacy']),
    )
    expect(parts).not.toBeNull()
    const text = (parts ?? [])
      .map((p) => (p.kind === 'text' ? p.text : p.name))
      .join('')
    expect(text.startsWith('REQUIRES ')).toBe(true)
    expect(text).toMatch(/\(.*Electronics|Electrical.*\)/i)
    const skillNames = (parts ?? [])
      .filter((p) => p.kind === 'skill')
      .map((p) => (p.kind === 'skill' ? p.name : ''))
    const electronicsIndex = skillNames.findIndex((n) =>
      /Electronics|Electrical/i.test(n),
    )
    const computerIndex = skillNames.indexOf('Computer Operation')
    const literacyIndex = skillNames.indexOf('Literacy')
    expect(electronicsIndex).toBeGreaterThanOrEqual(0)
    expect(computerIndex).toBeGreaterThan(electronicsIndex)
    expect(literacyIndex).toBeGreaterThan(electronicsIndex)
  })

  it('partitions surveillance synergies into active vs available', () => {
    const def = getEngineSkillDefFromCatalog('skill_surveillance_systems')
    expect(def).toBeDefined()
    if (!def) return
    const hints = listSkillSynergyHints(def)
    const { active, available } = partitionSkillSynergyHints(
      hints,
      new Set(['skill_computer_hacking']),
    )
    expect(
      active.some((h) => h.sourceSkillId === 'skill_computer_hacking'),
    ).toBe(true)
    expect(
      available.some((h) => h.sourceSkillId === 'skill_mechanical_engineer'),
    ).toBe(true)
    const hacking = active.find(
      (h) => h.sourceSkillId === 'skill_computer_hacking',
    )
    expect(formatSynergyStatusLine(hacking!, 'active')).toBe(
      '+5% Computer Hacking is known',
    )
    const mech = available.find(
      (h) => h.sourceSkillId === 'skill_mechanical_engineer',
    )
    expect(formatSynergyStatusLine(mech!, 'available')).toBe(
      '+5% if Mechanical Engineer is known',
    )
  })
})
