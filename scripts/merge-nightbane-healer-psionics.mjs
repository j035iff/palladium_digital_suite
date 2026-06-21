/**
 * Merge Nightbane RPG healer psionics (pp. 83–84) into production catalog.
 * Run: node scripts/merge-nightbane-healer-psionics.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  assertSuggestionHealerDualPlacement,
  buildNightbaneHealerPsionics,
  NIGHTBANE_HEALER_IDS,
} from './build-nightbane-healer-psionics.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')
const schemasDir = join(root, 'src/data/schemas')
const healerPath = join(psionicsDir, 'healer.json')

const schema = JSON.parse(readFileSync(join(schemasDir, 'palladium-psionic.schema.json'), 'utf8'))
const featureCommonSchema = JSON.parse(
  readFileSync(join(schemasDir, 'palladium-feature-common.schema.json'), 'utf8'),
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
const validatePsionic = ajv.compile(schema)

assertSuggestionHealerDualPlacement()

const healerRows = JSON.parse(readFileSync(healerPath, 'utf8'))
const ingestedIds = new Set(NIGHTBANE_HEALER_IDS)
const ingested = buildNightbaneHealerPsionics().map((row) => ({
  $schema: '../palladium-psionic.schema.json',
  ...row,
}))

for (const row of ingested) {
  if (!validatePsionic(row)) {
    console.error(`Invalid ${row.id}:`, validatePsionic.errors)
    process.exit(1)
  }
}

const nextHealer = [
  ...healerRows.filter((r) => !ingestedIds.has(r.id)),
  ...ingested,
].sort((a, b) => a.id.localeCompare(b.id))

writeFileSync(healerPath, `${JSON.stringify(nextHealer, null, 2)}\n`, 'utf8')
console.log(`OK  merged ${ingested.length} Nightbane healer psionics into ${healerPath}`)
console.log('OK  Suggestion (Hypnosis) dual sensitive+healer verified in sensitive.json')
