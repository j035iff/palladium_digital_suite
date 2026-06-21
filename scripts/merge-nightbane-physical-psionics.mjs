/**
 * Merge Nightbane RPG physical psionics (pp. 77–83) into production catalog.
 * Run: node scripts/merge-nightbane-physical-psionics.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  buildNightbanePhysicalPsionics,
  NIGHTBANE_PHYSICAL_IDS,
} from './build-nightbane-physical-psionics.mjs'

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

const sensitivePath = join(psionicsDir, 'sensitive.json')
const physicalPath = join(psionicsDir, 'physical.json')

const sensitiveRows = JSON.parse(readFileSync(sensitivePath, 'utf8'))
const physicalRows = JSON.parse(readFileSync(physicalPath, 'utf8'))

const sensitiveTotalRecall = sensitiveRows.find((r) => r.id === 'psionic_total_recall')
const ingested = buildNightbanePhysicalPsionics({ sensitiveTotalRecall }).map((row) => ({
  $schema: '../palladium-psionic.schema.json',
  ...row,
}))

const ingestedIds = new Set(NIGHTBANE_PHYSICAL_IDS)

for (const row of ingested) {
  if (!validatePsionic(row)) {
    console.error(`Invalid ${row.id}:`, validatePsionic.errors)
    process.exit(1)
  }
}

const nextPhysical = [
  ...physicalRows.filter((r) => !ingestedIds.has(r.id)),
  ...ingested,
].sort((a, b) => a.id.localeCompare(b.id))

const nextSensitive = sensitiveRows.filter((r) => r.id !== 'psionic_total_recall')

writeFileSync(physicalPath, `${JSON.stringify(nextPhysical, null, 2)}\n`, 'utf8')
writeFileSync(sensitivePath, `${JSON.stringify(nextSensitive, null, 2)}\n`, 'utf8')

console.log(`OK  merged ${ingested.length} Nightbane physical psionics into ${physicalPath}`)
console.log(`OK  removed psionic_total_recall from ${sensitivePath} (dual placement on physical row)`)
