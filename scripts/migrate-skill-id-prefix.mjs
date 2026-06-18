/**
 * @deprecated One-time migration for the removed monolithic `palladiumSkills.json`.
 * The live catalog is `src/data/content/skills/*.json`. Do not run on current trees unless restoring legacy data.
 *
 * Prefix all skill ids with `skill_` and update cross-references.
 * Run once: node scripts/migrate-skill-id-prefix.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PREFIX = 'skill_'
const SKILLS_PATH = join(root, 'src/data/content/palladiumSkills.json')

function prefixSkillId(id) {
  if (typeof id !== 'string' || !id) return id
  return id.startsWith(PREFIX) ? id : `${PREFIX}${id}`
}

function buildIdMapFromBareIds(bareIds) {
  const map = new Map()
  for (const bare of bareIds) {
    map.set(bare, prefixSkillId(bare))
  }
  return map
}

function remapString(value, idMap) {
  return idMap.has(value) ? idMap.get(value) : value
}

const SKILL_REF_KEYS = new Set([
  'skillId',
  'replaces',
  'waivesPrerequisiteSkillIds',
])

function migrateValue(key, value, idMap) {
  if (value == null) return value

  if (key === 'skillIds' && Array.isArray(value)) {
    return value.map((s) => (typeof s === 'string' ? remapString(s, idMap) : s))
  }

  if (key === 'startingSkillIds' && Array.isArray(value)) {
    return value.map((s) => (typeof s === 'string' ? remapString(s, idMap) : s))
  }

  if (key === 'grantsSkills' && Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string') return remapString(entry, idMap)
      if (entry && typeof entry === 'object') return migrateObject(entry, idMap)
      return entry
    })
  }

  if (SKILL_REF_KEYS.has(key) && typeof value === 'string') {
    return remapString(value, idMap)
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === 'object' ? migrateObject(item, idMap) : item,
    )
  }

  if (typeof value === 'object') {
    return migrateObject(value, idMap)
  }

  return value
}

function migrateObject(obj, idMap) {
  const out = {}
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'id' && typeof val === 'string' && idMap.has(val)) {
      out[key] = idMap.get(val)
      continue
    }
    out[key] = migrateValue(key, val, idMap)
  }
  return out
}

const skillsBefore = JSON.parse(readFileSync(SKILLS_PATH, 'utf8'))
const bareIds = skillsBefore.map((s) =>
  s.id.startsWith(PREFIX) ? s.id.slice(PREFIX.length) : s.id,
)
const idMap = buildIdMapFromBareIds(bareIds)

const skillsAfter = skillsBefore.map((sk) => migrateObject(sk, idMap))
writeFileSync(SKILLS_PATH, `${JSON.stringify(skillsAfter, null, 2)}\n`, 'utf8')

function migrateJsonFile(relPath) {
  const abs = join(root, relPath)
  const doc = JSON.parse(readFileSync(abs, 'utf8'))
  const migrated = Array.isArray(doc)
    ? doc.map((row) => migrateObject(row, idMap))
    : migrateObject(doc, idMap)
  writeFileSync(abs, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
}

migrateJsonFile('src/data/content/occs/nightbane/between_the_shadows.json')
migrateJsonFile('src/data/content/occs/nightbane/nightbane_core.json')

const examplesDir = join(root, 'src/data/schemas/examples')
for (const name of readdirSync(examplesDir)) {
  if (name.endsWith('.json')) {
    migrateJsonFile(`src/data/schemas/examples/${name}`)
  }
}

console.log(`Migrated ${skillsAfter.length} skills → ids prefixed with "${PREFIX}"`)
