import type { Weapon, WeaponForgeProperties } from '../../types'
import type { GearForgeWeaponPiece } from './gearForgeHost'

export type CustomGearLibraryIndexEntry = {
  id: string
  name: string
  lane: 'weapons' | 'armor' | 'artifacts' | 'other'
  genreId: string
  updatedAtMs: number
}

export type CustomGearWeaponRecord = {
  id: string
  name: string
  lane: 'weapons'
  genreId: string
  updatedAtMs: number
  weapon: GearForgeWeaponPiece
}

export type CustomGearLibraryRecord = CustomGearWeaponRecord

const INDEX_KEY = 'pds:customGearIndex'
const RECORD_PREFIX = 'pds:customGear:'

function readIndex(): CustomGearLibraryIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CustomGearLibraryIndexEntry[]) : []
  } catch {
    return []
  }
}

function writeIndex(entries: CustomGearLibraryIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

function recordKey(id: string): string {
  return `${RECORD_PREFIX}${id}`
}

function readRecord(id: string): CustomGearLibraryRecord | null {
  try {
    const raw = localStorage.getItem(recordKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CustomGearLibraryRecord
    if (!parsed || typeof parsed !== 'object' || parsed.lane !== 'weapons') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeRecord(record: CustomGearLibraryRecord): void {
  try {
    localStorage.setItem(recordKey(record.id), JSON.stringify(record))
  } catch {
    /* ignore */
  }
}

function upsertIndexEntry(entry: CustomGearLibraryIndexEntry): void {
  const prev = readIndex().filter((e) => e.id !== entry.id)
  prev.push(entry)
  prev.sort((a, b) => b.updatedAtMs - a.updatedAtMs)
  writeIndex(prev)
}

export function listCustomGearIndex(): CustomGearLibraryIndexEntry[] {
  return readIndex().sort((a, b) => b.updatedAtMs - a.updatedAtMs)
}

export function listCustomGearWeaponIndex(): CustomGearLibraryIndexEntry[] {
  return listCustomGearIndex().filter((e) => e.lane === 'weapons')
}

export function getCustomGearRecord(
  id: string,
): CustomGearLibraryRecord | null {
  return readRecord(id)
}

export function deleteCustomGearRecord(id: string): void {
  try {
    localStorage.removeItem(recordKey(id))
  } catch {
    /* ignore */
  }
  writeIndex(readIndex().filter((e) => e.id !== id))
}

function newLibraryId(): string {
  return `cgear_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function saveCustomGearWeapon(args: {
  id?: string
  genreId: string
  weapon: GearForgeWeaponPiece
}): CustomGearWeaponRecord {
  const id = args.id?.trim() || newLibraryId()
  const name = args.weapon.name.trim() || 'Unnamed weapon'
  const now = Date.now()
  const record: CustomGearWeaponRecord = {
    id,
    name,
    lane: 'weapons',
    genreId: args.genreId,
    updatedAtMs: now,
    weapon: { ...args.weapon, name },
  }
  writeRecord(record)
  upsertIndexEntry({
    id,
    name,
    lane: 'weapons',
    genreId: args.genreId,
    updatedAtMs: now,
  })
  return record
}

/** Inventory-shaped weapon rows for GearForgeShell library host. */
export function listLibraryWeaponsAsInventory(): Weapon[] {
  const out: Weapon[] = []
  for (const entry of listCustomGearWeaponIndex()) {
    const record = readRecord(entry.id)
    if (!record?.weapon) continue
    out.push(libraryWeaponToInventoryWeapon(record))
  }
  return out
}

export function libraryWeaponToInventoryWeapon(
  record: CustomGearWeaponRecord,
): Weapon {
  const w = record.weapon
  return {
    id: record.id,
    itemType: 'weapon',
    name: w.name,
    weightLbs: Math.max(0, w.weightLbs ?? 2),
    category: w.category || 'Misc',
    strikeBonus: Number.isFinite(w.strikeBonus) ? Math.round(w.strikeBonus!) : 0,
    damage: w.damage || '1D6',
    isEquipped: false,
    linkedWpSkillId: w.linkedWpSkillId,
    wpCategory: w.wpCategory,
    payload: w.payload,
    ammoCategory: w.ammoCategory,
    catalogWeaponId: w.catalogWeaponId,
    qualityVariantId: w.qualityVariantId,
    throwable: w.throwable,
    twoHanded: w.twoHanded,
    weaponProficiencyEligible: w.weaponProficiencyEligible,
    weaponSpecificModifiers: w.weaponSpecificModifiers,
    forgeProperties: w.forgeProperties as WeaponForgeProperties | undefined,
    isArtifact: w.isArtifact ?? true,
  }
}

export function inventoryWeaponToLibraryPiece(
  weapon: Weapon,
): GearForgeWeaponPiece {
  return {
    name: weapon.name,
    category: weapon.category,
    damage: weapon.damage,
    strikeBonus: weapon.strikeBonus,
    weightLbs: weapon.weightLbs,
    linkedWpSkillId: weapon.linkedWpSkillId,
    wpCategory: weapon.wpCategory,
    payload: weapon.payload,
    ammoCategory: weapon.ammoCategory,
    catalogWeaponId: weapon.catalogWeaponId,
    qualityVariantId: weapon.qualityVariantId,
    throwable: weapon.throwable,
    twoHanded: weapon.twoHanded,
    weaponProficiencyEligible: weapon.weaponProficiencyEligible,
    weaponSpecificModifiers: weapon.weaponSpecificModifiers,
    forgeProperties: weapon.forgeProperties,
    isArtifact: weapon.isArtifact ?? true,
  }
}
