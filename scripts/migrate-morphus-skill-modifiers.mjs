/**
 * Normalize Morphus skillModifiers across catalog tables:
 * - isNegated (no %) → impossibleInMorphus
 * - Merge skill_trait / impossible from description via morphus-skill-modifier-parse
 * - Drop skill_id rows subsumed by matching skill_trait + modifierPercent
 *
 * Usage: node scripts/migrate-morphus-skill-modifiers.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseTraitAndImpossibleSkillModifiers,
  SKILL_TRAIT_DEXTERITY,
  SKILL_TRAIT_LIGHT_TOUCH,
} from './lib/morphus-skill-modifier-parse.mjs'
import {
  loadSkillNameIndex,
  structureFromTraitBody,
} from './lib/morphus-transcribe-structure.mjs'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const tablesDir = join(root, 'src/data/content/morphus/tables')
const skillsPath = join(root, 'src/data/content/palladiumSkills.json')
const dryRun = process.argv.includes('--dry-run')

const skills = JSON.parse(readFileSync(skillsPath, 'utf8'))
const skillTraitsById = new Map(skills.map((s) => [s.id, new Set(s.skillTraits ?? [])]))

const dexIds = new Set(
  skills.filter((s) => s.skillTraits?.includes(SKILL_TRAIT_DEXTERITY)).map((s) => s.id),
)
const lightIds = new Set(
  skills.filter((s) => s.skillTraits?.includes(SKILL_TRAIT_LIGHT_TOUCH)).map((s) => s.id),
)

const findSkillId = (phrase) => loadSkillNameIndex().get(normalizeSkillName(phrase)) ?? null

function normalizeSkillName(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function overrideKey(o) {
  return `${o.targetType}:${o.targetValue}`
}

function migrateOverride(o) {
  const next = { ...o }
  if (
    next.isNegated === true &&
    next.modifierPercent == null &&
    next.grantUnlearnedValue == null
  ) {
    next.impossibleInMorphus = true
    delete next.isNegated
  }
  return next
}

function dedupeOverrides(list) {
  const seen = new Map()
  for (const o of list) {
    const k = overrideKey(o)
    const prev = seen.get(k)
    if (!prev) {
      seen.set(k, { ...o })
      continue
    }
    seen.set(k, {
      ...prev,
      ...o,
      modifierPercent: o.modifierPercent ?? prev.modifierPercent,
      impossibleInMorphus: o.impossibleInMorphus || prev.impossibleInMorphus,
      grantUnlearnedValue: o.grantUnlearnedValue ?? prev.grantUnlearnedValue,
      perLevelIncrement: o.perLevelIncrement ?? prev.perLevelIncrement,
    })
  }
  return [...seen.values()]
}

/** Remove skill_id % rows covered by an identical skill_trait row. */
function dropSubsumedSkillIds(overrides) {
  const traitPct = new Map()
  for (const o of overrides) {
    if (o.targetType === 'skill_trait' && typeof o.modifierPercent === 'number') {
      traitPct.set(o.targetValue, o.modifierPercent)
    }
  }
  return overrides.filter((o) => {
    if (o.targetType !== 'skill_id' || o.impossibleInMorphus) return true
    if (typeof o.modifierPercent !== 'number') return true
    const traits = skillTraitsById.get(o.targetValue)
    if (!traits) return true
    for (const traitId of traits) {
      if (traitPct.get(traitId) === o.modifierPercent) return false
    }
    return true
  })
}

/** If most dex/light skills share one %, replace cluster with skill_trait. */
function consolidateTraitClusters(overrides) {
  const skillRows = overrides.filter(
    (o) => o.targetType === 'skill_id' && typeof o.modifierPercent === 'number',
  )
  const byPct = new Map()
  for (const o of skillRows) {
    const k = o.modifierPercent
    if (!byPct.has(k)) byPct.set(k, [])
    byPct.get(k).push(o.targetValue)
  }

  const dropIds = new Set()
  const add = []

  for (const [pct, ids] of byPct) {
    const dexHits = ids.filter((id) => dexIds.has(id))
    const lightHits = ids.filter((id) => lightIds.has(id))
    if (dexHits.length >= 5 && dexHits.length === ids.length) {
      add.push({
        targetType: 'skill_trait',
        targetValue: SKILL_TRAIT_DEXTERITY,
        modifierPercent: pct,
      })
      dexHits.forEach((id) => dropIds.add(id))
    }
    if (lightHits.length >= 3 && lightHits.length === ids.length) {
      add.push({
        targetType: 'skill_trait',
        targetValue: SKILL_TRAIT_LIGHT_TOUCH,
        modifierPercent: pct,
      })
      lightHits.forEach((id) => dropIds.add(id))
    }
  }

  const kept = overrides.filter(
    (o) => !(o.targetType === 'skill_id' && dropIds.has(o.targetValue)),
  )
  return dedupeOverrides([...kept, ...add])
}

function parseDescriptionSkillModifiers(description, entryName) {
  if (!description || description.length > 8000) return []
  if (/New Common Talents/i.test(description)) return []
  const structured = structureFromTraitBody(description, { entryName })
  return (structured.skillModifiers?.specificSkillOverrides ?? []).filter(
    (o) => !(o.grantUnlearnedValue != null && o.targetValue === 'skill_disguise' && o.modifierPercent === 15),
  )
}

function stripFalseDisguiseGrants(overrides) {
  return overrides.filter(
    (o) =>
      !(
        o.targetType === 'skill_id' &&
        o.targetValue === 'skill_disguise' &&
        o.grantUnlearnedValue != null &&
        o.modifierPercent === 15
      ),
  )
}

function migrateEntrySkillModifiers(entry) {
  const existing = entry.skillModifiers?.specificSkillOverrides ?? []
  let overrides = stripFalseDisguiseGrants(existing.map(migrateOverride))

  if (entry.description && !/TODO: transcribe/i.test(entry.description)) {
    const fromDesc = [
      ...parseTraitAndImpossibleSkillModifiers(entry.description, findSkillId),
      ...parseDescriptionSkillModifiers(entry.description, entry.name),
    ].map(migrateOverride)
    overrides = dedupeOverrides([...overrides, ...fromDesc])
  }

  overrides = dropSubsumedSkillIds(overrides)
  overrides = consolidateTraitClusters(overrides)
  overrides = dedupeOverrides(overrides)

  if (!overrides.length && entry.skillModifiers?.globalSkillModifier == null) {
    if (entry.skillModifiers) delete entry.skillModifiers
    return { changed: existing.length > 0 }
  }

  const globalSkillModifier = entry.skillModifiers?.globalSkillModifier
  const customSystemRolls = entry.skillModifiers?.customSystemRolls
  entry.skillModifiers = {
    ...(globalSkillModifier != null ? { globalSkillModifier } : {}),
    ...(customSystemRolls?.length ? { customSystemRolls } : {}),
    specificSkillOverrides: overrides,
  }
  if (Object.keys(entry.skillModifiers).length === 0) delete entry.skillModifiers

  const before = JSON.stringify(existing)
  const after = JSON.stringify(overrides)
  return { changed: before !== after }
}

function hasTraitData(table) {
  if (!Array.isArray(table.entries) || table.entries.length === 0) return false
  return table.entries.some(
    (e) =>
      e.description?.length > 80 ||
      e.statModifiers ||
      e.skillModifiers ||
      e.naturalWeapons?.length,
  )
}

const files = readdirSync(tablesDir).filter((f) => f.endsWith('.json'))
let filesTouched = 0
let entriesTouched = 0

for (const file of files.sort()) {
  const path = join(tablesDir, file)
  const table = JSON.parse(readFileSync(path, 'utf8'))
  if (!hasTraitData(table)) continue

  let fileChanged = false
  for (const entry of table.entries) {
    const { changed } = migrateEntrySkillModifiers(entry)
    if (changed) {
      entriesTouched++
      fileChanged = true
    }
  }

  if (fileChanged) {
    filesTouched++
    console.log(`${dryRun ? '[dry-run] would update' : 'updated'} ${file} (${table.entries.length} entries)`)
    if (!dryRun) {
      writeFileSync(path, `${JSON.stringify(table, null, 2)}\n`, 'utf8')
    }
  }
}

console.log(
  `${dryRun ? 'Dry run:' : 'Done:'} ${filesTouched} file(s), ${entriesTouched} entr(ies) with skill modifier changes.`,
)
