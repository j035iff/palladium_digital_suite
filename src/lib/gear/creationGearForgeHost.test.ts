import { describe, expect, it } from 'vitest'
import {
  applyInventoryWeaponPatch,
  createInventoryWeaponFromPiece,
} from './inventoryWeaponCommit'
import { buildCreationGearForgeAdapter } from './creationGearForgeHost'
import type { InventoryItem, Weapon } from '../../types'
import type { GearForgeWeaponPiece } from './gearForgeHost'

describe('createInventoryWeaponFromPiece', () => {
  it('maps forgeProperties and isArtifact onto the inventory weapon', () => {
    const piece: GearForgeWeaponPiece = {
      name: 'Rune blade',
      category: 'Sword',
      damage: '4D6',
      strikeBonus: 2,
      forgeProperties: {
        indestructible: true,
        qualityLabel: 'Excellent',
        damageMultipliers: [
          { id: 'm1', label: 'vs supernatural', multiplier: 2 },
        ],
      },
      isArtifact: true,
    }
    const row = createInventoryWeaponFromPiece(piece, 'weapon_test_1')
    expect(row.id).toBe('weapon_test_1')
    expect(row.itemType).toBe('weapon')
    expect(row.name).toBe('Rune blade')
    expect(row.forgeProperties?.indestructible).toBe(true)
    expect(row.forgeProperties?.qualityLabel).toBe('Excellent')
    expect(row.isArtifact).toBe(true)
  })
})

describe('applyInventoryWeaponPatch', () => {
  it('merges patch while preserving id and itemType', () => {
    const base = createInventoryWeaponFromPiece(
      { name: 'Club', category: 'Blunt', damage: '1D6' },
      'weapon_x',
    )
    const next = applyInventoryWeaponPatch(base, {
      damage: '2D6',
      forgeProperties: { indestructible: true },
    })
    expect(next.id).toBe('weapon_x')
    expect(next.itemType).toBe('weapon')
    expect(next.damage).toBe('2D6')
    expect(next.forgeProperties?.indestructible).toBe(true)
  })
})

describe('buildCreationGearForgeAdapter', () => {
  it('exposes kind creation and commits through inventory callbacks', () => {
    let items: InventoryItem[] = []
    const adapter = buildCreationGearForgeAdapter({
      genreId: 'nightbane',
      targetLabel: 'Test Draft',
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

    expect(adapter.kind).toBe('creation')
    expect(adapter.genreId).toBe('nightbane')
    expect(adapter.targetLabel).toBe('Test Draft')
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
