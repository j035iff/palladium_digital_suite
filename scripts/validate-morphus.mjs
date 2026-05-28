/**
 * Fast Morphus-only validation:
 * - schema compile for morphus characteristic/table schemas
 * - table document validation for all morphus table JSONs
 * - description leak guard for post-table appendix heading markers
 *
 * Run: npm run validate:morphus
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemasDir = join(root, 'src/data/schemas')
const morphusTablesDir = join(root, 'src/data/content/morphus/tables')

function loadJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'))
}

const morphusCharacteristicSchema = loadJson(
  join(schemasDir, 'palladium-morphus.schema.json'),
)
const morphusTableSchema = loadJson(
  join(schemasDir, 'palladium-morphus-table.schema.json'),
)

const morphusDescriptionLeakRe =
  /\b(?:Talent Manifestations|New Common Talents|Appendix Talents|Common Talents from Nightbane|Elite Talents from Nightbane)\b/i

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)
ajv.addSchema(morphusCharacteristicSchema)

let failed = false
for (const [label, schema] of [
  ['palladium-morphus.schema.json', morphusCharacteristicSchema],
  ['palladium-morphus-table.schema.json', morphusTableSchema],
]) {
  try {
    ajv.compile(schema)
    console.log(`OK  ${label} — Ajv compile succeeded`)
  } catch (e) {
    failed = true
    console.error(`ERR ${label}`, e)
  }
}

const validateMorphusTableDoc = ajv.compile(morphusTableSchema)
let morphusTableFiles = []
try {
  morphusTableFiles = readdirSync(morphusTablesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR morphus/tables — directory missing')
  process.exit(1)
}

let schemaBad = 0
let leakBad = 0
for (const file of morphusTableFiles) {
  const doc = loadJson(join(morphusTablesDir, file))
  if (!validateMorphusTableDoc(doc)) {
    schemaBad++
    if (schemaBad <= 5) {
      console.error(
        `ERR morphus/tables/${file} id=${doc?.id ?? '?'}:`,
        validateMorphusTableDoc.errors,
      )
    }
  }
  for (const entry of doc.entries ?? []) {
    const description = String(entry?.description ?? '')
    if (!description || !morphusDescriptionLeakRe.test(description)) continue
    leakBad++
    if (leakBad <= 5) {
      console.error(
        `ERR morphus/tables/${file} id=${entry?.id ?? '?'}: description appears to include post-table appendix prose`,
      )
    }
  }
}

if (schemaBad === 0) {
  console.log(`OK  morphus/tables — ${morphusTableFiles.length} table file(s) validate`)
} else {
  failed = true
  console.error(`ERR morphus/tables — ${schemaBad} file(s) failed schema validation`)
}

if (leakBad === 0) {
  console.log('OK  morphus/tables descriptions — no post-table prose leakage markers')
} else {
  failed = true
  console.error(`ERR morphus/tables descriptions — ${leakBad} leaked description(s) found`)
}

if (failed) process.exit(1)
