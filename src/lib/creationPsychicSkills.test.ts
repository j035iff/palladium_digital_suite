import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import { getLibraryOccById } from '../data/library/registry'
import {
  applyPsychicOccSkillBonusPercent,
  assessRelatedSkillSlotBlockers,
  rawOccSkillBonusPercent,
  resolveOccSkillBonusPercent,
  creationRelatedSkillCap,
} from './creationPsychicSkills'

const occ = {
  id: 'occ_test',
  name: 'Test',
  occSkillsCore: [{ skillId: 'skill_a', bonusPercent: 11 }],
  occRelatedSkills: {
    initialSlotsCount: 6,
    categoryRules: [
      {
        categoryName: 'Espionage',
        accessType: 'allowed',
        bonusPercent: 7,
        skillSpecificOverrides: { skill_b: 7 },
      },
    ],
  },
} as unknown as PalladiumOcc

describe('creationPsychicSkills', () => {
  it('halves O.C.C. bonus % for Major psychic (floor)', () => {
    expect(applyPsychicOccSkillBonusPercent(11, 'major')).toBe(5)
    expect(applyPsychicOccSkillBonusPercent(7, 'major')).toBe(3)
    expect(applyPsychicOccSkillBonusPercent(11, 'minor')).toBe(11)
  })

  it('resolves core and related raw bonuses', () => {
    expect(rawOccSkillBonusPercent(occ, 'skill_a', new Set(), null)).toBe(11)
    const agent = getLibraryOccById('occ_ex_government_agent')
    expect(agent).toBeDefined()
    const relatedBonus = rawOccSkillBonusPercent(
      agent,
      'skill_pick_locks',
      new Set(['skill_pick_locks']),
      null,
    )
    expect(relatedBonus).toBeGreaterThan(0)
  })

  it('applies tier tax in resolveOccSkillBonusPercent', () => {
    expect(
      resolveOccSkillBonusPercent(occ, 'skill_a', new Set(), 'major', null),
    ).toBe(5)
  })

  it('halves related slot cap for Major psychic', () => {
    expect(creationRelatedSkillCap(6, 'none')).toBe(6)
    expect(creationRelatedSkillCap(6, 'major')).toBe(3)
  })

  it('does not double-count hand-to-hand slots in related readiness blockers', () => {
    expect(
      assessRelatedSkillSlotBlockers(2, 8, 'none', occ, 2),
    ).toEqual([
      'Fill all O.C.C. related skill slots (2 / 8 — 2 reserved for Hand-to-Hand).',
    ])
    expect(assessRelatedSkillSlotBlockers(8, 8, 'none', occ, 2)).toEqual([])
  })
})
