import { describe, expect, it } from 'vitest'
import {
  addCombatEraSlot,
  applyStrikePenaltyToWeaponProfile,
  characterHasWpForWeapon,
  combatWeaponGlyphId,
  formatHandToHandCategoryTitle,
  formatHandToHandHeader,
  formatHandToHandStyleBadge,
  hostGenreOffersModernWeapons,
  isShieldWeapon,
  isWeaponPairable,
  isWeaponTwoHanded,
  listCarriedWeaponsOfEra,
  listSlotWeaponOptions,
  modernTwoGunStrikePenalty,
  MODERN_TWO_GUN_OFFHAND_STRIKE_PENALTY,
  MODERN_TWO_GUN_PRIMARY_STRIKE_PENALTY,
  formatCombatWeaponSlotLabel,
  normalizeCombatEraSlots,
  removeCombatEraSlot,
  resolvePairedWeaponsSlotStatus,
  resolvePickedWeaponId,
  resolveWeaponCombatEra,
  resolveWeaponCombatWpSkillId,
  shouldShowPairableBadge,
} from './combatWeaponSlots'
import { resolveWeaponProficiencySkillId } from '../data/skillLibrary'
import {
  ancientCatalogToInventoryPiece,
  getAncientWeaponById,
  listAncientWeaponsForGameSystem,
} from '../data/library/weaponsAncientCatalogLoader'
import { createInventoryWeaponFromPiece } from './gear/inventoryWeaponCommit'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import type { Character, Weapon } from '../types'
import type { WeaponProfileBonuses } from './weaponBonuses'

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

function bareCharacter(
  skillIds: string[],
  opts?: { instanceCatalog?: { id: string; catalogSkillId: string }[] },
): Character {
  const skills = [
    ...skillIds.map((id) => ({
      id,
      catalogSkillId: id,
      name: id,
      level: 1,
      restricted: false,
    })),
    ...(opts?.instanceCatalog ?? []).map((row) => ({
      id: row.id,
      catalogSkillId: row.catalogSkillId,
      name: row.catalogSkillId,
      level: 1,
      restricted: false,
    })),
  ]
  return {
    primary: { skills },
    morphus: { skills: [] },
  } as unknown as Character
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

  it('lists carried weapons by era', () => {
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
  })

  it('defaults dropdown pick to None when not in list', () => {
    const sword = weapon({ id: 'a', name: 'A', linkedWpSkillId: 'wp_sword' })
    expect(resolvePickedWeaponId([sword], null)).toBe(null)
    expect(resolvePickedWeaponId([sword], 'a')).toBe('a')
    expect(resolvePickedWeaponId([sword], 'missing')).toBe(null)
  })

  it('formats the Hand-to-Hand header pieces for the mockup', () => {
    expect(formatHandToHandCategoryTitle('Hand-to-Hand: Expert')).toBe('Hand to Hand')
    expect(formatHandToHandStyleBadge('Hand-to-Hand: Expert')).toBe('EXPERT')
    expect(formatHandToHandHeader('Hand-to-Hand: Expert')).toBe('Hand to Hand: EXPERT')
    expect(formatHandToHandHeader(null)).toBe('Hand to Hand: NONE')
  })

  it('treats non-two-handed weapons as pairable and flags two-handed', () => {
    const sword = weapon({ id: 's', name: 'Sword', twoHanded: false })
    const staff = weapon({ id: 't', name: 'Staff', twoHanded: true })
    expect(isWeaponPairable(sword)).toBe(true)
    expect(isWeaponTwoHanded(staff)).toBe(true)
    expect(isWeaponPairable(staff)).toBe(false)
  })

  it('shows pairable badge only with Paired Weapons skill + non-2H weapon', () => {
    const sword = weapon({ id: 's', name: 'Sword', twoHanded: false })
    const staff = weapon({ id: 't', name: 'Staff', twoHanded: true })
    const noSkill = bareCharacter(['wp_sword'])
    const withSkill = bareCharacter(['wp_paired_weapons', 'wp_sword'])
    expect(shouldShowPairableBadge(noSkill, 'primary', sword)).toBe(false)
    expect(shouldShowPairableBadge(withSkill, 'primary', sword)).toBe(true)
    expect(shouldShowPairableBadge(withSkill, 'primary', staff)).toBe(false)
  })

  it('detects shields via isShield or name/category', () => {
    expect(isShieldWeapon(weapon({ id: '1', name: 'Buckler', isShield: true }))).toBe(
      true,
    )
    expect(
      isShieldWeapon(weapon({ id: '2', name: 'Round Shield', category: 'Shields' })),
    ).toBe(true)
    expect(isShieldWeapon(weapon({ id: '3', name: 'Long Sword' }))).toBe(false)
  })

  it('adds shields only to secondary+ dropdown options', () => {
    const sword = weapon({ id: 's', name: 'Sword', linkedWpSkillId: 'wp_sword' })
    const shield = weapon({
      id: 'sh',
      name: 'Shield',
      category: 'Shields',
      isShield: true,
      linkedWpSkillId: 'wp_shield',
    })
    const primary = listSlotWeaponOptions([sword, shield], 'ancient', 0)
    const secondary = listSlotWeaponOptions([sword, shield], 'ancient', 1)
    expect(primary.map((w) => w.id)).toEqual(['s'])
    expect(secondary.map((w) => w.id).sort()).toEqual(['s', 'sh'])
  })

  it('applies modern two-gun strike penalties −2 / −6', () => {
    const p1 = weapon({
      id: 'p1',
      name: 'Pistol A',
      payload: { current: 6, max: 6 },
      linkedWpSkillId: 'wp_automatic_pistol',
    })
    const p2 = weapon({
      id: 'p2',
      name: 'Pistol B',
      payload: { current: 6, max: 6 },
      linkedWpSkillId: 'wp_automatic_pistol',
    })
    expect(modernTwoGunStrikePenalty([p1], 0)).toBe(0)
    expect(modernTwoGunStrikePenalty([p1, p2], 0)).toBe(
      MODERN_TWO_GUN_PRIMARY_STRIKE_PENALTY,
    )
    expect(modernTwoGunStrikePenalty([p1, p2], 1)).toBe(
      MODERN_TWO_GUN_OFFHAND_STRIKE_PENALTY,
    )
    const profile = {
      weaponId: 'p1',
      isMeleeWeapon: false,
      activeWeaponTraits: [],
      strike: { lines: [{ key: 'pp', label: 'P.P.', amount: 2 }], total: 2 },
      parry: { lines: [], total: 0 },
      throw: null,
      wpSkillDisplayName: null,
    } satisfies WeaponProfileBonuses
    const withPen = applyStrikePenaltyToWeaponProfile(profile, -2)
    expect(withPen.strike.total).toBe(0)
    expect(withPen.strike.lines.some((l) => l.key === 'two_gun')).toBe(true)
  })

  it('gates Paired Weapons abilities on pairable + W.P. each', () => {
    const sword = weapon({
      id: 's',
      name: 'Sword',
      linkedWpSkillId: 'wp_sword',
      twoHanded: false,
    })
    const club = weapon({
      id: 'c',
      name: 'Club',
      linkedWpSkillId: 'wp_blunt',
      category: 'Blunt',
      twoHanded: false,
    })
    const withSkill = bareCharacter(['wp_paired_weapons', 'wp_sword'])
    const status = resolvePairedWeaponsSlotStatus([sword, club], withSkill, 'primary')
    expect(status.abilitiesActive).toBe(false)
    expect(status.blockedReason).toMatch(/W\.P\. for each/i)

    const bothWp = bareCharacter(['wp_paired_weapons', 'wp_sword', 'wp_blunt'])
    expect(
      resolvePairedWeaponsSlotStatus([sword, club], bothWp, 'primary').abilitiesActive,
    ).toBe(true)

    expect(characterHasWpForWeapon(bothWp, 'primary', sword)).toBe(true)
    expect(characterHasWpForWeapon(withSkill, 'primary', club)).toBe(false)
  })

  it('keeps Primary+Secondary; only 3rd+ slots are removable', () => {
    expect(normalizeCombatEraSlots([])).toEqual([null, null])
    expect(normalizeCombatEraSlots([null])).toEqual([null, null])
    expect(addCombatEraSlot([null, null])).toEqual([null, null, null])
    // Secondary (index 1) is not removable
    expect(removeCombatEraSlot([null, 'a', 'b'], 1)).toEqual([null, 'a', 'b'])
    // Primary (index 0) is not removable
    expect(removeCombatEraSlot([null, 'a', 'b'], 0)).toEqual([null, 'a', 'b'])
    // 3rd slot (index 2) removes
    expect(removeCombatEraSlot([null, 'a', 'b'], 2)).toEqual([null, 'a'])
    expect(formatCombatWeaponSlotLabel(0)).toBe('PRIMARY')
    expect(formatCombatWeaponSlotLabel(1)).toBe('SECONDARY')
    expect(formatCombatWeaponSlotLabel(2)).toBe('SLOT 3')
  })

  it('detects Archery and Targeting for Short Bow (No W.P. indicator)', () => {
    expect(
      resolveWeaponProficiencySkillId('W.P. Archery and Targeting', null),
    ).toBe('wp_archery_and_targeting')
    expect(
      resolveWeaponProficiencySkillId('Archery and Targeting', null),
    ).toBe('wp_archery_and_targeting')

    const entry = getAncientWeaponById('weapon_ancient_short_bow')
    expect(entry?.linkedWpSkillId).toBe('wp_archery_and_targeting')
    const piece = ancientCatalogToInventoryPiece(entry!, 'nightbane')
    expect(piece?.linkedWpSkillId).toBe('wp_archery_and_targeting')
    const inv = createInventoryWeaponFromPiece(piece!) as Weapon
    expect(resolveWeaponCombatWpSkillId(inv)).toBe('wp_archery_and_targeting')

    const withWp = bareCharacter(['wp_archery_and_targeting'])
    expect(characterHasWpForWeapon(withWp, 'primary', inv)).toBe(true)
    expect(characterHasWpForWeapon(bareCharacter([]), 'primary', inv)).toBe(
      false,
    )

    // Creation instance id ≠ catalog id still counts as owned (Unified Path)
    const viaCatalogId = bareCharacter([], {
      instanceCatalog: [
        {
          id: 'pick-archery-uuid',
          catalogSkillId: 'wp_archery_and_targeting',
        },
      ],
    })
    expect(characterHasWpForWeapon(viaCatalogId, 'primary', inv)).toBe(true)
  })

  it('resolves linkedWpSkillId for every inventory-eligible ancient weapon', () => {
    const gaps: string[] = []
    /** Miscellaneous catalog rows intentionally strip W.P. (Nightbane table note). */
    const intentionalNoWp: string[] = []
    for (const entry of listAncientWeaponsForGameSystem('nightbane')) {
      if ((entry.entryRole ?? 'weapon') !== 'weapon') continue
      const piece = ancientCatalogToInventoryPiece(entry, 'nightbane')
      if (!piece) continue
      if (piece.weaponProficiencyEligible === false) {
        if (entry.linkedWpSkillId) {
          intentionalNoWp.push(`${entry.id} (${entry.name})`)
        }
        continue
      }
      const inv = createInventoryWeaponFromPiece(piece) as Weapon
      const wpId = resolveWeaponCombatWpSkillId(inv)
      if (!wpId) {
        gaps.push(`${entry.id} (${entry.name}): no combat W.P. id`)
        continue
      }
      if (!getWeaponProficiencyCatalogEntryById(wpId)) {
        gaps.push(
          `${entry.id} (${entry.name}): linked ${wpId} missing from W.P. catalog`,
        )
      }
    }
    expect(gaps).toEqual([])
    // Document intentional misc strip (not a resolver bug)
    expect(intentionalNoWp.length).toBeGreaterThan(0)
  })
})
