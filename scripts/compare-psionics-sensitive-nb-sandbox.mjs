/**
 * Compare nightbane-psionics-sensitive-nb-70-77 sandbox vs production Nightbane RPG rows.
 * Run: node scripts/compare-psionics-sensitive-nb-sandbox.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sandbox = JSON.parse(
  readFileSync(
    join(root, 'src/data/source/ingest-briefs/output/nightbane-psionics-sensitive-nb-70-77-sandbox.json'),
    'utf8',
  ),
)
const prodAll = JSON.parse(
  readFileSync(join(root, 'src/data/content/psionics/sensitive.json'), 'utf8'),
)
const prod = prodAll.filter((r) => r.sources?.some((s) => s.reference === 'Nightbane RPG'))

const prodById = new Map(prod.map((r) => [r.id, r]))
const sandboxIds = new Set(sandbox.map((r) => r.id))

console.log(`Sandbox: ${sandbox.length} | Production NB RPG: ${prod.length}`)
console.log('')

let same = 0
let different = 0
let missingProd = 0
let extraProd = 0

for (const row of sandbox) {
  const p = prodById.get(row.id)
  if (!p) {
    missingProd++
    console.log(`MISSING PROD: ${row.id}`)
    continue
  }
  const normalize = (obj) => {
    const copy = { ...obj }
    delete copy.$schema
    return JSON.stringify(copy, Object.keys(copy).sort())
  }
  if (normalize(row) === normalize(p)) {
    same++
  } else {
    different++
    const keys = new Set([...Object.keys(row), ...Object.keys(p)])
    const diffKeys = [...keys].filter(
      (k) => k !== '$schema' && JSON.stringify(row[k]) !== JSON.stringify(p[k]),
    )
    console.log(`DIFF ${row.id}: ${diffKeys.join(', ')}`)
  }
}

for (const row of prod) {
  if (!sandboxIds.has(row.id)) {
    extraProd++
    console.log(`NOT IN SANDBOX: ${row.id} (${row.name})`)
  }
}

console.log('')
console.log(
  `Same: ${same} | Different: ${different} | Missing prod: ${missingProd} | Prod not in sandbox: ${extraProd}`,
)
