/**
 * Merge Between the Shadows master psionics (pp. 113–115) into super.json.
 * Run: node scripts/merge-between-shadows-psionics-super-113-115.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  BTS_SUPER_IDS,
  buildBetweenShadowsSuperPsionics113115,
} from './build-between-shadows-psionics-super-113-115.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')
const schemasDir = join(root, 'src/data/schemas')
const superPath = join(psionicsDir, 'super.json')

const schema = JSON.parse(readFileSync(join(schemasDir, 'palladium-psionic.schema.json'), 'utf8'))
const featureCommonSchema = JSON.parse(
  readFileSync(join(schemasDir, 'palladium-feature-common.schema.json'), 'utf8'),
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
const validatePsionic = ajv.compile(schema)

const ingestedIds = new Set(BTS_SUPER_IDS)
const ingested = buildBetweenShadowsSuperPsionics113115().map((row) => ({
  $schema: '../palladium-psionic.schema.json',
  ...row,
}))

for (const row of ingested) {
  if (!validatePsionic(row)) {
    console.error(`Invalid ${row.id}:`, validatePsionic.errors)
    process.exit(1)
  }
}

const existing = JSON.parse(readFileSync(superPath, 'utf8'))
const next = [
  ...existing.filter((r) => !ingestedIds.has(r.id)),
  ...ingested,
].sort((a, b) => a.id.localeCompare(b.id))

writeFileSync(superPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
console.log(`OK  merged ${ingested.length} master psionics into ${superPath}`)
