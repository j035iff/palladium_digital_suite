/**
 * Category-split psionic catalog I/O — mirrors skills-catalog-fs pattern.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs'
import { join } from 'node:path'

/** Selection category slug → `content/psionics/*.json` filename. */
export function psionicCategoryFileName(category) {
  return `${String(category).toLowerCase().replace(/\s+/g, '_')}.json`
}

/** File placement: first `genrePlacements[]` entry (ingest primary category). */
export function primaryPsionicCategory(row) {
  const placements = row?.genrePlacements
  if (!Array.isArray(placements) || placements.length === 0) {
    throw new Error(`Psionic "${row?.id ?? '?'}" is missing genrePlacements[]`)
  }
  const category = placements[0]?.category
  if (!category) {
    throw new Error(`Psionic "${row?.id ?? '?'}" genrePlacements[0] missing category`)
  }
  return category
}

export function expectedPsionicCategoryFile(row) {
  return psionicCategoryFileName(primaryPsionicCategory(row))
}

export function groupPsionicsByCategoryFile(rows) {
  const groups = new Map()
  for (const row of rows) {
    const file = expectedPsionicCategoryFile(row)
    const list = groups.get(file) ?? []
    list.push(row)
    groups.set(file, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id))
  }
  return groups
}

export function loadPsionicsFromDir(psionicsDir) {
  if (!existsSync(psionicsDir)) return []
  const rows = []
  const idToFile = new Map()
  for (const file of readdirSync(psionicsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const parsed = JSON.parse(readFileSync(join(psionicsDir, file), 'utf8'))
    if (!Array.isArray(parsed)) {
      throw new Error(`${file} must be a top-level JSON array`)
    }
    for (const row of parsed) {
      if (!row?.id) continue
      if (idToFile.has(row.id)) {
        throw new Error(
          `Duplicate psionic id "${row.id}" in ${file} and ${idToFile.get(row.id)}`,
        )
      }
      idToFile.set(row.id, file)
      rows.push(row)
    }
  }
  return rows
}

export function writePsionicsToDir(psionicsDir, rows) {
  mkdirSync(psionicsDir, { recursive: true })
  const groups = groupPsionicsByCategoryFile(rows)
  const keep = new Set(groups.keys())
  for (const file of readdirSync(psionicsDir).filter((f) => f.endsWith('.json'))) {
    if (!keep.has(file)) unlinkSync(join(psionicsDir, file))
  }
  for (const [file, list] of groups) {
    writeFileSync(
      join(psionicsDir, file),
      `${JSON.stringify(list, null, 2)}\n`,
      'utf8',
    )
  }
}
