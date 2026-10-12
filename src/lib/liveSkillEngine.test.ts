import { describe, expect, it } from 'vitest'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { characterFixture } from '../data/characterFixture'
import { getIqBonuses } from './attributeBonuses'
import {
  buildLiveSkillContext,
  buildLiveSkillPercentDetail,
  buildLiveSkillSections,
  filterLiveSkillSections,
  isHandToHandSheetSkill,
  isWeaponProficiencySheetSkill,
  listLiveSkillFilterCategoryOptions,
  LIVE_SKILL_FILTER_ALL_CATEGORIES,
  LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL,
  LIVE_SKILL_STATS_ONLY_PHYSICAL_SECTION_ID,
  occSkillLevelBonusPercent,
  resolveLiveSkillPercent,
  resolveLiveSkillRollTarget,
  resolveLiveSkillTemporaryPercentLines,
  resolveSheetSkillCatalogId,
} from './liveSkillEngine'
import { resolveLiveIqSkillBonus } from './liveStatEngine'
import type { SheetSkill } from '../types'

describe('buildLiveSkillContext', () => {
  it('derives I.Q. skill % from the live stat engine', () => {
    const ctx = buildLiveSkillContext(characterFixture, 'primary')
    expect(ctx.iqBonus).toBe(
      resolveLiveIqSkillBonus(characterFixture, 'primary'),
    )
  })
})

describe('resolveLiveSkillPercent', () => {
  it('matches master equation with engine-derived I.Q.', () => {
    const ctx = buildLiveSkillContext(characterFixture, 'primary')
    const resolved = resolveLiveSkillPercent(
      {
        id: 'skill_pick_locks',
        basePercent: 30,
        perLevel: 0,
        acquisitionLevel: 1,
        occBonus: 0,
      },
      characterFixture,
      'primary',
      {
        id: 'skill_pick_locks',
        name: 'Pick Locks',
        gameSystems: ['nightbane'],
        categories: ['Espionage'],
        skillTraits: ['requires_light_touch'],
        synergies: [],
        prerequisites: [],
        description: '',
      } as unknown as PalladiumSkillCatalogEntry,
    )
    expect(resolved.equationPercent).toBe(30 + ctx.iqBonus)
    expect(resolved.total).toBe(resolved.equationPercent)
  })

  it('does not apply global M.A./P.B. scaling to ordinary skills', () => {
    const highSocial = {
      ...characterFixture,
      primary: {
        ...characterFixture.primary,
        attributes: {
          ...characterFixture.primary.attributes,
          ma: 30,
          pb: 27,
        },
      },
    }
    const resolved = resolveLiveSkillPercent(
      {
        id: 'skill_pick_locks',
        basePercent: 30,
        perLevel: 0,
        acquisitionLevel: 1,
        occBonus: 0,
      },
      highSocial,
      'primary',
      {
        id: 'skill_pick_locks',
        name: 'Pick Locks',
        gameSystems: ['nightbane'],
        categories: ['Espionage'],
        skillTraits: ['requires_light_touch'],
        synergies: [],
        prerequisites: [],
        description: '',
      } as unknown as PalladiumSkillCatalogEntry,
    )
    expect(resolved.total).toBe(30 + resolveLiveIqSkillBonus(highSocial, 'primary'))
  })
})

describe('resolveLiveSkillRollTarget', () => {
  it('uses stat-engine I.Q. not raw attribute score', () => {
    const roll = resolveLiveSkillRollTarget({
      character: characterFixture,
      activeForm: 'primary',
      skillBasePercent: 40,
      characterLevel: 3,
    })
    const iq = resolveLiveIqSkillBonus(characterFixture, 'primary')
    expect(roll.iqBonus).toBe(iq)
    expect(roll.levelBonus).toBe(occSkillLevelBonusPercent(3))
    expect(roll.target).toBe(
      Math.min(98, Math.max(1, 40 + roll.levelBonus + iq)),
    )
  })

  it('matches exceptional table for high I.Q.', () => {
    const highIq = {
      ...characterFixture,
      primary: {
        ...characterFixture.primary,
        attributes: {
          ...characterFixture.primary.attributes,
          iq: 17,
        },
      },
    }
    const roll = resolveLiveSkillRollTarget({
      character: highIq,
      activeForm: 'primary',
      skillBasePercent: 30,
      characterLevel: 1,
    })
    expect(roll.iqBonus).toBe(getIqBonuses(17).skillBonus)
    expect(roll.iqBonus).toBe(3)
  })
})

describe('resolveLiveSkillTemporaryPercentLines', () => {
  it('omits zero status and keeps named temporary ability lines', () => {
    expect(resolveLiveSkillTemporaryPercentLines()).toEqual([])
    expect(resolveLiveSkillTemporaryPercentLines({ statusModifiers: 0 })).toEqual(
      [],
    )
    expect(
      resolveLiveSkillTemporaryPercentLines({ statusModifiers: -10 }),
    ).toEqual([{ label: 'Temporary', value: -10 }])
    expect(
      resolveLiveSkillTemporaryPercentLines({
        temporaryLines: [
          { label: 'Armor of Ithan', value: 0 },
          { label: 'Blessed', value: 10 },
        ],
      }),
    ).toEqual([{ label: 'Blessed', value: 10 }])
  })
})

describe('buildLiveSkillPercentDetail', () => {
  const literacy: SheetSkill = {
    id: 'skill_literacy',
    name: 'Literacy',
    restricted: false,
    basePercent: 40,
  }

  it('orders non-zero portions Base → IQ → OCC → Synergies → Other → Level → Temporary', () => {
    const detail = buildLiveSkillPercentDetail({
      character: characterFixture,
      activeForm: 'primary',
      skill: literacy,
      ownedSkills: [literacy],
      characterLevel: 3,
      temporaryLines: [{ label: 'Blessed', value: 10 }],
    })
    const groups = detail.breakdownLines.map((l) => l.group)
    const order = ['base', 'iq', 'occ', 'synergy', 'other', 'level', 'temporary']
    let last = -1
    for (const g of groups) {
      const idx = order.indexOf(g)
      expect(idx).toBeGreaterThanOrEqual(last)
      last = idx
    }
    expect(detail.breakdownLines.every((l) => l.value !== 0)).toBe(true)
    expect(detail.breakdownLines.at(-1)).toMatchObject({
      label: 'Blessed',
      value: 10,
      group: 'temporary',
      tone: 'bonus',
    })
    expect(detail.breakdownLines.some((l) => l.label === 'Level')).toBe(true)
    expect(detail.tooltipEquation).toContain('[Blessed: 10]')
    expect(detail.listPercentTone).toBe('bonus')
    expect(detail.temporaryNet).toBe(10)
  })

  it('colors penalties red-tone, omits zero IQ, and tints list % from Temporary', () => {
    const detail = buildLiveSkillPercentDetail({
      character: characterFixture,
      activeForm: 'primary',
      skill: literacy,
      ownedSkills: [literacy],
      characterLevel: 1,
      statusModifiers: -15,
    })
    const iq = detail.breakdownLines.find((l) => l.group === 'iq')
    expect(iq).toBeUndefined()
    const temp = detail.breakdownLines.find((l) => l.group === 'temporary')
    expect(temp).toMatchObject({
      label: 'Temporary',
      value: -15,
      tone: 'penalty',
    })
    expect(detail.listPercentTone).toBe('penalty')
    expect(detail.temporaryNet).toBe(-15)
  })

  it('keeps default (blue) list % tone when Temporary is absent', () => {
    const detail = buildLiveSkillPercentDetail({
      character: characterFixture,
      activeForm: 'primary',
      skill: literacy,
      ownedSkills: [literacy],
      characterLevel: 1,
    })
    expect(detail.temporaryNet).toBe(0)
    expect(detail.listPercentTone).toBe('default')
  })

  it('places Morphus lines in Other before Level', () => {
    const detail = buildLiveSkillPercentDetail({
      character: characterFixture,
      activeForm: 'morphus',
      skill: literacy,
      ownedSkills: [literacy],
      characterLevel: 1,
      morphusResolved: {
        equationPercent: 30,
        lines: [{ label: 'Morphus (this skill)', value: 10 }],
        total: 55,
      },
    })
    expect(detail.morphusTotal).toBe(55)
    const labels = detail.breakdownLines.map((l) => l.label)
    const morphusIdx = labels.indexOf('Morphus (this skill)')
    const levelIdx = labels.indexOf('Level')
    expect(morphusIdx).toBeGreaterThanOrEqual(0)
    // Level omitted when 0 at character level 1
    if (levelIdx >= 0) expect(morphusIdx).toBeLessThan(levelIdx)
    expect(
      detail.breakdownLines.find((l) => l.label === 'Morphus (this skill)')
        ?.group,
    ).toBe('other')
    expect(
      detail.breakdownLines.find((l) => l.label === 'Morphus (this skill)')
        ?.tone,
    ).toBe('bonus')
  })
})

describe('resolveSheetSkillCatalogId / isHandToHandSheetSkill', () => {
  it('prefers catalogSkillId over instance id', () => {
    expect(
      resolveSheetSkillCatalogId({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        catalogSkillId: 'skill_acrobatics',
      }),
    ).toBe('skill_acrobatics')
  })

  it('detects Hand-to-Hand sheet and library ids', () => {
    expect(
      isHandToHandSheetSkill({
        id: 'skill_hand_to_hand_expert',
        name: 'Hand to Hand: Expert',
      }),
    ).toBe(true)
    expect(
      isHandToHandSheetSkill({
        id: 'uuid-hth',
        catalogSkillId: 'skill_hand_to_hand_basic',
        name: 'Hand to Hand: Basic',
      }),
    ).toBe(true)
    expect(
      isHandToHandSheetSkill({
        id: 'skill_acrobatics',
        name: 'Acrobatics',
      }),
    ).toBe(false)
  })
})

describe('buildLiveSkillSections', () => {
  const row = (
    id: string,
    name: string,
    opts?: Partial<SheetSkill>,
  ): SheetSkill => ({
    id,
    name,
    restricted: false,
    catalogSkillId:
      id.startsWith('skill_') || id.startsWith('hth_') ? id : undefined,
    ...opts,
  })

  it('pins stats-only physical training in a Physical section at the bottom', () => {
    const sections = buildLiveSkillSections([
      row('skill_boxing', 'Boxing'),
      row('skill_literacy', 'Literacy', { basePercent: 40 }),
      row('skill_climbing', 'Climbing', { basePercent: 50 }),
      row('skill_running', 'Running'),
      row('skill_swimming', 'Swimming', { basePercent: 45 }),
    ])

    expect(sections.map((s) => s.label)).toEqual([
      'Physical',
      'Technical',
      LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL,
    ])
    expect(sections[0]!.skills.map((s) => s.id)).toEqual([
      'skill_climbing',
      'skill_swimming',
    ])
    expect(sections[0]!.statsOnlyPhysical).toBeUndefined()
    const bottom = sections[sections.length - 1]!
    expect(bottom.id).toBe(LIVE_SKILL_STATS_ONLY_PHYSICAL_SECTION_ID)
    expect(bottom.label).toBe(LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL)
    expect(bottom.statsOnlyPhysical).toBe(true)
    expect(bottom.skills.map((s) => s.id)).toEqual([
      'skill_boxing',
      'skill_running',
    ])
  })

  it('omits the bottom Physical section when no stats-only skills are present', () => {
    const sections = buildLiveSkillSections([
      row('skill_literacy', 'Literacy', { basePercent: 30 }),
      row('skill_climbing', 'Climbing', { basePercent: 40 }),
    ])
    expect(sections.map((s) => s.id)).toEqual(['Physical', 'Technical'])
    expect(sections.every((s) => !s.statsOnlyPhysical)).toBe(true)
  })

  it('categorizes creation instance-id rows via catalogSkillId (not Other)', () => {
    const sections = buildLiveSkillSections([
      row('inst-acro', 'Acrobatics', {
        catalogSkillId: 'skill_acrobatics',
        basePercent: 40,
      }),
      row('inst-box', 'Boxing', { catalogSkillId: 'skill_boxing' }),
      row('inst-lit', 'Literacy', {
        catalogSkillId: 'skill_literacy',
        basePercent: 50,
      }),
    ])
    expect(sections.map((s) => s.label)).toEqual([
      'Physical',
      'Technical',
      LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL,
    ])
    expect(sections.some((s) => s.label === 'Other')).toBe(false)
    expect(sections[0]!.skills.map((s) => s.name)).toEqual(['Acrobatics'])
  })

  it('excludes Hand-to-Hand styles from category sections', () => {
    const sections = buildLiveSkillSections([
      row('skill_hand_to_hand_expert', 'Hand to Hand: Expert', {
        basePercent: 22,
      }),
      row('inst-hth', 'Hand to Hand: Basic', {
        catalogSkillId: 'skill_hand_to_hand_basic',
      }),
      row('skill_climbing', 'Climbing', { basePercent: 40 }),
    ])
    const names = sections.flatMap((s) => s.skills.map((sk) => sk.name))
    expect(names).toEqual(['Climbing'])
    expect(names.some((n) => /hand to hand/i.test(n))).toBe(false)
  })
})

describe('isWeaponProficiencySheetSkill', () => {
  it('detects wp_ catalog and instance-backed W.P. rows', () => {
    expect(
      isWeaponProficiencySheetSkill({
        id: 'wp_sword',
        catalogSkillId: 'wp_sword',
      }),
    ).toBe(true)
    expect(
      isWeaponProficiencySheetSkill({
        id: 'inst-wp',
        catalogSkillId: 'wp_knife',
      }),
    ).toBe(true)
    expect(
      isWeaponProficiencySheetSkill({
        id: 'skill_acrobatics',
        catalogSkillId: 'skill_acrobatics',
      }),
    ).toBe(false)
  })
})

describe('filterLiveSkillSections / listLiveSkillFilterCategoryOptions', () => {
  const row = (
    id: string,
    name: string,
    opts?: Partial<SheetSkill>,
  ): SheetSkill => ({
    id,
    name,
    restricted: false,
    catalogSkillId: id.startsWith('skill_') || id.startsWith('wp_') ? id : undefined,
    ...opts,
  })

  const sampleSections = () =>
    buildLiveSkillSections([
      row('skill_radio_basic', 'Radio: Basic', { basePercent: 50 }),
      row('skill_computer_operation', 'Computer Operation', {
        basePercent: 40,
      }),
      row('skill_climbing', 'Climbing', { basePercent: 45 }),
      row('wp_sword', 'W.P. Sword'),
    ])

  it('lists All plus present category labels', () => {
    const options = listLiveSkillFilterCategoryOptions(sampleSections())
    expect(options[0]).toEqual({
      value: LIVE_SKILL_FILTER_ALL_CATEGORIES,
      label: 'All categories',
    })
    expect(options.map((o) => o.label)).toEqual(
      expect.arrayContaining(['Communications', 'Physical', 'WP: Ancient']),
    )
  })

  it('filters by category alone', () => {
    const filtered = filterLiveSkillSections(sampleSections(), {
      category: 'Communications',
    })
    expect(filtered.map((s) => s.label)).toEqual(['Communications'])
    expect(filtered[0]!.skills.map((s) => s.name)).toEqual(
      expect.arrayContaining(['Radio: Basic']),
    )
  })

  it('filters by name substring (case-insensitive)', () => {
    const filtered = filterLiveSkillSections(sampleSections(), {
      nameQuery: 'computer',
    })
    const names = filtered.flatMap((s) => s.skills.map((sk) => sk.name))
    expect(names).toEqual(['Computer Operation'])
  })

  it('AND-combines category and name filters', () => {
    const filtered = filterLiveSkillSections(sampleSections(), {
      category: 'Communications',
      nameQuery: 'computer',
    })
    // Computer Operation is Technical, not Communications
    expect(filtered).toEqual([])
    const both = filterLiveSkillSections(sampleSections(), {
      category: 'Technical',
      nameQuery: 'computer',
    })
    expect(both.flatMap((s) => s.skills.map((sk) => sk.name))).toEqual([
      'Computer Operation',
    ])
  })

  it('drops empty sections when nothing matches', () => {
    expect(
      filterLiveSkillSections(sampleSections(), { nameQuery: 'zzz-nope' }),
    ).toEqual([])
  })
})

