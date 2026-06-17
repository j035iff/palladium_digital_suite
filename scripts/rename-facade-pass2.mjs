/** Second pass: remaining facade identifiers. */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'data/source'])
const EXT = new Set(['.ts', '.tsx', '.json', '.md', '.css'])

const REPLACEMENTS = [
  ['sumFacadePpTraitPenaltiesForSkill', 'sumPrimaryPpTraitPenaltiesForSkill'],
  ['facadePassive', 'primaryPassive'],
  ['facadeDisplay', 'primaryDisplay'],
  ['facadeSkills', 'primarySkills'],
  ['facadeBranch', 'primaryBranch'],
  ['facadeParts', 'primaryParts'],
  ['facadeAmount', 'primaryAmount'],
  ['facadeHp', 'primaryHp'],
  ['facadeSdc', 'primarySdc'],
  ['facadeIsp', 'primaryIsp'],
  ['facadeBlocks', 'primaryBlocks'],
  ['facadeScope', 'primaryScope'],
  ["'level' | 'facade'", "'level' | 'primary'"],
  ["'facade.hitPoints", "'primary.hitPoints"],
  ["'facade.structuralDamageCapacity", "'primary.structuralDamageCapacity"],
  ["'facade.isp", "'primary.isp"],
  ["id: 'facade-finalized'", "id: 'primary-finalized'"],
  ['facade.hitPoints', 'primary.hitPoints'],
  ['facade.structuralDamageCapacity', 'primary.structuralDamageCapacity'],
  ['facade.isp', 'primary.isp'],
  ["formKey !== 'facade'", "formKey !== 'primary'"],
  ['filterPendingDiceBlocksByScope(blocks, \'facade\')', "filterPendingDiceBlocksByScope(blocks, 'primary')"],
  ['facade.some', 'primary.some'],
  ['expect(facade.', 'expect(primary.'],
  ['const facade =', 'const primary ='],
  ["projectCreationSkillsToSheet(prev, occ, 'facade'", "projectCreationSkillsToSheet(prev, occ, 'primary'"],
  ['activeForm: ActiveForm = \'facade\'', "activeForm: ActiveForm = 'primary'"],
  ['form: ActiveForm = characterHasDualForms(prev) ? options.activeForm : \'facade\'', "form: ActiveForm = characterHasDualForms(prev) ? options.activeForm : 'primary'"],
  ["form?: 'human' | 'morphus'", "form?: 'primary' | 'morphus'"],
  ["form: 'human' | 'morphus'", "form: 'primary' | 'morphus'"],
  ["form === 'human'", "form === 'primary'"],
  [", 'facade',", ", 'primary',"],
  ["('facade',", "('primary',"],
  ["['facade']", "['primary']"],
  ['facade: finalizeFormBranch', 'primary: finalizeFormBranch'],
]

function shouldSkipDir(dirPath) {
  const rel = path.relative(ROOT, dirPath).replace(/\\/g, '/')
  for (const skip of SKIP_DIR) {
    if (rel === skip || rel.startsWith(`${skip}/`)) return true
  }
  return false
}

function walk(dir, files = []) {
  if (shouldSkipDir(dir)) return files
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, files)
    else if (EXT.has(path.extname(ent.name))) files.push(full)
  }
  return files
}

let changedFiles = 0
for (const file of walk(ROOT)) {
  if (file.includes('rename-facade')) continue
  let text = fs.readFileSync(file, 'utf8')
  const original = text
  for (const [from, to] of REPLACEMENTS) {
    text = text.split(from).join(to)
  }
  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8')
    changedFiles++
  }
}

console.log(`Pass 2: updated ${changedFiles} files.`)
