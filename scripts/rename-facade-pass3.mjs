/** Third pass: code identifiers only (preserve user-facing "Facade" strings). */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'data/source'])
const EXT = new Set(['.ts', '.tsx', '.json'])

const REPLACEMENTS = [
  ['rollFacadeHpMaximum', 'rollPrimaryHpMaximum'],
  ['rollFacadeSdcMaximum', 'rollPrimarySdcMaximum'],
  ['facadeAlignment', 'primaryAlignment'],
  ['facadeByLabel', 'primaryByLabel'],
  ['facadeByTitle', 'primaryByTitle'],
  ['facadeGroups', 'primaryGroups'],
  ['facadeLine', 'primaryLine'],
  ['facadeLines', 'primaryLines'],
  ["getFormState(opts.character, 'facade')", "getFormState(opts.character, 'primary')"],
  ["aggregateAllPassiveModifiers(character, 'facade')", "aggregateAllPassiveModifiers(character, 'primary')"],
  ["computeDisplayScalars(character, 'facade'", "computeDisplayScalars(character, 'primary'"],
  ["clearOccSelectionState(prev, 'facade')", "clearOccSelectionState(prev, 'primary')"],
  ["useState<ActiveForm>('facade')", "useState<ActiveForm>('primary')"],
  ["characterHasDualForms(prev) ? activeForm : 'facade'", "characterHasDualForms(prev) ? activeForm : 'primary'"],
  ["form === 'morphus' ? 'facade' : form", "form === 'morphus' ? 'primary' : form"],
  [": 'facade'", ": 'primary'"],
  ["'facade'", "'primary'"],
  ["Pick<Character, 'creationHandToHandTier' | 'facade'>", "Pick<Character, 'creationHandToHandTier' | 'primary'>"],
  ['finalized.facade.', 'finalized.primary.'],
  ['expect(finalized.facade', 'expect(finalized.primary'],
  ['if (usable === \'primary_only\') return \'facade\'', "if (usable === 'primary_only') return 'primary'"],
  ["if (explicit === 'facade'", "if (explicit === 'primary'"],
  ['facade: 0', 'primary: 0'],
  ['facade: {', 'primary: {'],
  ['facade,', 'primary,'],
  ['const facade =', 'const primary ='],
  ['morphus: structuredClone(facade)', 'morphus: structuredClone(primary)'],
  ["opts?.form ?? 'facade'", "opts?.form ?? 'primary'"],
  ["dualFormPeHintLabel(): string {\r\n  return 'facade'", "dualFormPeHintLabel(): string {\r\n  return 'Facade'"],
  ["dualFormPeHintLabel(): string {\n  return 'facade'", "dualFormPeHintLabel(): string {\n  return 'Facade'"],
  ["attrFormLabels: { pe: 'facade' }", "attrFormLabels: { pe: dualFormPeHintLabel() }"],
  ['formatVitalFormulaLedgerHint(\'PE + 3D6*10+20\', \'3D6\', { pe: \'facade\' })', "formatVitalFormulaLedgerHint('PE + 3D6*10+20', '3D6', { pe: 'Facade' })"],
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

console.log(`Pass 3: updated ${changedFiles} files.`)
