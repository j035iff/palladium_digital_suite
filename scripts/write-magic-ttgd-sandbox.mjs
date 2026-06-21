/**
 * Sandbox output for nightbane-magic-wizard-ttgd-56-63-ab-sandbox brief.
 * Source: WB3-Through_the_Glass_Darkly.pdf printed pp. 56–63.
 * Run: node scripts/write-magic-ttgd-sandbox.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { buildTtgdWizardSpells } from './build_ttgd_wizard_spells.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemasDir = join(root, 'src/data/schemas')
const featureCommonSchema = JSON.parse(
  readFileSync(join(schemasDir, 'palladium-feature-common.schema.json'), 'utf8'),
)
const magicSchema = JSON.parse(readFileSync(join(schemasDir, 'palladium-magic.schema.json'), 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: false, validateSchema: false })
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
const validateSpell = ajv.compile(magicSchema)

const spells = buildTtgdWizardSpells().sort((a, b) => a.id.localeCompare(b.id))

for (const row of spells) {
  if (!validateSpell(row)) {
    console.error(`Invalid ${row.id}:`, validateSpell.errors)
    process.exit(1)
  }
}

const outPath = join(
  root,
  'src/data/source/ingest-briefs/output/nightbane-magic-wizard-ttgd-56-63-sandbox.json',
)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(spells, null, 2)}\n`, 'utf8')
console.log(`OK  wrote ${spells.length} spells to ${outPath}`)
