import { describe, expect, it } from 'vitest'
import {
  hasCatalogProgression,
  hasPercentileProgression,
  isDocumentedSynergyOnlySkill,
  isPassACatalogComplete,
  loadSchemaPropertyKeys,
  SCHEMA_TOP_LEVEL_KEYS,
  SKILL_PASS_B_KEYS,
} from '../../scripts/skill-engine-contract.mjs'

describe('skill engine contract', () => {
  it('marks a complete catalog row as Pass A ready (any genre)', () => {
    expect(
      isPassACatalogComplete({
        id: 'skill_example',
        name: 'Example',
        description: 'A percentile skill from any Palladium line.',
        gameSystems: ['rifts'],
        categories: ['Technical'],
        synergies: [],
        prerequisites: [],
        sources: [{ gameSystem: 'rifts', reference: 'Rifts RPG', pageNumber: 42 }],
        basePercent: 30,
        percentPerLevel: 5,
      }),
    ).toBe(true)
  })

  it('accepts physical-training skills without self percentile', () => {
    const boxing = {
      id: 'skill_boxing',
      name: 'Boxing',
      description: 'Classic art of fighting with fists.',
      gameSystems: ['nightbane'],
      categories: ['Physical'],
      synergies: [],
      prerequisites: [],
      sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 53 }],
      physicalSkillBonuses: { ps: 2 },
    }
    expect(hasPercentileProgression(boxing)).toBe(false)
    expect(hasCatalogProgression(boxing)).toBe(true)
    expect(isPassACatalogComplete(boxing)).toBe(true)
  })

  it('accepts documented synergy-only skills', () => {
    const hunting = {
      id: 'skill_hunting',
      name: 'Hunting',
      description: 'This skill has no base percent, but provides distinct bonuses.',
      gameSystems: ['nightbane'],
      categories: ['Wilderness'],
      synergies: [{ skillId: 'skill_prowl', bonusPercent: 2, description: '+2% prowl' }],
      prerequisites: [],
      sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 58 }],
    }
    expect(isDocumentedSynergyOnlySkill(hunting)).toBe(true)
    expect(isPassACatalogComplete(hunting)).toBe(true)
  })

  it('schema properties cover all contract top-level keys (except $schema)', () => {
    const schemaProps = loadSchemaPropertyKeys()
    schemaProps.add('$schema')

    for (const key of SCHEMA_TOP_LEVEL_KEYS) {
      expect(schemaProps.has(key), `schema missing property: ${key}`).toBe(true)
    }
  })

  it('lists Pass B keys used in catalog', () => {
    expect(SKILL_PASS_B_KEYS).toContain('physicalSkillBonuses')
    expect(SKILL_PASS_B_KEYS).toContain('subTasks')
    expect(SKILL_PASS_B_KEYS).toContain('conditionalRelatedSkills')
  })
})
