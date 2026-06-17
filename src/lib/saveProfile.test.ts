import { describe, expect, it } from 'vitest'
import { computeHorrorFactorAura } from './saveProfile'
import { characterFixture } from '../data/characterFixture'

describe('computeHorrorFactorAura', () => {
  it('returns null for megaversal races on facade (no HF aura)', () => {
    const aura = computeHorrorFactorAura(characterFixture, 'primary', {}, false)
    expect(aura.total).toBeNull()
  })

  it('does not treat save_horror as Horror Factor aura', () => {
    const aura = computeHorrorFactorAura(
      characterFixture,
      'primary',
      { save_horror: 2, save_horror_factor: 2 },
      false,
    )
    expect(aura.total).toBeNull()
  })

  it('applies morphus baseline only for dual-form races', () => {
    const primary = computeHorrorFactorAura(characterFixture, 'primary', {}, true)
    expect(primary.total).toBeNull()

    const morphus = computeHorrorFactorAura(characterFixture, 'morphus', {}, true)
    expect(morphus.total).toBe(6)
  })

  it('includes explicit horror_factor modifiers for any race', () => {
    const aura = computeHorrorFactorAura(
      characterFixture,
      'primary',
      { horror_factor: 3 },
      false,
    )
    expect(aura.total).toBe(3)
  })
})
