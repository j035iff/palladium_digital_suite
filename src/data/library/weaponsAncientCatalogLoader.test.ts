import { describe, expect, it } from 'vitest'
import {
  ANCIENT_WEAPON_CATALOG,
  ancientCatalogToCustomArchetypeDraft,
  ancientCatalogToInventoryPiece,
  ancientWeaponCategoryLabel,
  formatAncientWeaponPickerStatLine,
  getAncientWeaponById,
  listAncientWeaponsForGearPicker,
  resolveAncientWeaponCombatStats,
  sortAncientWeaponCategoriesMiscLast,
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

  it('strips W.P. for Miscellaneous category even when catalog row links one', () => {
    const kawanga = getAncientWeaponById('weapon_ancient_kawanga')
    expect(kawanga?.linkedWpSkillId).toBe('wp_chain')
    const piece = ancientCatalogToInventoryPiece(kawanga!, 'nightbane')
    expect(piece?.category).toBe('Miscellaneous')
    expect(piece?.linkedWpSkillId).toBeUndefined()
    expect(piece?.weaponProficiencyEligible).toBe(false)
    const draft = ancientCatalogToCustomArchetypeDraft(kawanga!, 'nightbane')
    expect(draft?.linkedWpSkillId).toBeUndefined()
    expect(draft?.weaponProficiencyEligible).toBe(false)
    const line = formatAncientWeaponPickerStatLine(kawanga!, 'nightbane')
    expect(line).not.toMatch(/W\.P\./i)
  })

  it('lists Daisho under both large and short swords', () => {
    const daisho = getAncientWeaponById('weapon_ancient_daisho')
    expect(daisho?.category).toEqual(['large_swords', 'short_swords'])
    expect(ancientWeaponCategoryLabel(daisho!.category)).toBe('Large Swords / Short Swords')
  })

  it('formats condensed picker stats from catalog fields', () => {
    const axe = getAncientWeaponById('weapon_ancient_throwing_axe')
    expect(axe).toBeTruthy()
    const line = formatAncientWeaponPickerStatLine(axe!, 'nightbane')
    expect(line).toContain('1D6')
    expect(line).toContain('lb')
    expect(line).toContain('thrown')
  })

  it('maps catalog row to custom archetype draft fields', () => {
    const nunchaku = getAncientWeaponById('weapon_ancient_nunchaku')
    expect(nunchaku).toBeTruthy()
    const draft = ancientCatalogToCustomArchetypeDraft(nunchaku!, 'nightbane')
    expect(draft).toMatchObject({
      name: 'Nunchaku',
      category: 'Chain',
      damage: expect.stringMatching(/D/),
      strikeDisplay: '+0',
      parryDisplay: '+0',
      entangleDisplay: '+0',
      disarmDisplay: '+0',
      rateOfFireDisplay: '+0',
      strikeWhenThrownDisplay: '+0',
      linkedWpSkillId: 'wp_blunt',
      weaponProficiencyEligible: true,
      addsPsDamageBonus: false,
      material: '',
    })
    expect(draft?.description).toMatch(/entangle/i)
    expect(draft?.catalogGaps.some((g) => /parry/i.test(g))).toBe(true)
  })

  it('maps throwable axe combat slots without inventing material or N/A matrices', () => {
    const axe = getAncientWeaponById('weapon_ancient_throwing_axe')
    const draft = ancientCatalogToCustomArchetypeDraft(axe!, 'nightbane')
    expect(draft).toMatchObject({
      name: 'Axe, Throwing',
      damage: '1D6',
      weightLbs: 3,
      lengthFeet: 1.25,
      throwable: true,
      strikeWhenThrownDisplay: '+0',
      entangleDisplay: '+0',
      disarmDisplay: '+0',
      rateOfFireDisplay: '+0',
      rangeDisplay: '',
      material: '',
      addsPsDamageBonus: false,
    })
  })

  it('sorts Miscellaneous category last', () => {
    const sorted = sortAncientWeaponCategoriesMiscLast([
      { slug: 'miscellaneous', label: 'Miscellaneous' },
      { slug: 'axes', label: 'Axes' },
      { slug: 'blunt', label: 'Blunt' },
    ])
    expect(sorted.map((c) => c.slug)).toEqual([
      'axes',
      'blunt',
      'miscellaneous',
    ])
  })
})
