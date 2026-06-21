/**
 * Merge Between the Shadows psionics pp. 116–117 into production catalog.
 * Run: node scripts/merge-between-shadows-psionics-116-117.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  BTS_116_117_IDS,
  buildBetweenShadowsPsionics116117,
} from './build-between-shadows-psionics-116-117.mjs'
import { psionicCategoryFileName } from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')
const schemasDir = join(root, 'src/data/schemas')

const schema = JSON.parse(readFileSync(join(schemasDir, 'palladium-psionic.schema.json'), 'utf8'))
const featureCommonSchema = JSON.parse(
  readFileSync(join(schemasDir, 'palladium-feature-common.schema.json'), 'utf8'),
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
const validatePsionic = ajv.compile(schema)

const ingestedIds = new Set(BTS_116_117_IDS)
const groups = buildBetweenShadowsPsionics116117()

for (const rows of groups.values()) {
  for (const row of rows) {
    const doc = { $schema: '../palladium-psionic.schema.json', ...row }
    if (!validatePsionic(doc)) {
      console.error(`Invalid ${row.id}:`, validatePsionic.errors)
      process.exit(1)
    }
  }
}

for (const [category, ingested] of groups) {
  const file = psionicCategoryFileName(category)
  const path = join(psionicsDir, file)
  const existing = JSON.parse(readFileSync(path, 'utf8'))
  const next = [
    ...existing.filter((r) => !ingestedIds.has(r.id)),
    ...ingested.map((row) => ({ $schema: '../palladium-psionic.schema.json', ...row })),
  ].sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  console.log(`OK  ${file} — ${ingested.length} BtS rows refreshed`)
}

console.log(`OK  merged ${BTS_116_117_IDS.length} Between the Shadows psionics (pp. 116–117)`)
