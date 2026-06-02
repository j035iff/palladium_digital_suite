/**
 * Remove skill-modifier prose duplicated in skillModifiers (description + customOneOffs).
 * Usage: node scripts/dedupe-morphus-skill-prose.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dedupeEntrySkillProse, repairEntryProseArtifacts } from './lib/morphus-skill-prose-dedupe.mjs'
import { dedupeTableHeaderSkillProse } from './lib/morphus-table-header-skill-dedupe.mjs'

const root = join(fileURLToPath(import.meta.url), '..')
const tablesDir = join(root, '../src/data/content/morphus/tables')
const skillsPath = join(root, '../src/data/content/palladiumSkills.json')
const dryRun = process.argv.includes('--dry-run')

const skills = JSON.parse(readFileSync(skillsPath, 'utf8'))
const skillsById = new Map(skills.map((s) => [s.id, s]))

function hasTraitData(table) {
  if (!Array.isArray(table.entries) || table.entries.length === 0) return false
  return table.entries.some(
    (e) =>
      e.description?.length > 80 ||
      e.skillModifiers ||
      e.customOneOffs?.length,
  )
}

const files = readdirSync(tablesDir).filter((f) => f.endsWith('.json'))
let filesTouched = 0
let entriesTouched = 0
let headersTouched = 0

for (const file of files.sort()) {
  const path = join(tablesDir, file)
  const table = JSON.parse(readFileSync(path, 'utf8'))
  if (!hasTraitData(table)) continue

  let fileChanged = false

  if (table.kind === 'morphus_trait_table' && table.description) {
    const { changed: headerChanged } = dedupeTableHeaderSkillProse(table)
    if (headerChanged) {
      headersTouched++
      fileChanged = true
    }
  }
  for (const entry of table.entries) {
    const deduped = dedupeEntrySkillProse(entry, skillsById)
    const repaired = repairEntryProseArtifacts(entry)
    if (deduped.changed || repaired.changed) {
      entriesTouched++
      fileChanged = true
    }
  }

  if (fileChanged) {
    filesTouched++
    console.log(`${dryRun ? '[dry-run] would update' : 'updated'} ${file}`)
    if (!dryRun) {
      writeFileSync(path, `${JSON.stringify(table, null, 2)}\n`, 'utf8')
    }
  }
}

console.log(
  `${dryRun ? 'Dry run:' : 'Done:'} ${filesTouched} file(s), ${entriesTouched} entr(ies) prose stripped, ${headersTouched} table header(s) trimmed.`,
)
