import type { Armor, InventoryItem } from '../types'
import { syncWeaponEquippedFlags } from './inventoryWeaponSync'

/** Keep each armor row's {@link Armor.isEquipped} aligned with the single equipped id. */
export function syncArmorEquippedFlags(
  items: InventoryItem[],
  equippedArmorId: string | null,
): InventoryItem[] {
  return items.map((it) => {
    if (it.itemType !== 'armor') return it
    const a = it as Armor
    return { ...a, isEquipped: a.id === equippedArmorId }
  })
}

/** Armor + primary/secondary weapon equip flags in one pass. */
export function syncArmorAndWeaponFlags(
  items: InventoryItem[],
  equippedArmorId: string | null,
  weaponSlots: readonly [string | null, string | null],
): InventoryItem[] {
  return syncWeaponEquippedFlags(
    syncArmorEquippedFlags(items, equippedArmorId),
    weaponSlots,
  )
}
