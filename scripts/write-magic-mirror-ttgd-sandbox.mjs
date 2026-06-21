/**
 * Sandbox output for nightbane-magic-mirror-ttgd-72-76-ab-sandbox brief.
 * Source: WB3-Through_the_Glass_Darkly.pdf printed pp. 72–76.
 * Run: node scripts/write-magic-mirror-ttgd-sandbox.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { buildMirrorSpells } from './build_mirror_spells.mjs'

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

const spells = buildMirrorSpells().sort((a, b) => a.id.localeCompare(b.id))

for (const row of spells) {
  if (!validateSpell(row)) {
    console.error(`Invalid ${row.id}:`, validateSpell.errors)
    process.exit(1)
  }
}

const outPath = join(
  root,
  'src/data/source/ingest-briefs/output/nightbane-magic-mirror-ttgd-72-76-sandbox.json',
)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(spells, null, 2)}\n`, 'utf8')
console.log(`OK  wrote ${spells.length} spells to ${outPath}`)
