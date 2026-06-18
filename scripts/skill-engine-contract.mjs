/**
 * Skill catalog ↔ engine contract (genre-agnostic; single source for audit + ingest).
 *
 * Pass A — Catalog / chargen: creation picker, prerequisites, base %, sources, categories.
 * Pass B — Mechanical depth: physical bonuses, sub-tasks, combat, advanced roll rules.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { primarySkillCategory, skillCategoryFileName } from './lib/skills-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Identity + catalog keys always allowed on a skill row. */
export const SKILL_IDENTITY_KEYS = [
  '$schema',
  'id',
  'name',
  'description',
  'gameSystems',
  'categories',
  'sources',
  'replaces',
]

/** Pass A — catalog / chargen (not all required on every row for audit *complete*). */
export const SKILL_PASS_A_KEYS = [
  'synergies',
  'prerequisites',
  'allowedAsSecondarySkill',
  'skillTraits',
  'requiresSpecialization',
  'specialization',
  'repeatSelection',
  'categoryMechanicsInheritance',
  'basePercent',
  'percentPerLevel',
  'splitPercentPerLevel',
  'occProgressionOverrides',
  'initializationBonuses',
  'interdependentKnowledge',
  'narrativeAdvantages',
  'unquantifiedMechanics',
  'acquisitionEffects',
  'requirements',
]

/** Pass B — mechanical depth (optional at ingest). */
export const SKILL_PASS_B_KEYS = [
  'physicalSkillBonuses',
  'combatToolBonuses',
  'naturalRollOutcomes',
  'specialAttacks',
  'subTasks',
  'subSkills',
  'mechanicProgressions',
  'performanceFormulas',
  'physicalConstraints',
  'situationalModifiers',
  'sequentialChecks',
  'situationalRuleOverrides',
  'resolutionLogic',
  'skillPercentAttributeModifiers',
  'externalMechanicsBonuses',
  'conditionalRelatedSkills',
  'grantsSkills',
  'prerequisiteBypassConditions',
  'failureResults',
  'successOutcomes',
  'failureFormulas',
  'categoryAccessLockouts',
  'optionalStandaloneStatus',
]

export const SCHEMA_TOP_LEVEL_KEYS = new Set([
  ...SKILL_IDENTITY_KEYS,
  ...SKILL_PASS_A_KEYS,
  ...SKILL_PASS_B_KEYS,
])

export const SKILL_ENGINE_CONTRACT = {
  passA: {
    purpose: 'Catalog / chargen — picker, gates, %, sources, categories (any genre)',
    consumers: [
      'skillsCatalogLoader',
      'creationSkillCatalog',
      'skillPercentResolution',
      'creationSkillPicks',
    ],
    completeRowRequires: {
      identity: ['id', 'name', 'description'],
      gameSystems: 'array (may be empty for generic Megaversal core)',
      categories: '≥1; categories[0] determines category JSON file',
      synergies: 'array (use [] if none)',
      prerequisites: 'array (use [] if none)',
      sources: '≥1 entry with reference + pageNumber',
      progression:
        'percentile base, subTasks/subSkills %, physical-only training, or documented synergy-only skill',
    },
  },
  passB: {
    purpose: 'Mechanical depth — ledger, spawn handoff, play-time consumers',
    consumers: [
      'creationLiveLedger',
      'spawnSheetHandoff',
      'skillPhysicalBonuses',
    ],
    keys: SKILL_PASS_B_KEYS,
  },
}

/** Legacy ids accepted when resolving prerequisite references. */
export const LEGACY_SKILL_ID_ALIASES = {
  skill_mathematics_basic: 'skill_math_basic',
  skill_mathematics_advanced: 'skill_math_advanced',
}

export function skillHasValidSources(skill) {
  return (skill.sources ?? []).some(
    (s) =>
      typeof s?.reference === 'string' &&
      s.reference.trim().length > 0 &&
      typeof s.pageNumber === 'number',
  )
}

export function hasPercentileProgression(skill) {
  const base = skill.basePercent
  if (typeof base === 'number') return true
  if (base && typeof base === 'object') {
    if (base.splitBase || base.splitBaseTracks) return true
    if (Object.keys(base).length > 0 && !('splitBase' in base) && !('splitBaseTracks' in base)) {
      return true
    }
  }
  if (Array.isArray(skill.subTasks) && skill.subTasks.some((t) => t?.basePercent != null)) {
    return true
  }
  if (Array.isArray(skill.subSkills) && skill.subSkills.some((t) => t?.basePercent != null)) {
    return true
  }
  return false
}

/** Book skills with no self % but outward synergies (e.g. Hunting). */
export function isDocumentedSynergyOnlySkill(skill) {
  if (hasPercentileProgression(skill)) return false
  if (!(skill.synergies?.length > 0)) return false
  return /no base percent/i.test(skill.description ?? '')
}

export function hasPhysicalTrainingProgression(skill) {
  if (hasPercentileProgression(skill) || isDocumentedSynergyOnlySkill(skill)) {
    return false
  }
  return (
    skill.physicalSkillBonuses != null ||
    (skill.naturalRollOutcomes?.length ?? 0) > 0 ||
    (skill.mechanicProgressions?.length ?? 0) > 0
  )
}

export function hasCatalogProgression(skill) {
  return (
    hasPercentileProgression(skill) ||
    isDocumentedSynergyOnlySkill(skill) ||
    hasPhysicalTrainingProgression(skill)
  )
}

/** True when row satisfies Pass A catalog contract. Genre-agnostic. */
export function isPassACatalogComplete(skill) {
  return (
    Boolean(skill.id?.startsWith('skill_') && skill.name && skill.description) &&
    Array.isArray(skill.gameSystems) &&
    Array.isArray(skill.categories) &&
    skill.categories.length > 0 &&
    Array.isArray(skill.synergies) &&
    Array.isArray(skill.prerequisites) &&
    skillHasValidSources(skill) &&
    hasCatalogProgression(skill)
  )
}

export function listSchemaDriftKeys(skill) {
  return Object.keys(skill).filter((k) => !SCHEMA_TOP_LEVEL_KEYS.has(k))
}

export function listPassBKeysPresent(skill) {
  return SKILL_PASS_B_KEYS.filter((k) => skill[k] != null)
}

export function expectedCategoryFile(skill) {
  return skillCategoryFileName(primarySkillCategory(skill))
}

/** Collect skill ids referenced in prerequisites (recursive). */
export function collectPrerequisiteSkillIds(prerequisites) {
  const ids = []
  if (!Array.isArray(prerequisites)) return ids

  function walk(entry) {
    if (!entry || typeof entry !== 'object') return
    const type = entry.type
    if (type === 'skill' && entry.skillId) {
      ids.push(entry.skillId)
    }
    if (type === 'skill_any_of') {
      for (const sid of entry.skillIds ?? []) ids.push(sid)
      for (const alt of entry.alternatives ?? []) {
        if (alt?.skillId) ids.push(alt.skillId)
      }
    }
    if (type === 'logical_group' && Array.isArray(entry.items)) {
      for (const child of entry.items) walk(child)
    }
  }

  for (const row of prerequisites) walk(row)
  return ids
}

export function collectSynergySkillIds(skill) {
  return (skill.synergies ?? [])
    .map((s) => s?.skillId)
    .filter((id) => typeof id === 'string' && id.length > 0)
}

export function collectGrantSkillIds(skill) {
  return (skill.grantsSkills ?? [])
    .map((g) => g?.skillId)
    .filter((id) => typeof id === 'string' && id.length > 0)
}

export function resolveCatalogSkillId(id, catalogIds) {
  if (catalogIds.has(id)) return id
  const normalized = id.startsWith('skill_') ? id : `skill_${id}`
  if (catalogIds.has(normalized)) return normalized
  const alias = LEGACY_SKILL_ID_ALIASES[normalized] ?? LEGACY_SKILL_ID_ALIASES[id]
  if (alias && catalogIds.has(alias)) return alias
  return null
}

export function loadSkillTraitRegistryIds() {
  const doc = JSON.parse(
    readFileSync(join(root, 'src/data/content/skill_trait_registry.json'), 'utf8'),
  )
  return new Set((doc.traits ?? []).map((t) => t.id))
}

export function loadSchemaPropertyKeys() {
  const schema = JSON.parse(
    readFileSync(join(root, 'src/data/schemas/palladium-skill.schema.json'), 'utf8'),
  )
  return new Set(Object.keys(schema.properties ?? {}))
}
