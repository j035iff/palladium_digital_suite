import type { Feature } from '../../types'
import type { PalladiumOcc, Race } from '../../types'
import { POWER_FEATURES } from './features'
import { TALENT_FEATURES } from './talentCatalogLoader'
import { loadRacesFromJson } from './racesLoader'
import {
  BORG_XP_TABLE,
  PSYCHIC_XP_TABLE,
  STANDARD_XP_TABLE,
} from '../xpTables'
import type { XPTable } from '../../types'
import { occXpTableId } from '../../lib/occCatalogEngine'
import {
  PALLADIUM_OCC_CATALOG,
  getPalladiumOccById,
} from './occCatalogLoader'

export const FEATURE_REGISTRY: Feature[] = [...POWER_FEATURES, ...TALENT_FEATURES]
export const RACE_REGISTRY: Race[] = loadRacesFromJson()
export const OCC_REGISTRY: readonly PalladiumOcc[] = PALLADIUM_OCC_CATALOG

const XP_BY_ID: Record<'standard' | 'psychic' | 'borg', XPTable> = {
  standard: STANDARD_XP_TABLE,
  psychic: PSYCHIC_XP_TABLE,
  borg: BORG_XP_TABLE,
}

export function resolveOccXpTable(def: PalladiumOcc): XPTable {
  return XP_BY_ID[occXpTableId(def)]
}

export function getFeatureById(id: string): Feature | undefined {
  return FEATURE_REGISTRY.find((f) => f.identity.id === id)
}

export function getRaceById(id: string): Race | undefined {
  return RACE_REGISTRY.find((r) => r.id === id)
}

export function getLibraryOccById(id: string): PalladiumOcc | undefined {
  return getPalladiumOccById(id)
}

export type {
  PalladiumHandToHandCatalogEntry,
  PalladiumSkillCatalogEntry,
  PalladiumSourceRef,
  StandardModernProgressionBundle,
  StandardModernWeaponProgressionDoc,
  WeaponProficiencyCatalogEntry,
} from './catalogTypes'

export {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
  normalizeCatalogSkillId,
  listPalladiumSkillsForGameSystem,
} from './skillsCatalogLoader'

export {
  PALLADIUM_OCC_CATALOG,
  getPalladiumOccById,
  listPalladiumOccsByType,
  listPalladiumOccsForGameSystem,
} from './occCatalogLoader'

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

export {
  SKILL_TRAIT_REGISTRY,
  getSkillTraitDefinition,
  isKnownSkillTraitId,
  getSkillTraitIds,
  skillHasTrait,
  type SkillTraitDefinition,
} from './skillTraitRegistryLoader'

export {
  HAND_TO_HAND_CATALOG,
  getHandToHandSkillById,
  listHandToHandSkillIds,
  listHandToHandSkillsForGameSystem,
} from './handToHandCatalogLoader'

export {
  PALLADIUM_TALENT_CATALOG,
  TALENT_FEATURES,
  getPalladiumTalentById,
  getTalentFeatureById,
  listPalladiumTalentsForGameSystem,
  palladiumTalentToFeature,
} from './talentCatalogLoader'

export {
  MORPHUS_TABLE_CATALOG,
  getMorphusTableById,
  getMorphusCharacteristicById,
  resolveMorphusCharacteristicsByIds,
  listMorphusTableIds,
  listMorphusCategoryHubs,
  listMorphusTraitTables,
} from './morphusTableCatalogLoader'
