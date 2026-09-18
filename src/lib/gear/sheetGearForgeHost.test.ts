import { describe, expect, it } from 'vitest'
import {
  applyInventoryWeaponPatch,
  createInventoryWeaponFromPiece,
} from './inventoryWeaponCommit'
import { buildSheetGearForgeAdapter } from './sheetGearForgeHost'
import type { InventoryItem, Weapon } from '../../types'

describe('buildSheetGearForgeAdapter', () => {
  it('exposes kind sheet and commits through inventory callbacks', () => {
    let items: InventoryItem[] = []
    const adapter = buildSheetGearForgeAdapter({
      genreId: 'nightbane',
      targetLabel: 'Test Hero',
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

    expect(adapter.kind).toBe('sheet')
    expect(adapter.genreId).toBe('nightbane')
    expect(adapter.targetLabel).toBe('Test Hero')
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
