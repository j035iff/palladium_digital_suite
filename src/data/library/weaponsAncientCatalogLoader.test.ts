import { describe, expect, it } from 'vitest'
import {
  ANCIENT_WEAPON_CATALOG,
  ancientCatalogToInventoryPiece,
  ancientWeaponCategoryLabel,
  getAncientWeaponById,
  listAncientWeaponsForGearPicker,
  resolveAncientWeaponCombatStats,
} from './weaponsAncientCatalogLoader'

describe('weaponsAncientCatalogLoader', () => {
  it('loads the Nightbane ancient weapons pool', () => {
    expect(ANCIENT_WEAPON_CATALOG.length).toBeGreaterThan(50)
    expect(getAncientWeaponById('weapon_ancient_long_sword')?.name).toBe('Long Sword')
  })

  it('lists gear-picker rows for nightbane (excludes ammo-only)', () => {
    const rows = listAncientWeaponsForGearPicker('nightbane')
    expect(rows.some((r) => r.id === 'weapon_ancient_long_sword')).toBe(true)
    expect(rows.some((r) => r.entryRole === 'ammunition')).toBe(false)
  })

  it('resolves qualityVariants damage for Katana', () => {
    const katana = getAncientWeaponById('weapon_ancient_katana')
    expect(katana).toBeTruthy()
    const regular = resolveAncientWeaponCombatStats(katana!, 'nightbane', 'regular')
    const top = resolveAncientWeaponCombatStats(katana!, 'nightbane', 'top')
    expect(regular?.damage).toBe('2D6')
    expect(top?.damage).toBe('3D6')
  })

  it('maps catalog row to inventory piece with throwable / W.P.', () => {
    const entry = getAncientWeaponById('weapon_ancient_throwing_axe')
    expect(entry).toBeTruthy()
    const piece = ancientCatalogToInventoryPiece(entry!, 'nightbane')
    expect(piece).toMatchObject({
      catalogWeaponId: 'weapon_ancient_throwing_axe',
      damage: '1D6',
      throwable: true,
      linkedWpSkillId: 'wp_battle_axe',
      weaponProficiencyEligible: true,
    })
  })

  it('omits W.P. link when weaponProficiencyEligible is false', () => {
    const entry = getAncientWeaponById('weapon_ancient_blackjack')
    expect(entry).toBeTruthy()
    const piece = ancientCatalogToInventoryPiece(entry!, 'nightbane')
    expect(piece?.weaponProficiencyEligible).toBe(false)
    expect(piece?.linkedWpSkillId).toBeUndefined()
  })

  it('lists Daisho under both large and short swords', () => {
    const daisho = getAncientWeaponById('weapon_ancient_daisho')
    expect(daisho?.category).toEqual(['large_swords', 'short_swords'])
    expect(ancientWeaponCategoryLabel(daisho!.category)).toBe('Large Swords / Short Swords')
  })
})
