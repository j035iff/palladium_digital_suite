import type { InventoryItem } from '../../types'
import type {
  GearForgeHostAdapter,
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from './gearForgeHost'

export type GmGearForgeAdapterDeps = {
  genreId: string
  targetLabel?: string
  commitBlockedReason?: string | null
  listItems: () => readonly InventoryItem[]
  addWeapon: (piece: GearForgeWeaponPiece) => void
  updateWeapon: (id: string, patch: GearForgeWeaponPatch) => void
  dropItem: (id: string) => void
}

/**
 * GM Hub host adapter — commits to a selected party character’s save inventory.
 * Same {@link GearForgeHostAdapter} contract as library / creation / sheet (Pillar 9).
 */
export function buildGmGearForgeAdapter(
  deps: GmGearForgeAdapterDeps,
): GearForgeHostAdapter {
  return {
    kind: 'gm',
    genreId: deps.genreId,
    targetLabel: deps.targetLabel,
    commitBlockedReason: deps.commitBlockedReason ?? null,
    listItems: deps.listItems,
    addWeapon: deps.addWeapon,
    updateWeapon: deps.updateWeapon,
    dropItem: deps.dropItem,
  }
}
