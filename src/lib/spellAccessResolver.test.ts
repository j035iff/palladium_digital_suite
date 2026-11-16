import { describe, expect, it } from 'vitest'
import { getPalladiumMagicSpellById } from '../data/library/magicCatalogLoader'
import type { PalladiumOcc } from '../types'
import {
  resolveSpellAccessMatch,
  spellAccessibleToOcc,
} from './spellAccessPath'
import {
  creationSpellPickMaxLevel,
  filterSpellsForCreationLevelPick,
  formatCreationSpellLevelUnavailableNote,
  formatSpellCaveatLine,
  resolveSpellsForOcc,
} from './spellAccessResolver'

const wizardOcc = {
  id: 'occ_test_wizard',
  name: 'Test Wizard',
  description: '',
  gameSystems: ['nightbane'],
  occType: 'scholar_civilian',
  occSkillsCore: [],
  occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
  secondarySkills: { initialSlotsCount: 0, forbiddenCategories: [] },
  wpRules: { coreWps: [], forbiddenWps: [] },
  handToHandRules: { defaultSkillId: null, upgradePaths: [] },
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
} as unknown as PalladiumOcc

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

describe('creation spell level pick listing', () => {
  it('takes the tighter of spellCap and roadmap Level N restrictions', () => {
    expect(creationSpellPickMaxLevel(wizardOcc, 4, 1)).toBe(1)
    expect(creationSpellPickMaxLevel(wizardOcc, 15, 1)).toBe(1)
    expect(creationSpellPickMaxLevel(mirrormageOcc, 2, 1)).toBe(2)
  })

  it('filters picker rows to allowed levels only', () => {
    const rows = resolveSpellsForOcc(wizardOcc, {
      gameSystem: 'nightbane',
      spellCap: 15,
    })
    const maxLevel = creationSpellPickMaxLevel(wizardOcc, 15, 1)
    const listed = filterSpellsForCreationLevelPick(rows, maxLevel)
    expect(listed.length).toBeGreaterThan(0)
    expect(listed.every((r) => r.spell.spellLevel <= maxLevel)).toBe(true)
    expect(
      listed.some((r) => r.spell.id === 'magic_wizard_teleport_lesser'),
    ).toBe(false)
  })

  it('formats an unavailable-higher-levels note', () => {
    expect(formatCreationSpellLevelUnavailableNote(2)).toMatch(/Level 3–15/)
    expect(formatCreationSpellLevelUnavailableNote(2)).toMatch(/limit: 2/)
    expect(formatCreationSpellLevelUnavailableNote(15)).toBeNull()
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
