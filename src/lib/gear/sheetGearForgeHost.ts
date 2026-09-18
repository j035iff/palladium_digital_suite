import type { InventoryItem } from '../../types'
import type {
  GearForgeHostAdapter,
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from './gearForgeHost'

export type SheetGearForgeAdapterDeps = {
  genreId: string
  targetLabel?: string
  commitBlockedReason?: string | null
  listItems: () => readonly InventoryItem[]
  addWeapon: (piece: GearForgeWeaponPiece) => void
  updateWeapon: (id: string, patch: GearForgeWeaponPatch) => void
  dropItem: (id: string) => void
}

/**
 * Live sheet host adapter — commits to active character inventory.
 * Same {@link GearForgeHostAdapter} contract as library / creation / GM (Pillar 9).
 */
export function buildSheetGearForgeAdapter(
  deps: SheetGearForgeAdapterDeps,
): GearForgeHostAdapter {
  return {
    kind: 'sheet',
    genreId: deps.genreId,
    targetLabel: deps.targetLabel,
    commitBlockedReason: deps.commitBlockedReason ?? null,
    listItems: deps.listItems,
    addWeapon: deps.addWeapon,
    updateWeapon: deps.updateWeapon,
    dropItem: deps.dropItem,
  }
}
