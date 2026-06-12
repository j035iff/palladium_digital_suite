import { describe, expect, it } from 'vitest'
import { getFeatureById } from '../data/library/registry'
import { getPalladiumMagicSpellById } from '../data/library/magicCatalogLoader'
import type { PalladiumOcc } from '../types'
import {
  magicSchoolForFeature,
  normalizeMagicSchool,
  occMagicSchools,
  parseSchoolFromMagicId,
  resolveMagicSchool,
  spellSchoolAllowedForOcc,
} from './magicSchool'
import { abilityPassesOccSupernaturalRules } from './occCreationDerivation'

describe('parseSchoolFromMagicId', () => {
  it('extracts school slug from canonical ids', () => {
    expect(parseSchoolFromMagicId('magic_wizard_blinding_flash')).toBe('wizard')
    expect(parseSchoolFromMagicId('magic_necromancy_raise_dead')).toBe('necromancy')
  })
})

describe('resolveMagicSchool', () => {
  it('prefers explicit school over id prefix', () => {
    expect(
      resolveMagicSchool({ id: 'magic_wizard_test', school: 'necromancy' }),
    ).toBe('necromancy')
  })

  it('falls back to file basename', () => {
    expect(resolveMagicSchool({ id: 'custom_spell', school: undefined }, 'wizard')).toBe(
      'wizard',
    )
  })
})

describe('spellSchoolAllowedForOcc', () => {
  const wizardOnlyOcc: PalladiumOcc = {
    id: 'occ_test_wizard',
    name: 'Test Wizard',
    description: '',
    gameSystems: ['nightbane'],
    occType: 'scholar_civilian',
    occSkillsCore: [],
    occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
    secondarySkills: { initialSlotsCount: 0 },
    wpRules: { allowedCategories: [] },
    handToHandRules: {},
    staticBonuses: {},
    attributeRequirements: {},
    finances: {},
    startingEquipment: {},
    ppeEngine: {
      baseFormula: '2D6',
      perLevelFormula: '2D6',
      progressionRoadmap: [],
      magicSchools: ['wizard'],
    },
  }

  it('allows spells in listed schools', () => {
    expect(spellSchoolAllowedForOcc(wizardOnlyOcc, 'wizard').allowed).toBe(true)
  })

  it('blocks spells outside listed schools', () => {
    const gate = spellSchoolAllowedForOcc(wizardOnlyOcc, 'necromancy')
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toMatch(/wizard/)
  })

  it('does not gate when magicSchools is omitted', () => {
    const openOcc = { ...wizardOnlyOcc, ppeEngine: { ...wizardOnlyOcc.ppeEngine!, magicSchools: undefined } }
    expect(spellSchoolAllowedForOcc(openOcc, 'necromancy').allowed).toBe(true)
  })
})

describe('magic catalog school metadata', () => {
  it('maps wizard spells with school and level on features', () => {
    const row = getPalladiumMagicSpellById('magic_wizard_blinding_flash')
    expect(row?.school).toBe('wizard')
    const feature = getFeatureById('magic_wizard_blinding_flash')
    expect(feature).toBeDefined()
    expect(magicSchoolForFeature(feature!)).toBe('wizard')
    expect(feature!.metadata?.level).toBe(1)
  })
})

describe('abilityPassesOccSupernaturalRules magic schools', () => {
  const wizardOcc: PalladiumOcc = {
    id: 'occ_test_wizard_gate',
    name: 'Wizard',
    description: '',
    gameSystems: ['nightbane'],
    occType: 'scholar_civilian',
    occSkillsCore: [],
    occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
    secondarySkills: { initialSlotsCount: 0 },
    wpRules: { allowedCategories: [] },
    handToHandRules: {},
    staticBonuses: {},
    attributeRequirements: {},
    finances: {},
    startingEquipment: {},
    ppeEngine: {
      baseFormula: '2D6',
      perLevelFormula: '2D6',
      progressionRoadmap: [
        { level: 1, selectionsGained: 4, categoryRestrictions: ['Level 1 Spells Only'] },
      ],
      magicSchools: ['wizard'],
    },
    progression: { startingSpellLevelCap: 4 },
  }

  it('allows wizard school spells within level cap', () => {
    const spell = getFeatureById('magic_wizard_blinding_flash')
    expect(spell).toBeDefined()
    const gate = abilityPassesOccSupernaturalRules(wizardOcc, spell!, 4, 'nightbane')
    expect(gate.allowed).toBe(true)
  })

  it('blocks spells above roadmap level restriction', () => {
    const spell = getFeatureById('magic_wizard_teleport_lesser')
    expect(spell).toBeDefined()
    const gate = abilityPassesOccSupernaturalRules(wizardOcc, spell!, 15, 'nightbane')
    expect(gate.allowed).toBe(false)
  })
})

describe('normalizeMagicSchool', () => {
  it('lowercases and normalizes spaces', () => {
    expect(normalizeMagicSchool('Wizard')).toBe('wizard')
    expect(normalizeMagicSchool('  Necromancy  ')).toBe('necromancy')
  })

  it('occMagicSchools normalizes O.C.C. entries', () => {
    const occ: PalladiumOcc = {
      id: 'x',
      name: 'x',
      description: '',
      gameSystems: [],
      occType: 'scholar_civilian',
      occSkillsCore: [],
      occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
      secondarySkills: { initialSlotsCount: 0 },
      wpRules: { allowedCategories: [] },
      handToHandRules: {},
      staticBonuses: {},
      attributeRequirements: {},
      finances: {},
      startingEquipment: {},
      ppeEngine: {
        baseFormula: '1',
        perLevelFormula: '1',
        progressionRoadmap: [],
        magicSchools: ['Wizard'],
      },
    }
    expect(occMagicSchools(occ)).toEqual(['wizard'])
  })
})
