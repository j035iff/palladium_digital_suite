import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { serializeCharacterRootForSave } from './characterSave'
import { ensureCharacterRoot } from './characterRoot'
import {
  EMPTY_INVENTORY_SESSION,
  buildInventorySaveBlock,
  hydrateInventorySession,
  mergeCharacterWithInventory,
} from './inventoryPersistence'
import type { Armor, CharacterRootState, Weapon } from '../types'

function testRoot(overrides: Partial<CharacterRootState> = {}): CharacterRootState {
  return ensureCharacterRoot(
    { ...characterFixture, isFinalized: true, ...overrides },
    { creationGenreId: 'nightbane', hostGenreId: 'nightbane' },
  )
}

const sampleArmor: Armor = {
  id: 'armor_test_1',
  itemType: 'armor',
  name: 'Tactical vest',
  weightLbs: 12,
  ar: 14,
  maxSdc: 50,
  currentSdc: 40,
  isEquipped: true,
  morphusCompatible: true,
}

const sampleWeapon: Weapon = {
  id: 'weapon_test_1',
  itemType: 'weapon',
  name: '9mm pistol',
  weightLbs: 2,
  category: 'Handguns',
  strikeBonus: 0,
  damage: '2d6',
  payload: { current: 8, max: 15 },
  ammoCategory: '9mm',
  isEquipped: true,
}

describe('inventoryPersistence', () => {
  it('returns empty session when save has no inventory block', () => {
    expect(hydrateInventorySession(testRoot())).toEqual(EMPTY_INVENTORY_SESSION)
  })

  it('hydrates and sanitizes inventory from save', () => {
    const root = testRoot({
      inventory: {
        items: [sampleArmor, sampleWeapon],
        equippedArmorId: sampleArmor.id,
        readyWeaponIds: [sampleWeapon.id, 'missing_weapon'],
        ammoReserves: { '9mm': 42, '': -1, bad: NaN },
      },
    })
    const session = hydrateInventorySession(root)
    expect(session.equippedArmorId).toBe(sampleArmor.id)
    expect(session.readyWeaponIds).toEqual([sampleWeapon.id, null])
    expect(session.ammoReserves).toEqual({ '9mm': 42 })
    expect(session.items).toHaveLength(2)
    expect((session.items[0] as Armor).isEquipped).toBe(true)
    expect((session.items[1] as Weapon).isEquipped).toBe(true)
  })

  it('drops equipped armor when S.D.C. is ruined', () => {
    const ruined: Armor = { ...sampleArmor, currentSdc: 0 }
    const session = hydrateInventorySession(
      testRoot({
        inventory: {
          items: [ruined],
          equippedArmorId: ruined.id,
          readyWeaponIds: [null, null],
          ammoReserves: {},
        },
      }),
    )
    expect(session.equippedArmorId).toBeNull()
    expect((session.items[0] as Armor).isEquipped).toBe(false)
  })

  it('omits inventory from save when session is empty', () => {
    const merged = mergeCharacterWithInventory(
      testRoot({ inventory: buildInventorySaveBlock(EMPTY_INVENTORY_SESSION) }),
      EMPTY_INVENTORY_SESSION,
    )
    expect(merged.inventory).toBeUndefined()
  })

  it('merges inventory into character root for persistence', () => {
    const session = {
      items: [sampleArmor],
      equippedArmorId: sampleArmor.id,
      readyWeaponIds: [null, null] as const,
      ammoReserves: { '9mm': 10 },
    }
    const merged = mergeCharacterWithInventory(testRoot(), session)
    expect(merged.inventory?.items).toHaveLength(1)
    expect(merged.inventory?.ammoReserves).toEqual({ '9mm': 10 })
  })

  it('round-trips through serializeCharacterRootForSave', () => {
    const session = {
      items: [{ ...sampleArmor, isHostGenreLocked: true } as Armor & { isHostGenreLocked: true }],
      equippedArmorId: sampleArmor.id,
      readyWeaponIds: [null, null] as const,
      ammoReserves: {},
    }
    const merged = mergeCharacterWithInventory(testRoot(), session)
    const saved = serializeCharacterRootForSave(merged)
    expect(saved.inventory?.items[0]).not.toHaveProperty('isHostGenreLocked')
    const reloaded = hydrateInventorySession(saved)
    expect(reloaded.items[0]?.id).toBe(sampleArmor.id)
  })
})
