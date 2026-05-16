/**
 * Structural types for JSON catalogs under `src/data/library/*.json`.
 * Authoring should conform to `schemas/palladium-skill.schema.json` and related schemas.
 */

export type PalladiumSourceRef = {
  gameSystem: string
  reference: string
  pageNumber: number
}

/** Row from `palladiumSkills.json` — see `schemas/palladium-skill.schema.json`. */
export type PalladiumSkillCatalogEntry = {
  id: string
  name: string
  gameSystems: readonly string[]
  categories: readonly string[]
  synergies: readonly unknown[]
  prerequisites: readonly unknown[]
  description: string
  sources?: readonly PalladiumSourceRef[]
  basePercent?: number
  percentPerLevel?: number
  replaces?: string
  allowedAsSecondarySkill?: boolean
  requiresSpecialization?: boolean
}

/** Row from `weapon_proficiencies.json` (ancient or modern W.P.). */
export type WeaponProficiencyCatalogEntry = {
  kind: 'weapon_proficiency'
  weaponProficiencyCategory: 'ancient' | 'modern'
  id: string
  name: string
  gameSystems: readonly string[]
  categories: readonly string[]
  description: string
  sources: readonly PalladiumSourceRef[]
  stackingRule?: string
  levelTiers?: readonly unknown[]
  pairedWeapons?: unknown
  usesStandardModernProgression?: boolean
  standardModernProgressionKey?: string
  aimedStrikeBonus?: number
  burstStrikeBonus?: number
  skillPercentage?: unknown
  specialManeuvers?: readonly unknown[]
  failureResults?: string
}

export type StandardModernProgressionBundle = {
  gameSystems?: readonly string[]
  stackingRule: string
  levelTiers: readonly unknown[]
  skillPercentage: unknown
  untrainedPenalties: string
  weaponTypeOverrides?: Readonly<Record<string, unknown>>
  combatNotes?: string
  systemConstraints?: string
  notes?: string
}

/** Document from `standard_modern_weapon_progression.json`. */
export type StandardModernWeaponProgressionDoc = {
  version?: number
  bundles: Readonly<Record<string, StandardModernProgressionBundle>>
}
