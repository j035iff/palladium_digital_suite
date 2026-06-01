import { describe, expect, it } from 'vitest'
import {
  deriveMovementStats,
  resolveSpeedProfile,
  type MovementDerivationInput,
} from './movementDerivation'

const BASE_INPUT: MovementDerivationInput = {
  landSpdAttribute: 28,
  ps: 20,
  skills: [{ id: 'skill_swimming', name: 'Swimming', restricted: false }],
  isMorphusActive: false,
  canSwimPhysically: true,
}

describe('resolveSpeedProfile', () => {
  it('applies flat then percent modifiers', () => {
    const profile = resolveSpeedProfile({
      type: 'attribute',
      value: 40,
      modifiers: { flat: 0, percent: -30 },
    })
    expect(profile.attributeValue).toBe(28)
    expect(profile.yardsPerMelee).toBe(140)
    expect(profile.mph).toBe(19)
  })
})

describe('deriveMovementStats', () => {
  it('derives swim speed from P.S. and applies flat+percent after base', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      swimSpeedModifiers: { flat: 3, percent: 50 },
    })
    expect(derived.swim?.attributeValue).toBe(23)
    expect(derived.swim?.yardsPerMelee).toBe(115)
    expect(derived.swim?.mph).toBe(16)
  })

  it('halves swim base when character lacks swimming skill', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      skills: [{ id: 'skill_pilot', name: 'Pilot', restricted: false }],
    })
    expect(derived.swim?.attributeValue).toBe(6)
  })

  it('returns null swim when character cannot physically swim', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      canSwimPhysically: false,
    })
    expect(derived.swim).toBeNull()
  })

  it('uses fly speed attribute when present', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      flightEngine: {
        flySpdAttribute: 120,
        maxSpeedMph: 0,
        strikeBonus: 0,
        parryBonus: 0,
        dodgeBonus: 0,
      },
    })
    expect(derived.fly?.attributeValue).toBe(120)
    expect(derived.fly?.mph).toBe(82)
  })

  it('falls back to max mph when fly speed attribute missing', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      flightEngine: {
        flySpdAttribute: 0,
        maxSpeedMph: 90,
        strikeBonus: 0,
        parryBonus: 0,
        dodgeBonus: 0,
      },
    })
    expect(derived.fly?.mph).toBe(90)
    expect(derived.fly?.attributeValue).toBe(132)
  })

  it('includes leap strings for all four axes', () => {
    const derived = deriveMovementStats({
      ...BASE_INPUT,
      isMorphusActive: true,
      jumpBonuses: {
        standingHeight: 10,
        standingDistance: 15,
        runningHeight: 0,
        runningDistance: 0,
      },
    })
    expect(derived.leap.standingHorizontal.endsWith(' Ft')).toBe(true)
    expect(derived.leap.standingVertical.endsWith(' Ft')).toBe(true)
    expect(derived.leap.runningHorizontal.endsWith(' Ft')).toBe(true)
    expect(derived.leap.runningVertical.endsWith(' Ft')).toBe(true)
  })
})
