/**
 * Ensures bundled Palladium JSON Schemas (draft 2020-12) compile under Ajv.
 * Run: npm run validate:schemas
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadJson(rel) {
  const p = join(root, rel)
  return JSON.parse(readFileSync(p, 'utf8'))
}

const skillSchema = loadJson('schemas/palladium-skill.schema.json')
const weaponProficiencySchema = loadJson('schemas/palladium-weapon-proficiency.schema.json')
const standardModernWeaponProgressionSchema = loadJson(
  'schemas/standard-modern-weapon-progression.schema.json',
)

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)

let failed = false
for (const [label, schema] of [
  ['palladium-skill.schema.json', skillSchema],
  ['palladium-weapon-proficiency.schema.json', weaponProficiencySchema],
]) {
  try {
    ajv.compile(schema)
    console.log(`OK  ${label} — Ajv compile succeeded`)
  } catch (e) {
    failed = true
    console.error(`ERR ${label}`, e)
  }
}

try {
  ajv.compile(standardModernWeaponProgressionSchema)
  console.log(
    'OK  standard-modern-weapon-progression.schema.json — Ajv compile succeeded (refs W.P. schema)',
  )
} catch (e) {
  failed = true
  console.error('ERR standard-modern-weapon-progression.schema.json', e)
}

const validateSkillRow = ajv.compile(skillSchema)
const validateWeaponProficiencyRow = ajv.compile(weaponProficiencySchema)
const validateProgressionDoc = ajv.compile(standardModernWeaponProgressionSchema)

const palladiumSkills = loadJson('src/data/library/palladiumSkills.json')
if (!Array.isArray(palladiumSkills)) {
  failed = true
  console.error('ERR palladiumSkills.json — expected top-level array')
} else {
  let bad = 0
  for (const row of palladiumSkills) {
    if (!validateSkillRow(row)) {
      bad++
      if (bad <= 5) {
        console.error(
          `ERR palladiumSkills.json id=${row?.id ?? '?'}:`,
          validateSkillRow.errors,
        )
      }
    }
  }
  if (bad === 0) {
    console.log(`OK  palladiumSkills.json — ${palladiumSkills.length} rows validate`)
  } else {
    failed = true
    console.error(`ERR palladiumSkills.json — ${bad} row(s) failed schema validation`)
  }
}

const weaponProficiencies = loadJson('src/data/library/weapon_proficiencies.json')
if (!Array.isArray(weaponProficiencies)) {
  failed = true
  console.error('ERR weapon_proficiencies.json — expected top-level array')
} else {
  let bad = 0
  for (const row of weaponProficiencies) {
    if (!validateWeaponProficiencyRow(row)) {
      bad++
      if (bad <= 5) {
        console.error(
          `ERR weapon_proficiencies.json id=${row?.id ?? '?'}:`,
          validateWeaponProficiencyRow.errors,
        )
      }
    }
  }
  if (bad === 0) {
    console.log(
      `OK  weapon_proficiencies.json — ${weaponProficiencies.length} rows validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR weapon_proficiencies.json — ${bad} row(s) failed schema validation`,
    )
  }
}

const progressionJson = loadJson('src/data/library/standard_modern_weapon_progression.json')
if (!validateProgressionDoc(progressionJson)) {
  failed = true
  console.error(
    'ERR standard_modern_weapon_progression.json:',
    validateProgressionDoc.errors,
  )
} else {
  console.log('OK  standard_modern_weapon_progression.json — document validates')
}

if (failed) process.exit(1)
