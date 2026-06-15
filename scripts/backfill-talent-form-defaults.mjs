/**
 * Apply morphus_only default to talent rows unless prose allows Facade use.
 *
 * Run: node scripts/backfill-talent-form-defaults.mjs
 * Dry run: node scripts/backfill-talent-form-defaults.mjs --dry-run
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inferTalentUsableInNightbaneForm } from './talent-engine-contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const talentsDir = join(root, 'src/data/content/talents')
const dryRun = process.argv.includes('--dry-run')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function applyFormDefault(talent) {
  const inferred = inferTalentUsableInNightbaneForm(talent)
  const current = talent.limitations?.usableInNightbaneForm
  const next = { ...(talent.limitations ?? {}), usableInNightbaneForm: inferred }
  return {
    talent: { ...talent, limitations: next },
    changed: current !== inferred,
    from: current ?? '(missing)',
    to: inferred,
  }
}

let totalChanged = 0
for (const file of ['common.json', 'elite.json']) {
  const path = join(talentsDir, file)
  const rows = loadJson(path)
  const updated = []
  for (const talent of rows) {
    const result = applyFormDefault(talent)
    if (result.changed) {
      totalChanged++
      console.log(`${file} ${talent.id}: ${result.from} → ${result.to}`)
    }
    updated.push(result.talent)
  }
  if (!dryRun) {
    writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
  }
}

console.log(
  dryRun
    ? `Dry run — ${totalChanged} row(s) would change`
    : `Updated ${totalChanged} row(s) in talents/`,
)
