import { describe, expect, it } from 'vitest'
import {
  computeAttributeSaveProfile,
  resolveAttributeOnlySave,
} from './attributeSaves'
import { computeSaveProfile } from './saveProfile'
import { formatSaveRollBonus, formatSaveVsTarget } from './saveRollDisplay'
import { characterFixture } from '../data/characterFixture'

describe('resolveAttributeOnlySave', () => {
  it('returns additive bonuses for base_pe save vs 10', () => {
    const resolved = resolveAttributeOnlySave({
      saveKind: 'base_pe',
      targetNumber: 10,
      displayPe: 19,
      displayMe: 12,
      characterLevel: 1,
    })
    expect(resolved.baseTarget).toBe(10)
    expect(resolved.totalRollBonus).toBe(2)
  })

  it('returns Facade M.E. and level bonuses for vs_becoming', () => {
    const resolved = resolveAttributeOnlySave({
      saveKind: 'vs_becoming',
      displayPe: 12,
      displayMe: 25,
      facadeMe: 19,
      characterLevel: 5,
    })
    expect(resolved.baseTarget).toBe(12)
    expect(resolved.attributeBonus).toBe(2)
    expect(resolved.progressionBonus).toBe(3)
    expect(resolved.totalRollBonus).toBe(5)
  })
})

describe('computeAttributeSaveProfile', () => {
  it('includes Becoming row for dual-form characters only', () => {
    const megaversal = computeAttributeSaveProfile(18, 16, 1, false)
    expect(megaversal.map((r) => r.id)).toEqual(['base_pe_bonus', 'base_me_bonus'])

    const nightbane = computeAttributeSaveProfile(18, 19, 3, true, { facadeMe: 19 })
    expect(nightbane.map((r) => r.id)).toEqual([
      'base_pe_bonus',
      'base_me_bonus',
      'vs_becoming',
    ])
    const becoming = nightbane.find((r) => r.id === 'vs_becoming')
    expect(becoming?.baseTarget).toBe(12)
    expect(becoming?.totalRollBonus).toBe(4)
  })

  it('uses Facade M.E. for Becoming even when Morphus M.E. is higher', () => {
    const rows = computeAttributeSaveProfile(18, 30, 3, true, { facadeMe: 12 })
    const becoming = rows.find((r) => r.id === 'vs_becoming')
    expect(becoming?.totalRollBonus).toBe(2)
  })
})

describe('computeSaveProfile', () => {
  it('shows GM target and roll bonus separately', () => {
    const profile = computeSaveProfile(characterFixture, 'facade', 15, false)
    const magic = profile.saves.find((s) => s.id === 'magic_spell')
    expect(magic?.baseTarget).toBe(12)
    expect(magic?.totalBonus).toBeGreaterThanOrEqual(0)
    expect(magic?.tooltipEquation).toContain('Save vs 12')
    expect(formatSaveVsTarget(magic!.baseTarget)).toBe('vs 12')
    expect(formatSaveRollBonus(magic!.totalBonus)).toContain('to roll')
  })

  it('exposes attribute saves on the sheet profile', () => {
    const profile = computeSaveProfile(characterFixture, 'facade', 15, false)
    expect(profile.attributeSaves.length).toBe(2)
    expect(profile.attributeSaves[0]?.id).toBe('base_pe_bonus')
  })
})
