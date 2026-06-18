/**
 * Re-split `src/data/content/psionics/*.json` by each row's primary category
 * (`genrePlacements[0].category`). Also migrates legacy `palladiumPsionics.json` when present.
 *   npm run split:psionics
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  expectedPsionicCategoryFile,
  groupPsionicsByCategoryFile,
  loadPsionicsFromDir,
  writePsionicsToDir,
} from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')
const legacyPath = join(root, 'src/data/content/palladiumPsionics.json')

function loadLegacyMonolith() {
  if (!existsSync(legacyPath)) return []
  const rows = JSON.parse(readFileSync(legacyPath, 'utf8'))
  if (!Array.isArray(rows)) {
    throw new Error('palladiumPsionics.json must be a top-level JSON array')
  }
  return rows
}

function mergeCatalog(dirRows, legacyRows) {
  const byId = new Map()
  for (const row of dirRows) {
    if (row?.id) byId.set(row.id, row)
  }
  for (const row of legacyRows) {
    if (!row?.id) continue
    if (byId.has(row.id)) {
      throw new Error(
        `Duplicate psionic id "${row.id}" in psionics/ and palladiumPsionics.json`,
      )
    }
    byId.set(row.id, row)
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

const dirRows = loadPsionicsFromDir(psionicsDir)
const legacyRows = loadLegacyMonolith()
const rows = mergeCatalog(dirRows, legacyRows)

if (rows.length === 0) {
  console.error('No psionic rows found in psionics/ or palladiumPsionics.json')
  process.exit(1)
}

const sourceFileById = new Map()
for (const row of loadPsionicsFromDir(psionicsDir)) {
  sourceFileById.set(row.id, expectedPsionicCategoryFile(row))
}

writePsionicsToDir(psionicsDir, rows)

let moved = 0
for (const row of rows) {
  const from = sourceFileById.get(row.id)
  const to = expectedPsionicCategoryFile(row)
  if (from && from !== to) moved++
}

if (existsSync(legacyPath)) {
  unlinkSync(legacyPath)
  console.log('Removed legacy src/data/content/palladiumPsionics.json')
}

const groups = groupPsionicsByCategoryFile(rows)
for (const [file, list] of [...groups.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  console.log(`${file}: ${list.length}`)
}
console.log(`Re-split ${rows.length} psionics in ${psionicsDir}`)
if (moved > 0) {
  console.log(`Moved ${moved} power(s) to their primary category file`)
}
