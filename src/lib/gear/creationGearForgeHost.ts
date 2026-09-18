import type { InventoryItem } from '../../types'
import type {
  GearForgeHostAdapter,
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from './gearForgeHost'

export type CreationGearForgeAdapterDeps = {
  genreId: string
  targetLabel?: string
  commitBlockedReason?: string | null
  listItems: () => readonly InventoryItem[]
  addWeapon: (piece: GearForgeWeaponPiece) => void
  updateWeapon: (id: string, patch: GearForgeWeaponPatch) => void
  dropItem: (id: string) => void
}

/**
 * Creation host adapter — commits to draft character inventory.
 * Same {@link GearForgeHostAdapter} contract as library / sheet / GM (Pillar 9).
 */
export function buildCreationGearForgeAdapter(
  deps: CreationGearForgeAdapterDeps,
): GearForgeHostAdapter {
  return {
    kind: 'creation',
    genreId: deps.genreId,
    targetLabel: deps.targetLabel,
    commitBlockedReason: deps.commitBlockedReason ?? null,
    listItems: deps.listItems,
    addWeapon: deps.addWeapon,
    updateWeapon: deps.updateWeapon,
    dropItem: deps.dropItem,
  }
}
