import type { WeaponProficiencyCatalogEntry } from './catalogTypes'
import weaponProficienciesData from '../content/weapon_proficiencies.json'

const rows = weaponProficienciesData as unknown

function loadWeaponProficiencies(): readonly WeaponProficiencyCatalogEntry[] {
  return Array.isArray(rows) ? (rows as WeaponProficiencyCatalogEntry[]) : []
}

export const WEAPON_PROFICIENCY_CATALOG: readonly WeaponProficiencyCatalogEntry[] =
  loadWeaponProficiencies()

export function getWeaponProficiencyCatalogEntryById(
  id: string,
): WeaponProficiencyCatalogEntry | undefined {
  return WEAPON_PROFICIENCY_CATALOG.find((w) => w.id === id)
}

export function listWeaponProficienciesForGameSystem(
  gameSystem: string,
): readonly WeaponProficiencyCatalogEntry[] {
  const g = gameSystem.toLowerCase()
  return WEAPON_PROFICIENCY_CATALOG.filter((w) =>
    w.gameSystems.some((x) => x.toLowerCase() === g),
  )
}
