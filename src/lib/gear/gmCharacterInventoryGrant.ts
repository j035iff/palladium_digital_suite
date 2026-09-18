import type { InventoryItem, Weapon } from '../../types'
import {
  loadCharacterSave,
  saveCharacterToStorage,
} from '../characterIndex'
import { loadPartyCharacterRoot } from '../gm/partyObserver'
import {
  hydrateInventorySession,
  mergeCharacterWithInventory,
  type InventorySessionState,
} from '../inventoryPersistence'
import { syncArmorAndWeaponFlags } from '../inventoryArmorSync'
import {
  applyInventoryWeaponPatch,
  createInventoryWeaponFromPiece,
} from './inventoryWeaponCommit'
import type { GearForgeWeaponPatch, GearForgeWeaponPiece } from './gearForgeHost'

/** Radical Visibility: why GM Gear cannot grant yet. */
export function gmGearCommitBlockedReason(opts: {
  campaignOpen: boolean
  targetCharacterId: string | null
  saveMissing?: boolean
}): string | null {
  if (!opts.campaignOpen) {
    return 'Open a campaign from the launcher first'
  }
  if (!opts.targetCharacterId?.trim()) {
    return 'Select a party character to grant gear'
  }
  if (opts.saveMissing) {
    return 'That party character save is missing on this machine'
  }
  return null
}

/** Cast Quick-Blocks have no inventory — keep visible in chrome, never invent bags. */
export const GM_CAST_GEAR_BLOCKED_REASON =
  'Cast Quick-Blocks have no character inventory yet — grant to a party character save'

function readInventorySession(characterId: string): InventorySessionState | null {
  const raw = loadCharacterSave(characterId)
  if (!raw) return null
  const rooted = loadPartyCharacterRoot(raw)
  return hydrateInventorySession(rooted)
}

function writeInventorySession(
  characterId: string,
  session: InventorySessionState,
): boolean {
  const raw = loadCharacterSave(characterId)
  if (!raw) return false
  const rooted = loadPartyCharacterRoot(raw)
  saveCharacterToStorage(mergeCharacterWithInventory(rooted, session))
  return true
}

/** List inventory rows from a party character’s local save (empty if missing). */
export function listCharacterSaveInventory(
  characterId: string,
): readonly InventoryItem[] {
  return readInventorySession(characterId)?.items ?? []
}

/** Grant a forged/catalog weapon into a party character save. Returns false if save missing. */
export function addWeaponToCharacterSave(
  characterId: string,
  piece: GearForgeWeaponPiece,
): boolean {
  const session = readInventorySession(characterId)
  if (!session) return false
  const row = createInventoryWeaponFromPiece(piece)
  const items = syncArmorAndWeaponFlags(
    [...session.items, row],
    session.equippedArmorId,
    session.readyWeaponIds,
  )
  return writeInventorySession(characterId, { ...session, items })
}

/** Patch an existing weapon on a party character save. */
export function updateWeaponOnCharacterSave(
  characterId: string,
  weaponId: string,
  patch: GearForgeWeaponPatch,
): boolean {
  const session = readInventorySession(characterId)
  if (!session) return false
  const items = syncArmorAndWeaponFlags(
    session.items.map((it) => {
      if (it.id !== weaponId || it.itemType !== 'weapon') return it
      return applyInventoryWeaponPatch(it as Weapon, patch)
    }),
    session.equippedArmorId,
    session.readyWeaponIds,
  )
  return writeInventorySession(characterId, { ...session, items })
}

/** Drop an inventory row from a party character save (clears ready/equip refs). */
export function dropItemFromCharacterSave(
  characterId: string,
  itemId: string,
): boolean {
  const session = readInventorySession(characterId)
  if (!session) return false
  const nextEq =
    session.equippedArmorId === itemId ? null : session.equippedArmorId
  const nextReady: [string | null, string | null] = [
    session.readyWeaponIds[0] === itemId ? null : session.readyWeaponIds[0],
    session.readyWeaponIds[1] === itemId ? null : session.readyWeaponIds[1],
  ]
  const items = syncArmorAndWeaponFlags(
    session.items.filter((x) => x.id !== itemId),
    nextEq,
    nextReady,
  )
  return writeInventorySession(characterId, {
    ...session,
    items,
    equippedArmorId: nextEq,
    readyWeaponIds: nextReady,
  })
}
