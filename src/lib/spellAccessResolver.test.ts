import { describe, expect, it } from 'vitest'
import { getPalladiumMagicSpellById } from '../data/library/magicCatalogLoader'
import type { PalladiumOcc } from '../types'
import {
  resolveSpellAccessMatch,
  spellAccessibleToOcc,
} from './spellAccessPath'
import {
  formatSpellCaveatLine,
  resolveSpellsForOcc,
} from './spellAccessResolver'

const wizardOcc: PalladiumOcc = {
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
    progressionRoadmap: [
      { level: 1, selectionsGained: 4, categoryRestrictions: ['Level 1 Spells Only'] },
    ],
    magicSchools: ['wizard'],
  },
  progression: { startingSpellLevelCap: 4 },
}

const mirrormageOcc: PalladiumOcc = {
  ...wizardOcc,
  id: 'occ_test_mirrormage',
  name: 'Test Mirrormage',
  ppeEngine: {
    baseFormula: '2D6',
    perLevelFormula: '2D6',
    progressionRoadmap: [{ level: 1, selectionsGained: 2, categoryRestrictions: [] }],
    magicSchools: ['mirror'],
    spellAccessRules: [
      {
        school: 'wizard',
        accessType: 'only',
        crossListId: 'mirrormage_borrowed_nightbane_core',
        label: 'Borrowed wizard spells',
      },
    ],
  },
}

describe('resolveSpellsForOcc visibility', () => {
  it('omits spells outside O.C.C. disciplines entirely', () => {
    const rows = resolveSpellsForOcc(wizardOcc, {
      gameSystem: 'nightbane',
      spellCap: 15,
    })
    const schools = new Set(rows.map((r) => r.canonicalSchool))
    expect(schools.has('wizard')).toBe(true)
    expect(schools.has('fleshsculptor')).toBe(false)
    expect(schools.has('mirror')).toBe(false)
  })

  it('includes borrowed cross-list spells for Mirrormage', () => {
    const rows = resolveSpellsForOcc(mirrormageOcc, {
      gameSystem: 'nightbane',
      spellCap: 15,
    })
    const banishment = rows.find((r) => r.spell.id === 'magic_wizard_banishment')
    expect(banishment).toBeDefined()
    expect(banishment?.accessPath).toBe('borrowed')
    expect(banishment?.caveats.some((c) => c.kind === 'focus')).toBe(true)
  })

  it('hides wizard spells not on Mirrormage cross-list', () => {
    const rows = resolveSpellsForOcc(mirrormageOcc, {
      gameSystem: 'nightbane',
      spellCap: 15,
    })
    expect(rows.some((r) => r.spell.id === 'magic_wizard_blinding_flash')).toBe(false)
  })

  it('keeps eligible-but-blocked spells visible with pickGate reason', () => {
    const rows = resolveSpellsForOcc(wizardOcc, {
      gameSystem: 'nightbane',
      spellCap: 15,
    })
    const teleport = rows.find((r) => r.spell.id === 'magic_wizard_teleport_lesser')
    expect(teleport).toBeDefined()
    expect(teleport?.pickGate.allowed).toBe(false)
    expect(teleport?.pickGate.reason).toMatch(/level/i)
  })
})

describe('resolveSpellAccessMatch caveats', () => {
  it('merges cross-list focus override for Locate', () => {
    const spell = getPalladiumMagicSpellById('magic_wizard_locate')
    expect(spell).toBeDefined()
    const match = resolveSpellAccessMatch(mirrormageOcc, spell!)
    expect(match?.accessPath).toBe('borrowed')
    expect(formatSpellCaveatLine(match?.caveats ?? [])).toMatch(/mirror/i)
  })
})

describe('spellAccessibleToOcc', () => {
  it('returns false for out-of-discipline spells when gated', () => {
    const flesh = getPalladiumMagicSpellById('magic_fleshsculptor_destroy_dead_flesh')
    expect(flesh).toBeDefined()
    expect(spellAccessibleToOcc(wizardOcc, flesh!)).toBe(false)
  })
})
