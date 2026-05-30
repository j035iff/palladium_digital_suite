/**
 * Apply schema patches suggested by schema-analysis (best-effort), then re-validate.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  clearMorphusSchemaCache,
  loadMorphusCharacteristicSchema,
  morphusSchemaPathExists,
  normalizeMorphusSchemaPath,
} from './morphus-schema-paths.mjs'
import { schemasDir, repoRoot } from './morphus-ingest-shared.mjs'

const SCHEMA_PATH = join(schemasDir, 'palladium-morphus.schema.json')
const TYPES_PATH = join(repoRoot, 'src/types.ts')

const MECHANICAL_SIGNAL =
  /\b(S\.D\.C\.|P\.P\.E\.|A\.R\.|initiative|per level|melee round|save vs|percentile|Morphus)\b/i

/** Top-level MorphusCharacteristic fields (keep in sync with types.ts). */
const TS_TOP_LEVEL_FIELDS = {
  statModifiers: 'statModifiers?: MorphusStatModifiers',
  naturalAr: 'naturalAr?: number',
  saveModifiers: 'saveModifiers?: MorphusSaveModifiers',
  mobility: 'mobility?: MorphusMobility',
  sensory: 'sensory?: MorphusSensory',
  skillModifiers: 'skillModifiers?: MorphusSkillModifiers',
  damageAffinities: 'damageAffinities?: MorphusDamageAffinities',
  weaponClassBonuses: 'weaponClassBonuses?: MorphusWeaponClassBonuses',
  heightModifier: 'heightModifier?: MorphusPolymorphicModifier',
  weightModifier: 'weightModifier?: MorphusPolymorphicModifier',
  naturalWeapons: 'naturalWeapons?: readonly MorphusNaturalWeapon[]',
  limbDurability: 'limbDurability?: readonly MorphusLimbDurability[]',
  subTraitChoicesBudget: 'subTraitChoicesBudget?: MorphusSubTraitChoicesBudget',
  handCapacityConstraints: 'handCapacityConstraints?: MorphusHandCapacityConstraints',
  companionBlueprint: 'companionBlueprint?: MorphusCompanionBlueprint',
  isPolymorphicTemplate: 'isPolymorphicTemplate?: boolean',
  gimmickInventory: 'gimmickInventory?: readonly MorphusGimmickInventoryItem[]',
  gimmickToySwitches: 'gimmickToySwitches?: MorphusGimmickToySwitchBoard',
  disabledNaturalAttackTags: 'disabledNaturalAttackTags?: readonly MorphusDisabledNaturalAttackTag[]',
  activatedAbilities: 'activatedAbilities?: readonly MorphusActivatedAbility[]',
  specialCombatInterceptions: 'specialCombatInterceptions?: readonly MorphusSpecialCombatInterception[]',
  customOneOffs: 'customOneOffs?: readonly string[]',
  entryRole: "entryRole?: 'trait' | 'table_router' | 'subtable_header'",
  variantPercentiles: 'variantPercentiles?: readonly MorphusVariantPercentile[]',
  independentSubRolls: 'independentSubRolls?: readonly MorphusIndependentSubRoll[]',
  crossTableRoll: 'crossTableRoll?: MorphusCrossTableRoll',
  morphusRules: 'morphusRules?: readonly MorphusEdgeCaseRule[]',
  appearanceConstraints: 'appearanceConstraints?: MorphusAppearanceConstraints',
  combatContextModifiers: 'combatContextModifiers?: readonly MorphusCombatContextModifier[]',
  recoveryBehaviors: 'recoveryBehaviors?: readonly MorphusRecoveryBehavior[]',
  conditionalPenalties: 'conditionalPenalties?: readonly MorphusConditionalPenalty[]',
  atWillAbilities: 'atWillAbilities?: readonly MorphusAtWillAbility[]',
  playerChoices: 'playerChoices?: readonly MorphusPlayerChoice[]',
  tableWorkflow: 'tableWorkflow?: MorphusTableWorkflow',
  livingWeaponRules: 'livingWeaponRules?: MorphusLivingWeaponRules',
  skillContextModifiers: 'skillContextModifiers?: readonly MorphusSkillContextModifier[]',
  disguiseLimits: 'disguiseLimits?: MorphusDisguiseLimits',
}

/** Paths that belong under mobility — never add as top-level characteristic fields. */
const MOBILITY_NESTED_ONLY = new Set([
  'conditionalStanceModifiers',
  'conditionalTerrainModifiers',
  'burrowingEngine',
  'aquaticTraits',
  'flightEngine',
  'jumpModifiers',
])

function resolveRef(root, node) {
  if (!node || typeof node !== 'object') return node
  if (node.$ref) {
    const key = node.$ref.replace('#/$defs/', '')
    return root.$defs?.[key] ?? node
  }
  return node
}

function getDefNode(root, defName) {
  return root.$defs?.[defName]
}

function addPropertyToDef(root, defName, propName, propSchema, description) {
  const def = getDefNode(root, defName)
  if (!def?.properties) return false
  if (propName in def.properties) return false
  def.properties[propName] = {
    ...propSchema,
    description: description ?? propSchema.description ?? `Auto-added for Morphus ingest (${propName}).`,
  }
  return true
}

function addTopLevelProperty(root, propName, propSchema, description) {
  if (propName in (root.properties ?? {})) return false
  root.properties[propName] = {
    ...propSchema,
    description: description ?? propSchema.description ?? `Auto-added for Morphus ingest (${propName}).`,
  }
  return true
}

function appendMorphusCharacteristicTypeField(fieldLine) {
  let typesSrc = readFileSync(TYPES_PATH, 'utf8')
  const marker = 'export type MorphusCharacteristic = {'
  const idx = typesSrc.indexOf(marker)
  if (idx < 0) return false
  const closeIdx = typesSrc.indexOf('\n}', idx)
  if (closeIdx < 0) return false
  const block = typesSrc.slice(idx, closeIdx)
  if (block.includes(fieldLine.split('?')[0])) return false
  typesSrc =
    typesSrc.slice(0, closeIdx) + `\n  ${fieldLine}` + typesSrc.slice(closeIdx)
  writeFileSync(TYPES_PATH, typesSrc, 'utf8')
  return true
}

/**
 * Build patch list from analysis edgeCases.
 * @param {object} analysis
 */
export function buildSchemaPatches(analysis) {
  const patches = []
  for (const edge of analysis.edgeCases ?? []) {
    if (edge.kind === 'missing_schema_path') {
      for (const path of edge.missingPaths ?? []) {
        const parts = path.split('.')
        const top = parts[0]
        if (parts.length === 1) {
          if (MOBILITY_NESTED_ONLY.has(top)) {
            patches.push({
              kind: 'def_property',
              path: `mobility.${top}`,
              defName: 'mobility',
              property: top,
              schema: { type: 'array', items: { type: 'object' } },
              note: edge.note,
            })
          } else {
            patches.push({
              kind: 'top_level',
              path,
              property: top,
              schema: { type: 'string' },
              note: edge.note,
            })
          }
        } else if (parts.length === 2) {
          const defName = top === 'mobility' || top === 'sensory' || top === 'skillModifiers'
            ? top
            : top
          patches.push({
            kind: 'def_property',
            path,
            defName,
            property: parts[1],
            schema: { type: ['string', 'number', 'boolean', 'object', 'array', 'null'] },
            note: edge.note,
          })
        } else {
          patches.push({
            kind: 'manual',
            path,
            note: `Nested path "${path}" needs hand-authored schema in $defs.`,
          })
        }
      }
    }
    if (edge.kind === 'unknown_target_key') {
      const top = edge.key?.split('.')[0]
      if (top) {
        patches.push({
          kind: 'top_level',
          path: top,
          property: top,
          schema: { type: 'string' },
          note: `Target JSON uses unknown key "${edge.key}".`,
        })
      }
    }
  }
  return patches
}

/**
 * @returns {{ applied: object[], manual: object[], schemaChanged: boolean }}
 */
export function applySchemaPatches(patches) {
  const root = loadMorphusCharacteristicSchema()
  const applied = []
  const manual = []

  for (const patch of patches) {
    if (patch.kind === 'manual') {
      manual.push(patch)
      continue
    }
    if (patch.kind === 'top_level') {
      const ok = addTopLevelProperty(root, patch.property, patch.schema, patch.note)
      if (ok) {
        applied.push(patch)
        const tsLine =
          TS_TOP_LEVEL_FIELDS[patch.property] ??
          `${patch.property}?: unknown /* TODO: tighten type */`
        appendMorphusCharacteristicTypeField(tsLine)
      } else if (!morphusSchemaPathExists(normalizeMorphusSchemaPath(patch.path))) {
        manual.push({ ...patch, reason: 'top-level add failed' })
      }
      continue
    }
    if (patch.kind === 'def_property') {
      const ok = addPropertyToDef(root, patch.defName, patch.property, patch.schema, patch.note)
      if (ok) applied.push(patch)
      else if (!morphusSchemaPathExists(patch.path)) {
        manual.push({ ...patch, reason: `$defs/${patch.defName} missing or property blocked` })
      }
    }
  }

  let schemaChanged = false
  if (applied.length > 0) {
    writeFileSync(SCHEMA_PATH, `${JSON.stringify(root, null, 2)}\n`, 'utf8')
    clearMorphusSchemaCache()
    schemaChanged = true
  }
  return { applied, manual, schemaChanged }
}

export function detectUnmatchedMechanicalProse(body) {
  if (!MECHANICAL_SIGNAL.test(body)) return false
  return true
}
