/**
 * Normalize Morphus / content skill references to catalog ids (`skill_*`).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const skillsDir = join(repoRoot, 'src/data/content/skills')

let catalogIds = null
let bareToCanonical = null

/** Historical bare ids / typos → canonical catalog id (verified against skills/*.json). */
const LEGACY_SKILL_ALIASES = {
  whittling_and_sculpting: 'skill_sculpting_and_whittling',
  technical_writing: 'skill_writing',
  mathematics_basic: 'skill_math_basic',
  mathematics_advanced: 'skill_math_advanced',
  interrogation: 'skill_interrogation_techniques',
  archeology: 'skill_archaeology',
  crime_scene_investigation: 'skill_criminal_sciences_and_forensics',
  tracking: 'skill_tracking',
  skill_build: 'skill_gymnastics',
  skill_hth_basic: 'hth_basic',
  skill_wp_pistol: 'wp_automatic_pistol',
}

function loadSkillCatalogIds() {
  if (catalogIds) return catalogIds
  const ids = new Set()
  const poolFiles = [
    ...readdirSync(skillsDir).filter((name) => name.endsWith('.json')),
    'hand_to_hand.json',
    'weapon_proficiencies.json',
  ]
  for (const name of poolFiles) {
    const rows = JSON.parse(readFileSync(join(skillsDir, name), 'utf8'))
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (typeof row.id === 'string') ids.add(row.id)
    }
  }
  catalogIds = ids
  return ids
}

function buildBareToCanonicalMap() {
  if (bareToCanonical) return bareToCanonical
  const ids = loadSkillCatalogIds()
  const map = new Map()
  for (const id of ids) {
    map.set(id, id)
    if (id.startsWith('skill_')) {
      const bare = id.slice('skill_'.length)
      if (!map.has(bare)) map.set(bare, id)
    }
  }
  bareToCanonical = map
  return map
}

/** @returns {string | null} canonical catalog id, or null when unknown */
export function normalizeSkillCatalogId(value) {
  if (typeof value !== 'string' || !value) return value
  if (LEGACY_SKILL_ALIASES[value]) return LEGACY_SKILL_ALIASES[value]
  const map = buildBareToCanonicalMap()
  if (map.has(value)) return map.get(value)
  const prefixed = value.startsWith('skill_') ? value : `skill_${value}`
  if (map.has(prefixed)) return map.get(prefixed)
  return null
}

export function normalizeSkillCatalogIdOrThrow(value, context = '') {
  const next = normalizeSkillCatalogId(value)
  if (next == null) {
    throw new Error(`Unknown skill id "${value}"${context ? ` (${context})` : ''}`)
  }
  return next
}

function mergeSkillOverride(existing, incoming) {
  if (!existing) return incoming
  const next = { ...existing, ...incoming }
  if (incoming.impossibleInMorphus === true) next.impossibleInMorphus = true
  if (existing.impossibleInMorphus === true) next.impossibleInMorphus = true
  if (incoming.modifierPercent != null && existing.modifierPercent == null) {
    next.modifierPercent = incoming.modifierPercent
  }
  if (incoming.grantUnlearnedValue != null && existing.grantUnlearnedValue == null) {
    next.grantUnlearnedValue = incoming.grantUnlearnedValue
  }
  return next
}

function dedupeSkillOverrides(overrides) {
  if (!Array.isArray(overrides) || overrides.length < 2) return overrides
  const byKey = new Map()
  for (const row of overrides) {
    const key = `${row.targetType ?? 'skill_id'}:${row.targetValue}`
    byKey.set(key, mergeSkillOverride(byKey.get(key), row))
  }
  return [...byKey.values()]
}

/**
 * Walk JSON and normalize skill_id targetValue + skillContextModifiers.skillId.
 * @returns {{ changes: number, unknown: string[] }}
 */
export function normalizeSkillReferencesInJson(doc, options = {}) {
  const { throwOnUnknown = false } = options
  let changes = 0
  const unknown = new Set()

  function noteUnknown(value, context) {
    unknown.add(`${value} (${context})`)
    if (throwOnUnknown) {
      throw new Error(`Unknown skill id "${value}" (${context})`)
    }
  }

  function normalizeField(value, context) {
    const next = normalizeSkillCatalogId(value)
    if (next == null) {
      noteUnknown(value, context)
      return value
    }
    if (next !== value) changes++
    return next
  }

  function walk(node) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (!node || typeof node !== 'object') return

    if (node.targetType === 'skill_id' && typeof node.targetValue === 'string') {
      node.targetValue = normalizeField(node.targetValue, 'skillModifiers.targetValue')
    }
    if (typeof node.skillId === 'string') {
      node.skillId = normalizeField(node.skillId, 'skillId')
    }

    for (const value of Object.values(node)) walk(value)
  }

  walk(doc)

  function walkDedupe(node) {
    if (Array.isArray(node)) {
      for (const item of node) walkDedupe(item)
      return
    }
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node.specificSkillOverrides)) {
      node.specificSkillOverrides = dedupeSkillOverrides(node.specificSkillOverrides)
    }
    for (const value of Object.values(node)) walkDedupe(value)
  }
  walkDedupe(doc)

  fixCategoryMisencodedSkillIds(doc)

  return { changes, unknown: [...unknown] }
}

/** Some rows used skill_id for category slugs (military, wilderness). */
function fixCategoryMisencodedSkillIds(doc) {
  const categorySkillIds = new Set(['military', 'wilderness'])
  function walk(node) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (!node || typeof node !== 'object') return
    if (
      node.targetType === 'skill_id' &&
      typeof node.targetValue === 'string' &&
      categorySkillIds.has(node.targetValue)
    ) {
      node.targetType = 'category'
    }
    for (const value of Object.values(node)) walk(value)
  }
  walk(doc)
}
