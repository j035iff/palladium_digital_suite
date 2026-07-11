import type { Feature } from '../../types'
import type { PalladiumOcc, Race } from '../../types'
import { POWER_FEATURES } from './features'
import { MAGIC_FEATURES } from './magicCatalogLoader'
import { PSIONIC_FEATURES } from './psionicCatalogLoader'
import { TALENT_FEATURES } from './talentCatalogLoader'
import { loadRacesFromJson } from './racesLoader'
import { getPalladiumRaceById } from './raceCatalogLoader'
import type { XPTable } from '../../types'
import { occXpTableId } from '../../lib/occCatalogEngine'
import {
  getXpTableById,
  toXpTable,
} from './progression/xpTableCatalogLoader'
import {
  PALLADIUM_OCC_CATALOG,
  getPalladiumOccById,
} from './occCatalogLoader'

export const FEATURE_REGISTRY: Feature[] = [
  ...POWER_FEATURES,
  ...MAGIC_FEATURES,
  ...PSIONIC_FEATURES,
  ...TALENT_FEATURES,
]
export const RACE_REGISTRY: Race[] = loadRacesFromJson()
export const OCC_REGISTRY: readonly PalladiumOcc[] = PALLADIUM_OCC_CATALOG

export function resolveOccXpTable(def: PalladiumOcc, race?: Race): XPTable {
  const id = occXpTableId(def, race)
  const row = getXpTableById(id)
  if (!row) {
    const fallback = getXpTableById('nightbane_core_doppleganger')
    if (!fallback) {
      throw new Error(`Unknown XP table "${id}" and nightbane_core_doppleganger is missing from catalog`)
    }
    return toXpTable(fallback)
  }
  return toXpTable(row)
}

export function getOccXpTableDisplayName(def: PalladiumOcc, race?: Race): string {
  const row = getXpTableById(occXpTableId(def, race))
  return row?.name ?? occXpTableId(def, race)
}

export function getFeatureById(id: string): Feature | undefined {
  return FEATURE_REGISTRY.find((f) => f.identity.id === id)
}

export function getRaceById(id: string, genreId?: string): Race | undefined {
  return getPalladiumRaceById(id, genreId)
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
  PALLADIUM_MAGIC_CATALOG,
  MAGIC_FEATURES,
  formatMagicPpeCost,
  getMagicFeatureById,
  getPalladiumMagicSpellById,
  listMagicSchoolIdsForGameSystem,
  listPalladiumMagicByMaxLevel,
  listPalladiumMagicForGameSystem,
  listPalladiumMagicForSchool,
  palladiumMagicToFeature,
} from './magicCatalogLoader'

export {
  PALLADIUM_PSIONIC_CATALOG,
  PSIONIC_FEATURES,
  formatPsionicIspCost,
  getPalladiumPsionicById,
  getPsionicFeatureById,
  getPsionicPlacementForGenre,
  listPalladiumPsionicsForGenre,
  listPalladiumPsionicsForGenreCategory,
  listPsionicCategoryIdsForGenre,
  palladiumPsionicToFeature,
} from './psionicCatalogLoader'

export {
  PALLADIUM_RACE_CATALOG,
  getPalladiumRaceById,
  listPalladiumRacesForGenre,
  type CatalogRace,
} from './raceCatalogLoader'

export {
  listRacesForCharacterCreation,
  listNpcRaces,
  listGmApprovalRaces,
  listCreatureRaces,
  raceAllowedInCharacterCreation,
  type RaceAudience,
  raceCatalogGenreId,
} from '../../lib/raceCatalog'

export {
  MORPHUS_TABLE_CATALOG,
  getMorphusTableById,
  getMorphusCharacteristicById,
  resolveMorphusCharacteristicsByIds,
  listMorphusTableIds,
  listMorphusCategoryHubs,
  listMorphusTraitTables,
  listMorphusChildTables,
} from './morphusTableCatalogLoader'
