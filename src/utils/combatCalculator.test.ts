import { describe, expect, it } from 'vitest'
import type { HandToHandSkill } from '../types'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
} from './combatCalculator'

describe('accumulateHandToHandBonuses', () => {
  it('starts with entangle maneuver locked', () => {
    const empty = createEmptyAccumulatedHandToHandBonuses()
    expect(empty.entangleUnlocked).toBe(false)
    expect(empty.entangle).toBe(0)
  })

  it('starts with disarm maneuver locked', () => {
    const empty = createEmptyAccumulatedHandToHandBonuses()
    expect(empty.disarmUnlocked).toBe(false)
    expect(empty.disarm).toBe(0)
  })

  it('unlocks entangle maneuver from progression boolean', () => {
    const skill: HandToHandSkill = {
      id: 'hth_test_entangle',
      name: 'Test',
      description: 'Test style',
      progression: {
        '1': { attacks: 2 },
        '5': { entangleUnlocked: true },
        '8': { entangle: 2 },
      },
    }

    expect(accumulateHandToHandBonuses(skill, 4).entangleUnlocked).toBe(false)
    expect(accumulateHandToHandBonuses(skill, 4).entangle).toBe(0)

    const atFive = accumulateHandToHandBonuses(skill, 5)
    expect(atFive.entangleUnlocked).toBe(true)
    expect(atFive.entangle).toBe(0)

    const atEight = accumulateHandToHandBonuses(skill, 8)
    expect(atEight.entangleUnlocked).toBe(true)
    expect(atEight.entangle).toBe(2)
  })

  it('unlocks disarm maneuver from progression boolean', () => {
    const skill: HandToHandSkill = {
      id: 'hth_test_disarm',
      name: 'Test',
      description: 'Test style',
      progression: {
        '3': { disarmUnlocked: true },
        '6': { disarm: 1 },
      },
    }

    expect(accumulateHandToHandBonuses(skill, 2).disarmUnlocked).toBe(false)
    expect(accumulateHandToHandBonuses(skill, 3).disarmUnlocked).toBe(true)
    expect(accumulateHandToHandBonuses(skill, 3).disarm).toBe(0)
    expect(accumulateHandToHandBonuses(skill, 6).disarm).toBe(1)
  })
})
