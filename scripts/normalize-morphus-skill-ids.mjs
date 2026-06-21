/**
 * Normalize legacy bare skill ids in Morphus JSON to catalog ids (`skill_*`).
 *
 *   node scripts/normalize-morphus-skill-ids.mjs
 *   node scripts/normalize-morphus-skill-ids.mjs --check
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeSkillReferencesInJson } from './lib/normalize-skill-id.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')

const targets = [
  join(repoRoot, 'src/data/content/morphus/tables'),
  join(repoRoot, 'src/data/schemas/examples'),
  join(repoRoot, 'src/data/source/ingest-briefs/output'),
]

function collectJsonFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    out.push(join(dir, name))
  }
  return out
}

let totalChanges = 0
const allUnknown = new Map()

for (const dir of targets) {
  let files = []
  try {
    files = collectJsonFiles(dir)
  } catch {
    continue
  }

  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    const doc = JSON.parse(raw)
    const { changes, unknown } = normalizeSkillReferencesInJson(doc)
    if (unknown.length) {
      allUnknown.set(file, unknown)
    }
    if (changes === 0) continue
    totalChanges += changes
    const rel = file.replace(`${repoRoot}\\`, '').replace(`${repoRoot}/`, '')
    console.log(`${checkOnly ? 'WOULD FIX' : 'FIXED'}  ${changes} refs in ${rel}`)
    if (!checkOnly) {
      writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
    }
  }
}

if (allUnknown.size) {
  console.warn('\nUnknown skill ids (left unchanged):')
  for (const [file, ids] of allUnknown) {
    const rel = file.replace(`${repoRoot}\\`, '').replace(`${repoRoot}/`, '')
    console.warn(`  ${rel}:`)
    for (const id of ids) console.warn(`    - ${id}`)
  }
}

if (checkOnly && totalChanges > 0) {
  console.log(`\n${totalChanges} legacy skill reference(s) would be updated. Re-run without --check.`)
  process.exit(1)
}

console.log(`\nDone — ${totalChanges} skill reference(s) ${checkOnly ? 'need' : ''} normalization.`)
