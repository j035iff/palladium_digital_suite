import { describe, expect, it } from 'vitest'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import {
  accumulateWeaponProficiencyBonuses,
  resolveOwnedWeaponProficiencyBonuses,
  resolveWeaponProficiencyLevelTiers,
} from './weaponProficiencyBonuses'

describe('weaponProficiencyBonuses', () => {
  it('accumulates W.P. Sword strike/parry by character level (cumulative tiers)', () => {
    const entry = getWeaponProficiencyCatalogEntryById('wp_sword')
    expect(entry).toBeTruthy()
    expect(accumulateWeaponProficiencyBonuses(entry!, 1)).toMatchObject({
      strike: 1,
      parry: 1,
    })
    expect(accumulateWeaponProficiencyBonuses(entry!, 3)).toMatchObject({
      strike: 2,
      parry: 2,
    })
    expect(accumulateWeaponProficiencyBonuses(entry!, 7)).toMatchObject({
      strike: 3,
      parry: 3,
    })
  })

  it('accumulates W.P. Battle Axe throw separately from strike', () => {
    const entry = getWeaponProficiencyCatalogEntryById('wp_battle_axe')
    expect(entry).toBeTruthy()
    const at3 = accumulateWeaponProficiencyBonuses(entry!, 3)
    expect(at3.strike).toBe(1)
    expect(at3.parry).toBe(1)
    expect(at3.strikeWhenThrown).toBe(1)
  })

  it('merges standard modern progression + revolver tier-1 aimed override', () => {
    const pistol = getWeaponProficiencyCatalogEntryById('wp_automatic_pistol')
    const revolver = getWeaponProficiencyCatalogEntryById('wp_revolver')
    expect(pistol).toBeTruthy()
    expect(revolver).toBeTruthy()

    const pistolTiers = resolveWeaponProficiencyLevelTiers(pistol!)
    expect(pistolTiers[0]).toMatchObject({
      atCharacterLevel: 1,
      aimedStrikeBonus: 3,
      burstStrikeBonus: 1,
    })

    const revL1 = accumulateWeaponProficiencyBonuses(revolver!, 1)
    expect(revL1.aimedStrikeBonus).toBe(4)
    expect(revL1.burstStrikeBonus).toBe(1)

    const pistolL4 = accumulateWeaponProficiencyBonuses(pistol!, 4)
    expect(pistolL4.aimedStrikeBonus).toBe(4)
    expect(pistolL4.burstStrikeBonus).toBe(2)
  })

  it('returns null when the W.P. is not unlocked', () => {
    expect(
      resolveOwnedWeaponProficiencyBonuses('wp_sword', new Set(), 3),
    ).toBeNull()
  })

  it('returns catalog bonuses when unlocked', () => {
    const owned = resolveOwnedWeaponProficiencyBonuses(
      'wp_sword',
      new Set(['wp_sword']),
      3,
    )
    expect(owned?.entry.id).toBe('wp_sword')
    expect(owned?.bonuses.strike).toBe(2)
    expect(owned?.bonuses.parry).toBe(2)
  })
})
