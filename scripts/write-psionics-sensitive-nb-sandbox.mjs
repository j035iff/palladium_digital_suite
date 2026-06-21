/**
 * Write sandbox output for nightbane-psionics-sensitive-nb-70-77-ab-sandbox brief.
 * Nightbane RPG printed pp. 70–77 (Sensitive abilities; p. 78 Summon Inner Strength excluded).
 * Run: node scripts/write-psionics-sensitive-nb-sandbox.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { buildNightbaneSensitivePsionics } from './build-nightbane-sensitive-psionics.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemasDir = join(root, 'src/data/schemas')
const schema = JSON.parse(readFileSync(join(schemasDir, 'palladium-psionic.schema.json'), 'utf8'))
const featureCommonSchema = JSON.parse(
  readFileSync(join(schemasDir, 'palladium-feature-common.schema.json'), 'utf8'),
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
const validatePsionic = ajv.compile(schema)

const rows = buildNightbaneSensitivePsionics({ maxSourcePage: 77 }).map((row) => ({
  $schema: '../palladium-psionic.schema.json',
  ...row,
}))

rows.sort((a, b) => a.id.localeCompare(b.id))

for (const row of rows) {
  if (!validatePsionic(row)) {
    console.error(`Invalid ${row.id}:`, validatePsionic.errors)
    process.exit(1)
  }
}

const outPath = join(
  root,
  'src/data/source/ingest-briefs/output/nightbane-psionics-sensitive-nb-70-77-sandbox.json',
)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
console.log(`OK  wrote ${rows.length} psionics to ${outPath}`)
