/**
 * Prefix skill reference strings (skillId, skillIds, …) that were missed by catalog-only id migration.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PREFIX = 'skill_'

const REF_KEYS = new Set([
  'skillId',
  'replaces',
  'waivesPrerequisiteSkillIds',
])

function prefixRef(value) {
  if (typeof value !== 'string' || !value) return value
  if (value.startsWith(PREFIX)) return value
  if (!/^[a-z][a-z0-9_]*$/.test(value)) return value
  return `${PREFIX}${value}`
}

function migrateValue(key, value) {
  if (value == null) return value
  if (REF_KEYS.has(key) && typeof value === 'string') return prefixRef(value)
  if (key === 'skillIds' && Array.isArray(value)) {
    return value.map((s) => (typeof s === 'string' ? prefixRef(s) : s))
  }
  if (key === 'startingSkillIds' && Array.isArray(value)) {
    return value.map((s) => (typeof s === 'string' ? prefixRef(s) : s))
  }
  if (key === 'grantsSkills' && Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string') return prefixRef(entry)
      if (entry && typeof entry === 'object') return migrateObject(entry)
      return entry
    })
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === 'object' ? migrateObject(item) : item,
    )
  }
  if (typeof value === 'object') return migrateObject(value)
  return value
}

function migrateObject(obj) {
  const out = {}
  for (const [key, val] of Object.entries(obj)) {
    out[key] = migrateValue(key, val)
  }
  return out
}

const targets = [
  'src/data/content/occs/between_the_shadows.json',
  'src/data/content/occs/nightbane_core.json',
]

import { readdirSync } from 'node:fs'
for (const name of readdirSync(join(root, 'src/data/schemas/examples'))) {
  if (name.endsWith('.json')) targets.push(`src/data/schemas/examples/${name}`)
}

const skillsDir = join(root, 'src/data/content/skills')
for (const file of readdirSync(skillsDir).filter((f) => f.endsWith('.json'))) {
  const abs = join(skillsDir, file)
  const doc = JSON.parse(readFileSync(abs, 'utf8'))
  const migrated = Array.isArray(doc)
    ? doc.map((row) => migrateObject(row))
    : migrateObject(doc)
  writeFileSync(abs, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
  console.log(`Patched refs in src/data/content/skills/${file}`)
}

for (const rel of targets) {
  const abs = join(root, rel)
  const doc = JSON.parse(readFileSync(abs, 'utf8'))
  const migrated = Array.isArray(doc)
    ? doc.map((row) => migrateObject(row))
    : migrateObject(doc)
  writeFileSync(abs, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
  console.log(`Patched refs in ${rel}`)
}
