import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs'
import { basename, join } from 'node:path'

/** Palladium skill category label → `content/skills/*.json` filename. */
export function skillCategoryFileName(category) {
  return `${category.toLowerCase().replace(/\s+/g, '_')}.json`
}

export function primarySkillCategory(skill) {
  const cats = skill?.categories
  if (!Array.isArray(cats) || cats.length === 0) {
    throw new Error(`Skill "${skill?.id ?? '?'}" is missing categories[]`)
  }
  return cats[0]
}

export function groupSkillsByCategoryFile(skills) {
  const groups = new Map()
  for (const skill of skills) {
    const file = skillCategoryFileName(primarySkillCategory(skill))
    const list = groups.get(file) ?? []
    list.push(skill)
    groups.set(file, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id))
  }
  return groups
}

export function loadSkillsFromDir(skillsDir) {
  const files = readdirSync(skillsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
  const skills = []
  const seenIds = new Map()
  for (const file of files) {
    const rows = JSON.parse(readFileSync(join(skillsDir, file), 'utf8'))
    if (!Array.isArray(rows)) {
      throw new Error(`${file} must be a top-level JSON array`)
    }
    for (const row of rows) {
      if (!row?.id) continue
      if (seenIds.has(row.id)) {
        throw new Error(
          `Duplicate skill id "${row.id}" in ${file} and ${seenIds.get(row.id)}`,
        )
      }
      seenIds.set(row.id, file)
      skills.push(row)
    }
  }
  return skills
}

export function writeSkillsToDir(skillsDir, skills) {
  mkdirSync(skillsDir, { recursive: true })
  const groups = groupSkillsByCategoryFile(skills)
  const nextFiles = new Set(groups.keys())
  for (const existing of listSkillCatalogFiles(skillsDir)) {
    if (!nextFiles.has(existing)) {
      unlinkSync(join(skillsDir, existing))
    }
  }
  for (const [file, rows] of [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    writeFileSync(join(skillsDir, file), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
  }
}

export function listSkillCatalogFiles(skillsDir) {
  return readdirSync(skillsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => basename(f))
    .sort()
}
