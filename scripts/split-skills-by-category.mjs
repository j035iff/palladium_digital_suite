/**
 * Re-split `src/data/content/skills/*.json` by each skill's primary category
 * (`categories[0]`). Run after bulk edits that may have moved skills between files:
 *   npm run split:skills
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  groupSkillsByCategoryFile,
  primarySkillCategory,
  skillCategoryFileName,
  writeSkillsToDir,
} from './lib/skills-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = join(root, 'src/data/content/skills')

function loadSkillsWithSourceFiles(dir) {
  const skills = []
  const sourceFileById = new Map()
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const rows = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    if (!Array.isArray(rows)) {
      throw new Error(`${file} must be a top-level JSON array`)
    }
    for (const row of rows) {
      if (!row?.id) continue
      if (sourceFileById.has(row.id)) {
        throw new Error(
          `Duplicate skill id "${row.id}" in ${file} and ${sourceFileById.get(row.id)}`,
        )
      }
      sourceFileById.set(row.id, file)
      skills.push(row)
    }
  }
  return { skills, sourceFileById }
}

const { skills, sourceFileById } = loadSkillsWithSourceFiles(skillsDir)
writeSkillsToDir(skillsDir, skills)

const groups = groupSkillsByCategoryFile(skills)
let moved = 0
for (const skill of skills) {
  const from = sourceFileById.get(skill.id)
  const to = skillCategoryFileName(primarySkillCategory(skill))
  if (from !== to) moved++
}

for (const [file, rows] of [...groups.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  console.log(`${file}: ${rows.length}`)
}
console.log(`Re-split ${skills.length} skills in ${skillsDir}`)
if (moved > 0) {
  console.log(`Moved ${moved} skill(s) to their primary category file`)
}
