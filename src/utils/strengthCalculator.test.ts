import { describe, expect, it } from 'vitest'
import {
  appendPsAttributeDamageBonus,
  getHandToHandDamageProfile,
  psAttributeDamageBonus,
} from './strengthCalculator'

describe('psAttributeDamageBonus', () => {
  it('is zero below 17 and score − 15 from 17+', () => {
    expect(psAttributeDamageBonus(16)).toBe(0)
    expect(psAttributeDamageBonus(17)).toBe(2)
    expect(psAttributeDamageBonus(30)).toBe(15)
  })
})

describe('getHandToHandDamageProfile supernatural', () => {
  it('leaves restrained without P.S. bonus and appends bonus to full / power', () => {
    const profile = getHandToHandDamageProfile(30, 'supernatural')
    expect(profile.kind).toBe('supernatural')
    if (profile.kind !== 'supernatural') return
    expect(profile.attributeDamageBonus).toBe(15)
    expect(profile.restrainedPunch).toBe('2D6')
    expect(profile.fullStrengthPunch).toBe('4D6+15')
    expect(profile.powerPunch).toBe('1D4*10+15')
  })

  it('does not append when P.S. is below exceptional', () => {
    const profile = getHandToHandDamageProfile(16, 'supernatural')
    expect(profile.kind).toBe('supernatural')
    if (profile.kind !== 'supernatural') return
    expect(profile.attributeDamageBonus).toBe(0)
    expect(profile.restrainedPunch).toBe('1D6')
    expect(profile.fullStrengthPunch).toBe('2D6')
    expect(profile.powerPunch).toBe('4D6')
  })
})

describe('appendPsAttributeDamageBonus', () => {
  it('appends only when bonus is positive', () => {
    expect(appendPsAttributeDamageBonus('3D6', 0)).toBe('3D6')
    expect(appendPsAttributeDamageBonus('3D6', 5)).toBe('3D6+5')
  })
})
