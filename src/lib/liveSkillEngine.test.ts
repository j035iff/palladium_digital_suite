import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getIqBonuses } from './attributeBonuses'
import {
  buildLiveSkillContext,
  occSkillLevelBonusPercent,
  resolveLiveSkillPercent,
  resolveLiveSkillRollTarget,
} from './liveSkillEngine'
import { resolveLiveIqSkillBonus } from './liveStatEngine'

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
        categories: ['Espionage'],
        skillTraits: ['requires_light_touch'],
      },
    )
    expect(resolved.equationPercent).toBe(
      30 + ctx.iqBonus + ctx.maPbBonus,
    )
    expect(resolved.total).toBe(resolved.equationPercent)
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
