import { describe, expect, it } from 'vitest'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { characterFixture } from '../data/characterFixture'
import { getIqBonuses } from './attributeBonuses'
import {
  buildLiveSkillContext,
  buildLiveSkillSections,
  LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL,
  LIVE_SKILL_STATS_ONLY_PHYSICAL_SECTION_ID,
  occSkillLevelBonusPercent,
  resolveLiveSkillPercent,
  resolveLiveSkillRollTarget,
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

describe('buildLiveSkillSections', () => {
  const row = (
    id: string,
    name: string,
    opts?: Partial<SheetSkill>,
  ): SheetSkill => ({
    id,
    name,
    restricted: false,
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
    expect(bottom.label).toBe('Physical')
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
})

