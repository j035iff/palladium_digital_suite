/**
 * Structural types for JSON catalogs under `src/data/content/*.json`.
 * Authoring should conform to `src/data/schemas/*.schema.json`.
 */

export type { PalladiumSourceRef } from '../../types'
import type { PalladiumSourceRef } from '../../types'

/** Row from `content/skills/*.json` — see `schemas/palladium-skill.schema.json`. */
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
  /** Legacy catalog id superseded by this row. */
  replaces?: string
  allowedAsSecondarySkill?: boolean
  requiresSpecialization?: boolean
  specialization?: {
    kind: string
    prompt: string
    examples?: readonly string[]
    allowsMultipleInstances?: boolean
    notes?: string
  }
  repeatSelection?: {
    summary: string
    trackScope?: 'skill' | 'specialization_instance'
    ranks?: readonly {
      selectionNumber: number
      label?: string
      effect: string
      skillPercentBonus?: number
    }[]
    categoryTrackInteraction?: { mode: string; summary?: string }
  }
  categoryMechanicsInheritance?: {
    repeatSelection?: { mode: string; summary?: string }
  }
  /** Cross-cutting tags for Morphus / penalties (`skill_trait_registry.json`). */
  skillTraits?: readonly string[]
}

/** Row from `content/occs/<genre>/*.json` — see `schemas/palladium-occ.schema.json`. */
export type PalladiumOccCatalogEntry = import('../../types').PalladiumOcc

/** Row from `content/skills/hand_to_hand.json` — see `schemas/palladium-hth.schema.json`. */
export type PalladiumHandToHandCatalogEntry = import('../../types').HandToHandSkill

/** Row from `content/talents/*.json` — see `schemas/palladium-talent.schema.json`. */
export type PalladiumTalentCatalogEntry = import('../../types').PalladiumTalent

/** Row from `content/magic/<school>.json` — see `schemas/palladium-magic.schema.json`. */
export type PalladiumMagicCatalogEntry = import('../../types').PalladiumMagicSpell

/** Row from `content/psionics/<category>.json` — see `schemas/palladium-psionic.schema.json`. */
export type PalladiumPsionicCatalogEntry = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  gameSystems: readonly string[]
  sources: readonly PalladiumSourceRef[]
  genrePlacements: readonly {
    genreId: string
    category: string
    isp?: unknown
    notes?: string
  }[]
  innateStarter?: boolean
  resolutionTable?: unknown
  permanentCosts?: readonly unknown[]
  spawnedPresence?: Record<string, unknown>
  formTransformation?: Record<string, unknown>
  /** @deprecated Prefer `spawnedPresence` with `kind: construct`. */
  summonedEntity?: Record<string, unknown>
  [key: string]: unknown
}

/** Row from `skills/weapon_proficiencies.json` (ancient or modern W.P.). */
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

/** Document from `skills/utils/standard_modern_weapon_progression.json`. */
export type StandardModernWeaponProgressionDoc = {
  version?: number
  bundles: Readonly<Record<string, StandardModernProgressionBundle>>
}
