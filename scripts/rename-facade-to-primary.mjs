/**
 * One-shot refactor: internal "facade" branch → "primary" (single-form default).
 * User-facing Nightbane label "Facade" stays in creationFormLabels only.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'data/source'])
const EXT = new Set(['.ts', '.tsx', '.json', '.md', '.css'])

const REPLACEMENTS = [
  ['creationFacadeDiceFinalized', 'creationPrimaryDiceFinalized'],
  ['applyFacadePendingDiceResolutions', 'applyPrimaryPendingDiceResolutions'],
  ['syncRaceOccFacadeSdc', 'syncRaceOccPrimarySdc'],
  ['applyMorphusVsFacadeExceptionalLedgerGroupDiff', 'applyMorphusVsPrimaryExceptionalLedgerGroupDiff'],
  ['applyMorphusVsFacadeExceptionalLedgerDiff', 'applyMorphusVsPrimaryExceptionalLedgerDiff'],
  ['applyMorphusVsFacadeCombatLedgerDiff', 'applyMorphusVsPrimaryCombatLedgerDiff'],
  ['applyMorphusVsFacadeLedgerGroupDiff', 'applyMorphusVsPrimaryLedgerGroupDiff'],
  ['applyMorphusVsFacadeLedgerDiff', 'applyMorphusVsPrimaryLedgerDiff'],
  ['formatMorphusVsFacadeTooltip', 'formatMorphusVsPrimaryTooltip'],
  ['facadePpSkillTraitPenalties', 'primaryPpSkillTraitPenalties'],
  ['facadeSdcBreakdownLabel', 'primaryFormSdcBreakdownLabel'],
  ['differsFromFacade', 'differsFromPrimary'],
  ['facadeEffectiveAttrs', 'primaryEffectiveAttrs'],
  ['facadeAttributeLines', 'primaryAttributeLines'],
  ['facadeMeBonus', 'primaryMeBonus'],
  ['facadeRollIds', 'primaryRollIds'],
  ['facadeHpRollHint', 'primaryHpRollHint'],
  ['facadeHpValue', 'primaryHpValue'],
  ['facadeSdcRollHint', 'primarySdcRollHint'],
  ['facadeSdcValue', 'primarySdcValue'],
  ['facadeHpLabels', 'primaryHpLabels'],
  ['facadeSdcLabels', 'primarySdcLabels'],
  ['facadeSdcBaseline', 'primarySdcBaseline'],
  ['facadeSdcBlock', 'primarySdcBlock'],
  ['facadeSections', 'primarySections'],
  ['facadeVitals', 'primaryVitals'],
  ['facadePpe', 'primaryPpe'],
  ['facadeLines', 'primaryLines'],
  ['facadePeScore', 'primaryPeScore'],
  ['facadePe', 'primaryPe'],
  ['facadeAttrs', 'primaryAttrs'],
  ['facadeActive', 'primaryActive'],
  ['facadeSpent', 'primarySpent'],
  ['facadeReady', 'primaryReady'],
  ['facadeMe', 'primaryMe'],
  ['facadePp', 'primaryPp'],
  ['facadeValue', 'primaryValue'],
  ['facadeTotal', 'primaryTotal'],
  ['facadeNum', 'primaryNum'],
  ['facadeMap', 'primaryMap'],
  ['descFacade', 'descPrimaryTheme'],
  ['facadePpPenalties', 'primaryPpPenalties'],
  ['pds-level-up-facade-pulse', 'pds-level-up-primary-pulse'],
  ['pds-xp-pending-facade', 'pds-xp-pending-primary'],
  ["Character['facade']", "Character['primary']"],
  ['characterFixture.facade', 'characterFixture.primary'],
  ['character.facade', 'character.primary'],
  ['state.facade', 'state.primary'],
  ['prev.facade', 'prev.primary'],
  ['c.facade', 'c.primary'],
  ['hydrated.facade', 'hydrated.primary'],
  ['next.facade', 'next.primary'],
  ['withRace.facade', 'withRace.primary'],
  ['bump(prev.facade)', 'bump(prev.primary)'],
  ['facade_only', 'primary_only'],
  ['activeForm === \'facade\'', "activeForm === 'primary'"],
  ['form === \'facade\'', "form === 'primary'"],
  ['f === \'facade\'', "f === 'primary'"],
  ['ledgerForm === \'facade\'', "ledgerForm === 'primary'"],
  ["onSelect('facade')", "onSelect('primary')"],
  ["activeForm: 'facade'", "activeForm: 'primary'"],
  ["'facade' as const", "'primary' as const"],
  ["'facade', 'morphus'", "'primary', 'morphus'"],
  ["'facade' | 'morphus'", "'primary' | 'morphus'"],
  ["scope === 'facade'", "scope === 'primary'"],
  ["? 'facade' : 'all'", "? 'primary' : 'all'"],
  ["supportsDualForm ? activeForm : 'facade'", "supportsDualForm ? activeForm : 'primary'"],
  ["setActiveForm('facade')", "setActiveForm('primary')"],
  ["setActiveForm((f) => (f === 'facade'", "setActiveForm((f) => (f === 'primary'"],
  ["type ActiveForm = 'facade'", "type ActiveForm = 'primary'"],
  ["| 'facade' | 'either'", "| 'primary' | 'either'"],
  ['^(facade|morphus)', '^(primary|morphus)'],
  ["PendingDiceBlockScope = 'facade'", "PendingDiceBlockScope = 'primary'"],
  ['facade: DerivedFormState', 'primary: DerivedFormState'],
  ['facade: FormState', 'primary: FormState'],
  ['facade: stripFormBranch', 'primary: stripFormBranch'],
  ['facade: bump', 'primary: bump'],
  ['const facade = ', 'const primary = '],
  ['PE (facade)', 'PE (Facade)'],
  ['fSDC', 'pSDC'],
  ['fAttr', 'pAttr'],
  ['fIQ', 'pIQ'],
  ['fPE', 'pPE'],
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

const oldFile = path.join(ROOT, 'src/lib/facadePpSkillTraitPenalties.ts')
const newFile = path.join(ROOT, 'src/lib/primaryPpSkillTraitPenalties.ts')
if (fs.existsSync(oldFile)) {
  fs.renameSync(oldFile, newFile)
  console.log('Renamed facadePpSkillTraitPenalties.ts → primaryPpSkillTraitPenalties.ts')
}

let changedFiles = 0
for (const file of walk(ROOT)) {
  if (file.includes('rename-facade-to-primary')) continue
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

console.log(`Updated ${changedFiles} files.`)
