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
const schemasDir = join(root, 'src/data/schemas')
const contentDir = join(root, 'src/data/content')

function loadJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'))
}

const skillSchema = loadJson(join(schemasDir, 'palladium-skill.schema.json'))
const raceSchema = loadJson(join(schemasDir, 'palladium-race.schema.json'))
const occSchema = loadJson(join(schemasDir, 'palladium-occ.schema.json'))
const weaponProficiencySchema = loadJson(
  join(schemasDir, 'palladium-weapon-proficiency.schema.json'),
)
const standardModernWeaponProgressionSchema = loadJson(
  join(schemasDir, 'standard-modern-weapon-progression.schema.json'),
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
  ['palladium-race.schema.json', raceSchema],
  ['palladium-weapon-proficiency.schema.json', weaponProficiencySchema],
  ['standard-modern-weapon-progression.schema.json', standardModernWeaponProgressionSchema],
  ['palladium-occ.schema.json', occSchema],
]) {
  try {
    ajv.compile(schema)
    console.log(`OK  ${label} — Ajv compile succeeded`)
  } catch (e) {
    failed = true
    console.error(`ERR ${label}`, e)
  }
}

const validateSkillRow = ajv.compile(skillSchema)
const validateWeaponProficiencyRow = ajv.compile(weaponProficiencySchema)
const validateProgressionDoc = ajv.compile(standardModernWeaponProgressionSchema)
const validateRaceRow = ajv.compile(raceSchema)
const validateOccRow = ajv.compile(occSchema)

const palladiumSkills = loadJson(join(contentDir, 'palladiumSkills.json'))
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

const weaponProficiencies = loadJson(join(contentDir, 'weapon_proficiencies.json'))
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

const progressionJson = loadJson(
  join(contentDir, 'standard_modern_weapon_progression.json'),
)
if (!validateProgressionDoc(progressionJson)) {
  failed = true
  console.error(
    'ERR standard_modern_weapon_progression.json:',
    validateProgressionDoc.errors,
  )
} else {
  console.log('OK  standard_modern_weapon_progression.json — document validates')
}

const palladiumRaces = loadJson(join(contentDir, 'palladiumRaces.json'))
if (!Array.isArray(palladiumRaces)) {
  failed = true
  console.error('ERR palladiumRaces.json — expected top-level array')
} else {
  let raceBad = 0
  for (const row of palladiumRaces) {
    if (!validateRaceRow(row)) {
      raceBad++
      if (raceBad <= 5) {
        console.error(
          `ERR palladiumRaces.json id=${row?.id ?? '?'}:`,
          validateRaceRow.errors,
        )
      }
    }
  }
  if (raceBad === 0) {
    console.log(`OK  palladiumRaces.json — ${palladiumRaces.length} rows validate`)
  } else {
    failed = true
    console.error(`ERR palladiumRaces.json — ${raceBad} row(s) failed schema validation`)
  }
}

const palladiumOccs = loadJson(join(contentDir, 'palladiumOccs.json'))
if (!Array.isArray(palladiumOccs)) {
  failed = true
  console.error('ERR palladiumOccs.json — expected top-level array')
} else {
  let occBad = 0
  for (const row of palladiumOccs) {
    if (!validateOccRow(row)) {
      occBad++
      if (occBad <= 5) {
        console.error(
          `ERR palladiumOccs.json id=${row?.id ?? '?'}:`,
          validateOccRow.errors,
        )
      }
    }
  }
  if (occBad === 0) {
    console.log(`OK  palladiumOccs.json — ${palladiumOccs.length} rows validate`)
  } else {
    failed = true
    console.error(`ERR palladiumOccs.json — ${occBad} row(s) failed schema validation`)
  }
}

if (failed) process.exit(1)
