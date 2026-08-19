import { describe, expect, it } from 'vitest'
import {
  combatWeaponGlyphId,
  defaultSelectedWeaponId,
  formatHandToHandHeader,
  hostGenreOffersModernWeapons,
  listCarriedWeaponsOfEra,
  resolveWeaponCombatEra,
} from './combatWeaponSlots'
import type { Weapon } from '../types'

function weapon(partial: Partial<Weapon> & Pick<Weapon, 'id' | 'name'>): Weapon {
  return {
    itemType: 'weapon',
    weightLbs: 2,
    category: 'Swords',
    strikeBonus: 0,
    damage: '2D6',
    isEquipped: false,
    ...partial,
  }
}

describe('combatWeaponSlots', () => {
  it('classifies W.P. Sword as ancient', () => {
    const w = weapon({
      id: 'sword-1',
      name: 'Long sword',
      wpCategory: 'W.P. Sword',
      linkedWpSkillId: 'wp_sword',
    })
    expect(resolveWeaponCombatEra(w)).toBe('ancient')
    expect(combatWeaponGlyphId(w)).toBe('sword')
  })

  it('classifies automatic pistol as modern', () => {
    const w = weapon({
      id: 'pistol-1',
      name: '9mm',
      category: 'Handguns',
      wpCategory: 'W.P. Automatic Pistol',
      linkedWpSkillId: 'wp_automatic_pistol',
      payload: { current: 8, max: 8 },
      damage: '3D6',
    })
    expect(resolveWeaponCombatEra(w)).toBe('modern')
    expect(combatWeaponGlyphId(w)).toBe('pistol')
  })

  it('reports whether the host genre catalog includes modern W.P. rows', () => {
    expect(hostGenreOffersModernWeapons('nightbane')).toBe(true)
    expect(hostGenreOffersModernWeapons('palladium_fantasy')).toBe(false)
  })

  it('lists carried weapons by era and prefers a ready-slot id', () => {
    const sword = weapon({ id: 'a', name: 'A', linkedWpSkillId: 'wp_sword' })
    const knife = weapon({
      id: 'b',
      name: 'B',
      category: 'Knives',
      linkedWpSkillId: 'wp_knife',
    })
    const pistol = weapon({
      id: 'c',
      name: 'C',
      category: 'Handguns',
      linkedWpSkillId: 'wp_automatic_pistol',
      payload: { current: 1, max: 8 },
    })
    const ancient = listCarriedWeaponsOfEra([sword, knife, pistol], 'ancient')
    expect(ancient.map((w) => w.id)).toEqual(['a', 'b'])
    expect(defaultSelectedWeaponId(ancient, [null, 'b'])).toBe('b')
    expect(defaultSelectedWeaponId(ancient, [null, null])).toBe('a')
  })

  it('formats the Hand-to-Hand header', () => {
    expect(formatHandToHandHeader('Hand-to-Hand: Expert')).toBe('Hand to Hand: EXPERT')
    expect(formatHandToHandHeader(null)).toBe('Hand to Hand: NONE')
  })
})
