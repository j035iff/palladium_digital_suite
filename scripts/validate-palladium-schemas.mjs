/**
 * Ensures bundled Palladium JSON Schemas (draft 2020-12) compile under Ajv.
 * Run: npm run validate:schemas
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemasDir = join(root, 'src/data/schemas')
const contentDir = join(root, 'src/data/content')
const schemaExamplesDir = join(schemasDir, 'examples')

function loadJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'))
}

/** Example files may include `$schema` for editors; catalog schemas often forbid it on rows. */
function stripSchemaPointer(doc) {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) return doc
  if (!Object.prototype.hasOwnProperty.call(doc, '$schema')) return doc
  const { $schema: _s, ...rest } = doc
  return rest
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
const handToHandSchema = loadJson(join(schemasDir, 'palladium-hth.schema.json'))
const talentSchema = loadJson(join(schemasDir, 'palladium-talent.schema.json'))
const morphusCharacteristicSchema = loadJson(
  join(schemasDir, 'palladium-morphus.schema.json'),
)
const morphusTableSchema = loadJson(
  join(schemasDir, 'palladium-morphus-table.schema.json'),
)

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)
ajv.addSchema(morphusCharacteristicSchema)

let failed = false
for (const [label, schema] of [
  ['palladium-skill.schema.json', skillSchema],
  ['palladium-race.schema.json', raceSchema],
  ['palladium-weapon-proficiency.schema.json', weaponProficiencySchema],
  ['standard-modern-weapon-progression.schema.json', standardModernWeaponProgressionSchema],
  ['palladium-occ.schema.json', occSchema],
  ['palladium-hth.schema.json', handToHandSchema],
  ['palladium-talent.schema.json', talentSchema],
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

const validateSkillRow = ajv.compile(skillSchema)
const validateWeaponProficiencyRow = ajv.compile(weaponProficiencySchema)
const validateProgressionDoc = ajv.compile(standardModernWeaponProgressionSchema)
const validateRaceRow = ajv.compile(raceSchema)
const validateOccRow = ajv.compile(occSchema)
const validateHandToHandRow = ajv.compile(handToHandSchema)
const validateTalentRow = ajv.compile(talentSchema)
const validateMorphusCharacteristic = ajv.compile(morphusCharacteristicSchema)
const validateMorphusTableDoc = ajv.compile(morphusTableSchema)

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

  const traitRegistry = loadJson(join(contentDir, 'skill_trait_registry.json'))
  const knownTraits = new Set((traitRegistry.traits ?? []).map((t) => t.id))
  let traitBad = 0
  for (const row of palladiumSkills) {
    for (const tid of row.skillTraits ?? []) {
      if (!knownTraits.has(tid)) {
        traitBad++
        if (traitBad <= 5) {
          console.error(
            `ERR palladiumSkills.json id=${row.id}: unknown skillTraits "${tid}"`,
          )
        }
      }
    }
  }
  if (traitBad === 0) {
    const tagged = palladiumSkills.filter((r) => r.skillTraits?.length).length
    console.log(
      `OK  skillTraits — ${tagged} skills tagged; ids match skill_trait_registry.json`,
    )
  } else {
    failed = true
    console.error(`ERR skillTraits — ${traitBad} unknown trait id(s)`)
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

const palladiumHandToHand = loadJson(join(contentDir, 'palladiumHandToHand.json'))
if (!Array.isArray(palladiumHandToHand)) {
  failed = true
  console.error('ERR palladiumHandToHand.json — expected top-level array')
} else {
  let hthBad = 0
  for (const row of palladiumHandToHand) {
    if (!validateHandToHandRow(row)) {
      hthBad++
      if (hthBad <= 5) {
        console.error(
          `ERR palladiumHandToHand.json id=${row?.id ?? '?'}:`,
          validateHandToHandRow.errors,
        )
      }
    }
  }
  if (hthBad === 0) {
    console.log(
      `OK  palladiumHandToHand.json — ${palladiumHandToHand.length} rows validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR palladiumHandToHand.json — ${hthBad} row(s) failed schema validation`,
    )
  }
}

const palladiumTalents = loadJson(join(contentDir, 'palladiumTalents.json'))
if (!Array.isArray(palladiumTalents)) {
  failed = true
  console.error('ERR palladiumTalents.json — expected top-level array')
} else {
  let talentBad = 0
  for (const row of palladiumTalents) {
    if (!validateTalentRow(row)) {
      talentBad++
      if (talentBad <= 5) {
        console.error(
          `ERR palladiumTalents.json id=${row?.id ?? '?'}:`,
          validateTalentRow.errors,
        )
      }
    }
  }
  if (talentBad === 0) {
    console.log(
      `OK  palladiumTalents.json — ${palladiumTalents.length} rows validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR palladiumTalents.json — ${talentBad} row(s) failed schema validation`,
    )
  }
}

const morphusTablesDir = join(contentDir, 'morphus/tables')
let morphusTableFiles = []
try {
  morphusTableFiles = readdirSync(morphusTablesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR morphus/tables — directory missing')
  failed = true
}

if (morphusTableFiles.length > 0) {
  let morphusBad = 0
  for (const file of morphusTableFiles) {
    const doc = loadJson(join(morphusTablesDir, file))
    if (!validateMorphusTableDoc(doc)) {
      morphusBad++
      if (morphusBad <= 5) {
        console.error(
          `ERR morphus/tables/${file} id=${doc?.id ?? '?'}:`,
          validateMorphusTableDoc.errors,
        )
      }
    }
  }
  if (morphusBad === 0) {
    console.log(
      `OK  morphus/tables — ${morphusTableFiles.length} table file(s) validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR morphus/tables — ${morphusBad} file(s) failed schema validation`,
    )
  }
}

const exampleValidators = [
  { prefix: 'palladium-skill', compile: validateSkillRow },
  { prefix: 'palladium-race', compile: validateRaceRow },
  { prefix: 'palladium-occ', compile: validateOccRow },
  { prefix: 'palladium-hth', compile: validateHandToHandRow },
  { prefix: 'palladium-talent', compile: validateTalentRow },
  { prefix: 'palladium-morphus-table', compile: validateMorphusTableDoc },
  {
    prefix: 'palladium-morphus-characteristic',
    compile: validateMorphusCharacteristic,
  },
  {
    prefix: 'palladium-weapon-proficiency',
    compile: validateWeaponProficiencyRow,
  },
  {
    prefix: 'standard-modern-weapon-progression',
    compile: validateProgressionDoc,
  },
]

let exampleFiles = []
try {
  exampleFiles = readdirSync(schemaExamplesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR schemas/examples — directory missing')
  failed = true
}

if (exampleFiles.length > 0) {
  let exampleBad = 0
  for (const file of exampleFiles) {
    const doc = stripSchemaPointer(loadJson(join(schemaExamplesDir, file)))
    const rule = exampleValidators.find((v) => file.startsWith(v.prefix))
    if (!rule) {
      exampleBad++
      if (exampleBad <= 5) {
        console.error(`ERR schemas/examples/${file} — no validator mapping for filename prefix`)
      }
      continue
    }
    if (!rule.compile(doc)) {
      exampleBad++
      if (exampleBad <= 5) {
        console.error(`ERR schemas/examples/${file}:`, rule.compile.errors)
      }
    }
  }
  if (exampleBad === 0) {
    console.log(`OK  schemas/examples — ${exampleFiles.length} example(s) validate`)
  } else {
    failed = true
    console.error(`ERR schemas/examples — ${exampleBad} example(s) failed validation`)
  }
}

if (failed) process.exit(1)
