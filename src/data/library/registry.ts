import type { Feature } from '../../types'
import type { LibraryOCC, Race } from './types'
import { POWER_FEATURES, TRAIT_FEATURES } from './features'
import { loadRacesFromJson } from './racesLoader'
import { NIGHTBANE_SORCERER_OCC } from './classes/nightbaneSorcerer'
import { LEGACY_OCCS } from './classes/legacyOccs'
import {
  BORG_XP_TABLE,
  PSYCHIC_XP_TABLE,
  STANDARD_XP_TABLE,
} from '../xpTables'
import type { XPTable } from '../../types'

export const FEATURE_REGISTRY: Feature[] = [...POWER_FEATURES, ...TRAIT_FEATURES]
export const RACE_REGISTRY: Race[] = loadRacesFromJson()
export const OCC_REGISTRY: LibraryOCC[] = [...LEGACY_OCCS, NIGHTBANE_SORCERER_OCC]

const XP_BY_ID: Record<LibraryOCC['xpTableId'], XPTable> = {
  standard: STANDARD_XP_TABLE,
  psychic: PSYCHIC_XP_TABLE,
  borg: BORG_XP_TABLE,
}

export function resolveOccXpTable(def: LibraryOCC): XPTable {
  return XP_BY_ID[def.xpTableId]
}

export function getFeatureById(id: string): Feature | undefined {
  return FEATURE_REGISTRY.find((f) => f.identity.id === id)
}

export function getRaceById(id: string): Race | undefined {
  return RACE_REGISTRY.find((r) => r.id === id)
}

export function getLibraryOccById(id: string): LibraryOCC | undefined {
  return OCC_REGISTRY.find((o) => o.id === id)
}

export type {
  PalladiumSkillCatalogEntry,
  PalladiumSourceRef,
  StandardModernProgressionBundle,
  StandardModernWeaponProgressionDoc,
  WeaponProficiencyCatalogEntry,
} from './catalogTypes'

export {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
  listPalladiumSkillsForGameSystem,
} from './skillsCatalogLoader'

export {
  WEAPON_PROFICIENCY_CATALOG,
  getWeaponProficiencyCatalogEntryById,
  listWeaponProficienciesForGameSystem,
} from './weaponProficienciesCatalogLoader'

export {
  STANDARD_MODERN_WEAPON_PROGRESSION,
  getStandardModernProgressionBundle,
  defaultStandardModernProgressionKey,
} from './standardModernWeaponProgressionLoader'
