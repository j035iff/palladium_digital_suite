import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { characterFixture } from '../../data/characterFixture'
import type { InventoryItem, Weapon } from '../../types'
import { saveCharacterToStorage } from '../characterIndex'
import { ensureCharacterRoot } from '../characterRoot'
import {
  applyInventoryWeaponPatch,
  createInventoryWeaponFromPiece,
} from './inventoryWeaponCommit'
import { buildGmGearForgeAdapter } from './gmGearForgeHost'
import {
  addWeaponToCharacterSave,
  dropItemFromCharacterSave,
  gmGearCommitBlockedReason,
  GM_CAST_GEAR_BLOCKED_REASON,
  listCharacterSaveInventory,
  updateWeaponOnCharacterSave,
} from './gmCharacterInventoryGrant'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const memory: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
    writable: true,
  })
}

describe('buildGmGearForgeAdapter', () => {
  it('exposes kind gm and commits through inventory callbacks', () => {
    let items: InventoryItem[] = []
    const adapter = buildGmGearForgeAdapter({
      genreId: 'nightbane',
      targetLabel: 'Party Hero',
      listItems: () => items,
      addWeapon: (piece) => {
        items = [...items, createInventoryWeaponFromPiece(piece, 'w1')]
      },
      updateWeapon: (id, patch) => {
        items = items.map((it) => {
          if (it.id !== id || it.itemType !== 'weapon') return it
          return applyInventoryWeaponPatch(it as Weapon, patch)
        })
      },
      dropItem: (id) => {
        items = items.filter((it) => it.id !== id)
      },
    })

    expect(adapter.kind).toBe('gm')
    expect(adapter.genreId).toBe('nightbane')
    expect(adapter.targetLabel).toBe('Party Hero')
    expect(adapter.commitBlockedReason).toBeNull()

    adapter.addWeapon({
      name: 'Short sword',
      category: 'Sword',
      damage: '2D4',
      forgeProperties: { qualityLabel: 'Excellent' },
    })
    expect(adapter.listItems()).toHaveLength(1)
    expect((adapter.listItems()[0] as Weapon).forgeProperties?.qualityLabel).toBe(
      'Excellent',
    )

    adapter.updateWeapon('w1', { damage: '2D6' })
    expect((adapter.listItems()[0] as Weapon).damage).toBe('2D6')

    adapter.dropItem('w1')
    expect(adapter.listItems()).toHaveLength(0)
  })
})

describe('gmGearCommitBlockedReason', () => {
  it('explains missing campaign, target, and save', () => {
    expect(
      gmGearCommitBlockedReason({
        campaignOpen: false,
        targetCharacterId: null,
      }),
    ).toMatch(/campaign/i)
    expect(
      gmGearCommitBlockedReason({
        campaignOpen: true,
        targetCharacterId: null,
      }),
    ).toMatch(/party character/i)
    expect(
      gmGearCommitBlockedReason({
        campaignOpen: true,
        targetCharacterId: 'c1',
        saveMissing: true,
      }),
    ).toMatch(/missing/i)
    expect(
      gmGearCommitBlockedReason({
        campaignOpen: true,
        targetCharacterId: 'c1',
      }),
    ).toBeNull()
    expect(GM_CAST_GEAR_BLOCKED_REASON).toMatch(/Cast Quick-Blocks/i)
  })
})

describe('character save inventory grant', () => {
  const id = 'gm_grant_test_char'

  beforeEach(() => {
    installMemoryLocalStorage()
    localStorage.clear()
    saveCharacterToStorage({
      ...ensureCharacterRoot(characterFixture, {
        creationGenreId: 'nightbane',
        hostGenreId: 'nightbane',
      }),
      id,
      name: 'Grant Target',
      isFinalized: true,
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('lists, adds, updates, and drops weapons on the save', () => {
    expect(listCharacterSaveInventory(id)).toHaveLength(0)

    expect(
      addWeaponToCharacterSave(id, {
        name: 'Knife',
        category: 'Knife',
        damage: '1D6',
        forgeProperties: { indestructible: true },
      }),
    ).toBe(true)

    const listed = listCharacterSaveInventory(id)
    expect(listed).toHaveLength(1)
    const weapon = listed[0] as Weapon
    expect(weapon.name).toBe('Knife')
    expect(weapon.forgeProperties?.indestructible).toBe(true)

    expect(updateWeaponOnCharacterSave(id, weapon.id, { damage: '2D4' })).toBe(
      true,
    )
    expect((listCharacterSaveInventory(id)[0] as Weapon).damage).toBe('2D4')

    expect(dropItemFromCharacterSave(id, weapon.id)).toBe(true)
    expect(listCharacterSaveInventory(id)).toHaveLength(0)
  })

  it('returns false when the save is missing', () => {
    expect(
      addWeaponToCharacterSave('no_such_char', {
        name: 'X',
        category: 'Misc',
        damage: '1D6',
      }),
    ).toBe(false)
  })
})
