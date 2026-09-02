import type { AmmoReservesState } from './ammoReserves'
import { syncArmorAndWeaponFlags } from './inventoryArmorSync'
import type {
  Armor,
  CharacterInventoryState,
  CharacterRootState,
  InventoryItem,
} from '../types'

export type InventorySessionState = {
  items: InventoryItem[]
  equippedArmorId: string | null
  readyWeaponIds: readonly [string | null, string | null]
  ammoReserves: AmmoReservesState
}

export const EMPTY_INVENTORY_SESSION: InventorySessionState = {
  items: [],
  equippedArmorId: null,
  readyWeaponIds: [null, null],
  ammoReserves: {},
}

function isInventoryItemRow(row: unknown): row is InventoryItem {
  if (!row || typeof row !== 'object') return false
  const o = row as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.weightLbs === 'number' &&
    Number.isFinite(o.weightLbs) &&
    (o.itemType === 'gear' || o.itemType === 'armor' || o.itemType === 'weapon')
  )
}

function sanitizeEquippedArmorId(
  items: InventoryItem[],
  id: unknown,
): string | null {
  if (typeof id !== 'string' || !id) return null
  const row = items.find((i) => i.id === id)
  if (row?.itemType !== 'armor') return null
  const armor = row as Armor
  return armor.currentSdc > 0 ? id : null
}

function sanitizeReadyWeaponIds(
  items: InventoryItem[],
  ids: unknown,
): [string | null, string | null] {
  const tuple = Array.isArray(ids) && ids.length === 2 ? ids : [null, null]
  const resolve = (id: unknown): string | null => {
    if (typeof id !== 'string' || !id) return null
    const row = items.find((i) => i.id === id)
    return row?.itemType === 'weapon' ? id : null
  }
  return [resolve(tuple[0]), resolve(tuple[1])]
}

function sanitizeAmmoReserves(raw: unknown): AmmoReservesState {
  if (!raw || typeof raw !== 'object') return {}
  const out: AmmoReservesState = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmed = key.trim()
    if (!trimmed || typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      continue
    }
    out[trimmed] = Math.floor(value)
  }
  return out
}

/** Read and sanitize persisted inventory into live session state. */
export function hydrateInventorySession(
  character: CharacterRootState,
): InventorySessionState {
  const block = character.inventory
  if (!block) return { ...EMPTY_INVENTORY_SESSION }

  const items = (Array.isArray(block.items) ? block.items : []).filter(
    isInventoryItemRow,
  )
  const equippedArmorId = sanitizeEquippedArmorId(items, block.equippedArmorId)
  const readyWeaponIds = sanitizeReadyWeaponIds(items, block.readyWeaponIds)
  const ammoReserves = sanitizeAmmoReserves(block.ammoReserves)

  return {
    items: syncArmorAndWeaponFlags(items, equippedArmorId, readyWeaponIds),
    equippedArmorId,
    readyWeaponIds,
    ammoReserves,
  }
}

export function buildInventorySaveBlock(
  session: InventorySessionState,
): CharacterInventoryState {
  return {
    items: session.items,
    equippedArmorId: session.equippedArmorId,
    readyWeaponIds: [session.readyWeaponIds[0], session.readyWeaponIds[1]],
    ammoReserves: { ...session.ammoReserves },
  }
}

function sessionHasInventoryData(session: InventorySessionState): boolean {
  return (
    session.items.length > 0 ||
    session.equippedArmorId != null ||
    session.readyWeaponIds[0] != null ||
    session.readyWeaponIds[1] != null ||
    Object.keys(session.ammoReserves).length > 0
  )
}

/** Attach inventory session to the character root before serialization. */
export function mergeCharacterWithInventory(
  state: CharacterRootState,
  session: InventorySessionState,
): CharacterRootState {
  if (!sessionHasInventoryData(session)) {
    const { inventory: _drop, ...rest } = state
    return rest as CharacterRootState
  }
  return {
    ...state,
    inventory: buildInventorySaveBlock(session),
  }
}
