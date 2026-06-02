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
  parseExtendedSkillModifierProse,
  parseContextualMorphusFields,
  ALL_SKILL_TRAIT_IDS,
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

const traitMemberIds = new Map(
  ALL_SKILL_TRAIT_IDS.map((traitId) => [
    traitId,
    new Set(skills.filter((s) => s.skillTraits?.includes(traitId)).map((s) => s.id)),
  ]),
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
  if (next.targetType === 'category' && typeof next.targetValue === 'string') {
    next.targetValue = next.targetValue.toLowerCase()
  }
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
  return [...seen.values()].map((o) => {
    if (!o.impossibleInMorphus) return o
    const next = { ...o }
    delete next.modifierPercent
    delete next.grantUnlearnedValue
    delete next.perLevelIncrement
    return next
  })
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
    for (const traitId of ALL_SKILL_TRAIT_IDS) {
      const members = traitMemberIds.get(traitId)
      if (!members?.size) continue
      const hits = ids.filter((id) => members.has(id))
      const minHits = Math.min(3, members.size)
      if (hits.length >= minHits && hits.length === ids.length) {
        add.push({
          targetType: 'skill_trait',
          targetValue: traitId,
          modifierPercent: pct,
        })
        hits.forEach((id) => dropIds.add(id))
        break
      }
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

/** Drop global impossible flags when prose only forbids the skill conditionally. */
function pruneConditionalImpossibleOverrides(overrides, prose, findSkillIdFn) {
  if (!prose) return overrides
  const conditionalIds = new Set()
  for (const m of prose.matchAll(
    /\b([A-Za-z][A-Za-z /]+?)\s+is\s+impossible\s+(?:while|when|unless)\b/gi,
  )) {
    const id = findSkillIdFn(m[1].trim())
    if (id) conditionalIds.add(id)
  }
  if (!conditionalIds.size) return overrides
  return overrides.filter(
    (o) =>
      !(
        o.targetType === 'skill_id' &&
        o.impossibleInMorphus &&
        conditionalIds.has(o.targetValue)
      ),
  )
}

function entryProseForSkillParse(entry) {
  const chunks = []
  if (entry.description && !/TODO: transcribe/i.test(entry.description)) {
    chunks.push(entry.description)
  }
  if (Array.isArray(entry.customOneOffs)) {
    for (const line of entry.customOneOffs) {
      chunks.push(String(line).replace(/\[cite:\s*\d+\]/gi, '').trim())
    }
  }
  return chunks.filter(Boolean).join(' ')
}

export function migrateEntrySkillModifiers(entry) {
  const existing = entry.skillModifiers?.specificSkillOverrides ?? []
  const existingGlobal = entry.skillModifiers?.globalSkillModifier
  const existingContext = JSON.stringify(entry.skillContextModifiers ?? [])
  const existingChoices = JSON.stringify(entry.playerChoices ?? [])
  let overrides = stripFalseDisguiseGrants(existing.map(migrateOverride))

  const prose = entryProseForSkillParse(entry)
  let globalFromProse = undefined
  let contextual = {}
  if (prose) {
    const extended = parseExtendedSkillModifierProse(prose, findSkillId)
    globalFromProse = extended.globalSkillModifier
    contextual = parseContextualMorphusFields(prose)
    const fromProse = [
      ...parseTraitAndImpossibleSkillModifiers(prose, findSkillId),
      ...parseDescriptionSkillModifiers(prose, entry.name),
      ...extended.specificSkillOverrides,
    ].map(migrateOverride)
    overrides = dedupeOverrides([...overrides, ...fromProse])
  }

  overrides = dropSubsumedSkillIds(overrides)
  overrides = consolidateTraitClusters(overrides)
  overrides = dedupeOverrides(overrides)
  overrides = pruneConditionalImpossibleOverrides(overrides, prose, findSkillId)

  const nextGlobal = globalFromProse ?? existingGlobal
  if (!overrides.length && nextGlobal == null) {
    if (entry.skillModifiers) delete entry.skillModifiers
  } else {
    const customSystemRolls = entry.skillModifiers?.customSystemRolls
    entry.skillModifiers = {
      ...(nextGlobal != null ? { globalSkillModifier: nextGlobal } : {}),
      ...(customSystemRolls?.length ? { customSystemRolls } : {}),
      ...(overrides.length ? { specificSkillOverrides: overrides } : {}),
    }
    if (Object.keys(entry.skillModifiers).length === 0) delete entry.skillModifiers
  }

  if (contextual.skillContextModifiers?.length) {
    const merged = [...(entry.skillContextModifiers ?? [])]
    for (const row of contextual.skillContextModifiers) {
      const key = `${row.skillId}:${row.context}`
      if (!merged.some((m) => `${m.skillId}:${m.context}` === key)) merged.push(row)
    }
    entry.skillContextModifiers = merged
  }
  if (contextual.playerChoices?.length && !entry.playerChoices?.length) {
    entry.playerChoices = contextual.playerChoices
  }

  const changed =
    JSON.stringify(existing) !== JSON.stringify(entry.skillModifiers?.specificSkillOverrides ?? []) ||
    existingGlobal !== entry.skillModifiers?.globalSkillModifier ||
    existingContext !== JSON.stringify(entry.skillContextModifiers ?? []) ||
    existingChoices !== JSON.stringify(entry.playerChoices ?? [])
  return { changed }
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

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') ===
    process.argv[1].replace(/\\/g, '/')

if (!isMain) {
  // Imported by disproportion-structure-subtables.mjs — skip batch file loop.
} else {
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
}
