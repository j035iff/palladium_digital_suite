import type { InventoryItem, Weapon } from '../types'

/** Keep weapon {@link Weapon.isEquipped} aligned with primary / secondary slot ids. */
export function syncWeaponEquippedFlags(
  items: InventoryItem[],
  equippedSlots: readonly [string | null, string | null],
): InventoryItem[] {
  const set = new Set(
    [equippedSlots[0], equippedSlots[1]].filter((x): x is string => Boolean(x)),
  )
  return items.map((it) => {
    if (it.itemType !== 'weapon') return it
    const w = it as Weapon
    return { ...w, isEquipped: set.has(w.id) }
  })
}
