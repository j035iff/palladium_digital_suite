import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  filterSkillIdsByWeaponProficiencyEra,
  getEngineSkillDefFromCatalog,
  listCreationSkillLibrary,
  matchesSkillBookCategoryFilter,
  sortCreationSkillLibraryResults,
  partitionCreationSkillLibrary,
  sortCreationSkillLibraryWithSelectableFirst,
  weaponProficiencyEraForSkillId,
} from './creationSkillCatalog'
import {
  type CreationLibrarySkillContext,
  isCreationLibrarySkillUnconditionallyExcluded,
  resolveCreationLibrarySkillSelectionTier,
} from './creationSkillPicks'

const occWithPickLocksBlocked: PalladiumOcc = {
  id: 'occ_test',
  name: 'Test',
  description: '',
  gameSystems: ['nightbane'],
  occType: 'scholar_civilian',
  occSkillsCore: [],
  occRelatedSkills: {
    initialSlotsCount: 4,
    categoryRules: [
      {
        categoryName: 'Espionage',
        accessType: 'except',
        exceptions: ['pick_locks'],
        bonusPercent: 0,
      },
    ],
  },
  secondarySkills: { initialSlotsCount: 4 },
  wpRules: { allowedCategories: [] },
  handToHandRules: {},
  staticBonuses: {},
  attributeRequirements: {},
  finances: {},
  startingEquipment: {},
}

function libraryContext(
  overrides: Partial<CreationLibrarySkillContext> = {},
): CreationLibrarySkillContext {
  return {
    effectiveOcc: occWithPickLocksBlocked,
    specializationId: null,
    relatedSlotsUsed: 0,
    relatedSkillCap: 4,
    secondaryPickSlots: 0,
    secondaryCap: 4,
    occPicks: [],
    relatedPicks: [],
    secondaryPicks: [],
    activeFilterCategory: 'Espionage',
    ...overrides,
  }
}

describe('creationSkillCatalog electrical category', () => {
  it('only maps Basic Electronics, Computer Repair, and Electrical Engineer to Electrical', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const electrical = lib.filter((s) =>
      matchesSkillBookCategoryFilter(s, 'Electrical'),
    )
    expect(electrical.map((s) => s.name).sort()).toEqual([
      'Basic Electronics',
      'Computer Repair',
      'Electrical Engineer',
    ])
  })

  it('does not tag Computer Operation as Electrical', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const compOp = lib.find((s) => s.id === 'skill_computer_operation')
    expect(compOp).toBeDefined()
    expect(matchesSkillBookCategoryFilter(compOp!, 'Electrical')).toBe(false)
  })
})

describe('creationSkillCatalog library sort', () => {
  it('sinks only unconditionally excluded skills to the bottom', () => {
    const pickLocks = getEngineSkillDefFromCatalog('skill_pick_locks')!
    const cook = getEngineSkillDefFromCatalog('skill_cook')!
    const ctx = libraryContext({ activeFilterCategory: 'Espionage' })
    const sorted = sortCreationSkillLibraryWithSelectableFirst(
      [pickLocks, cook],
      'Espionage',
      (skill) => isCreationLibrarySkillUnconditionallyExcluded(skill, ctx),
    )
    expect(sorted.map((s) => s.id)).toEqual(['skill_cook', 'skill_pick_locks'])
  })

  it('partitions chosen skills into the pinned selected bucket', () => {
    const cook = getEngineSkillDefFromCatalog('skill_cook')!
    const carpentry = getEngineSkillDefFromCatalog('skill_carpentry')!
    const ctx = libraryContext({
      activeFilterCategory: 'Wilderness',
      relatedPicks: [{ instanceId: 'carpentry-1', skillId: 'skill_carpentry' }],
    })
    const tier = (skillId: string) =>
      resolveCreationLibrarySkillSelectionTier(skillId, ctx)
    const isChosen = (skill: { id: string }) => tier(skill.id) != null
    const { selected, browse } = partitionCreationSkillLibrary(
      [carpentry, cook],
      'Wilderness',
      (skill) => isCreationLibrarySkillUnconditionallyExcluded(skill, ctx),
      isChosen,
      tier,
    )
    expect(selected.map((s) => s.id)).toEqual(['skill_carpentry'])
    expect(browse.map((s) => s.id)).toEqual(['skill_cook'])
  })

  it('orders chosen skills related before secondary in the pinned bucket', () => {
    const cook = getEngineSkillDefFromCatalog('skill_cook')!
    const carpentry = getEngineSkillDefFromCatalog('skill_carpentry')!
    const ctx = libraryContext({
      activeFilterCategory: 'Wilderness',
      relatedPicks: [{ instanceId: 'carpentry-1', skillId: 'skill_carpentry' }],
      secondaryPicks: [{ instanceId: 'cook-1', skillId: 'skill_cook' }],
    })
    const tier = (skillId: string) =>
      resolveCreationLibrarySkillSelectionTier(skillId, ctx)
    const { selected } = partitionCreationSkillLibrary(
      [cook, carpentry],
      'Wilderness',
      (skill) => isCreationLibrarySkillUnconditionallyExcluded(skill, ctx),
      (skill) => tier(skill.id) != null,
      tier,
    )
    expect(selected.map((s) => s.id)).toEqual([
      'skill_carpentry',
      'skill_cook',
    ])
  })
})

describe('creationSkillCatalog related-only skills', () => {
  it('includes Boxing in the nightbane library as related-eligible but not secondary', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const boxing = lib.find((s) => s.id === 'skill_boxing')
    expect(boxing).toBeDefined()
    expect(boxing?.slotKind).toBe('occ_related')
    expect(boxing?.secondaryEligible).toBe(false)
    expect(matchesSkillBookCategoryFilter(boxing!, 'Physical')).toBe(true)
  })
})

describe('creationSkillCatalog technical pinning', () => {
  it('pins Language and Literacy to the top of Technical results', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const technical = lib.filter((s) =>
      matchesSkillBookCategoryFilter(s, 'Technical'),
    )
    const sorted = sortCreationSkillLibraryResults(technical, 'Technical')
    expect(sorted[0]?.id).toBe('skill_language')
    expect(sorted[1]?.id).toBe('skill_literacy')
  })
})

describe('creationSkillCatalog weapon proficiency era', () => {
  it('classifies ancient and modern W.P. ids', () => {
    expect(weaponProficiencyEraForSkillId('wp_archery_and_targeting')).toBe(
      'ancient',
    )
    expect(weaponProficiencyEraForSkillId('wp_automatic_pistol')).toBe('modern')
  })

  it('filters voucher-eligible W.P. ids by era', () => {
    const catalogIds = listCreationSkillLibrary('nightbane').map((s) => s.id)
    const wpIds = catalogIds.filter((id) => id.startsWith('wp_'))
    const ancient = filterSkillIdsByWeaponProficiencyEra(wpIds, 'ancient')
    const modern = filterSkillIdsByWeaponProficiencyEra(wpIds, 'modern')
    expect(ancient.length).toBeGreaterThan(0)
    expect(modern.length).toBeGreaterThan(0)
    expect(ancient).toContain('wp_archery_and_targeting')
    expect(modern).toContain('wp_automatic_pistol')
    expect(ancient.every((id) => !modern.includes(id))).toBe(true)
  })
})
