/**
 * Ensures bundled Palladium JSON Schemas (draft 2020-12) compile under Ajv.
 * Run: npm run validate:schemas
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { loadSkillsFromDir } from './lib/skills-catalog-fs.mjs'

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
const xpTableSchema = loadJson(join(schemasDir, 'palladium-xp-table.schema.json'))
const xpTableBookSchema = loadJson(join(schemasDir, 'palladium-xp-table-book.schema.json'))
const morphusDescriptionLeakRe =
  /\b(?:Talent Manifestations|New Common Talents|Appendix Talents|Common Talents from Nightbane|Elite Talents from Nightbane)\b/i

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)
ajv.addSchema(morphusCharacteristicSchema)
ajv.addSchema(xpTableSchema)

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
  ['palladium-xp-table.schema.json', xpTableSchema],
  ['palladium-xp-table-book.schema.json', xpTableBookSchema],
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
const validateXpTableDoc = ajv.compile(xpTableSchema)
const validateXpTableBookDoc = ajv.compile(xpTableBookSchema)

const skillsDir = join(contentDir, 'skills')
let palladiumSkills
try {
  palladiumSkills = loadSkillsFromDir(skillsDir)
} catch (err) {
  failed = true
  console.error('ERR content/skills —', err.message)
  palladiumSkills = []
}
if (palladiumSkills.length > 0) {
  let bad = 0
  for (const row of palladiumSkills) {
    if (!validateSkillRow(row)) {
      bad++
      if (bad <= 5) {
        console.error(
          `ERR content/skills id=${row?.id ?? '?'}:`,
          validateSkillRow.errors,
        )
      }
    }
  }
  if (bad === 0) {
    console.log(`OK  content/skills — ${palladiumSkills.length} rows validate`)
  } else {
    failed = true
    console.error(`ERR content/skills — ${bad} row(s) failed schema validation`)
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
            `ERR content/skills id=${row.id}: unknown skillTraits "${tid}"`,
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

const racesDir = join(contentDir, 'races')
const RACE_POOL_FILES = ['player.json', 'npc.json', 'gm_approval.json']
const POOL_AUDIENCE = {
  'player.json': 'player',
  'npc.json': 'npc',
  'gm_approval.json': 'gm_approval',
}
let raceTotal = 0
const raceIds = new Set()
try {
  for (const file of RACE_POOL_FILES) {
    const poolPath = join(racesDir, file)
    const rows = loadJson(poolPath)
    if (!Array.isArray(rows)) {
      failed = true
      console.error(`ERR races/${file} — expected top-level array`)
      continue
    }
    const expectedAudience = POOL_AUDIENCE[file]
    let raceBad = 0
    for (const row of rows) {
      if (row?.id) {
        if (raceIds.has(row.id)) {
          failed = true
          console.error(`ERR races — duplicate id "${row.id}" (e.g. ${file})`)
        }
        raceIds.add(row.id)
      }
      if (row?.raceAudience && row.raceAudience !== expectedAudience) {
        failed = true
        console.error(
          `ERR races/${file} id=${row?.id ?? '?'}: raceAudience "${row.raceAudience}" must match pool "${expectedAudience}"`,
        )
      }
      if (!validateRaceRow(row)) {
        raceBad++
        if (raceBad <= 3) {
          console.error(
            `ERR races/${file} id=${row?.id ?? '?'}:`,
            validateRaceRow.errors,
          )
        }
      }
    }
    raceTotal += rows.length
    if (raceBad > 0) {
      failed = true
      console.error(`ERR races/${file} — ${raceBad} row(s) failed schema validation`)
    } else {
      console.log(`OK  races/${file} — ${rows.length} row(s) validate`)
    }
  }
  if (!failed) {
    console.log(`OK  races — ${raceTotal} total row(s) across ${RACE_POOL_FILES.length} pools`)
  }
} catch (e) {
  failed = true
  console.error('ERR races — directory or pool file missing', e?.message ?? e)
}

const occsDir = join(contentDir, 'occs')
const palladiumOccs = []
let occFiles = []
try {
  occFiles = readdirSync(occsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR occs — directory missing')
  failed = true
}

if (occFiles.length > 0) {
  const occIdsSeen = new Set()
  let occBad = 0
  for (const file of occFiles) {
    const label = `occs/${file}`
    const rows = loadJson(join(occsDir, file))
    if (!Array.isArray(rows)) {
      failed = true
      console.error(`ERR ${label} — expected top-level array`)
      continue
    }
    for (const row of rows) {
      if (row?.id) {
        if (occIdsSeen.has(row.id)) {
          occBad++
          if (occBad <= 5) {
            console.error(`ERR ${label} — duplicate O.C.C. id "${row.id}"`)
          }
        } else {
          occIdsSeen.add(row.id)
        }
      }
      if (!validateOccRow(row)) {
        occBad++
        if (occBad <= 5) {
          console.error(
            `ERR ${label} id=${row?.id ?? '?'}:`,
            validateOccRow.errors,
          )
        }
      } else {
        palladiumOccs.push(row)
      }
    }
  }
  if (occBad === 0) {
    console.log(
      `OK  occs — ${occFiles.length} book file(s), ${palladiumOccs.length} row(s) validate`,
    )
  } else {
    failed = true
    console.error(`ERR occs — ${occBad} validation error(s)`)
  }
}

const xpTablesDir = join(contentDir, 'progression/xp_tables')
const tableById = new Map()
let xpTableFiles = []
try {
  xpTableFiles = readdirSync(xpTablesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR progression/xp_tables — directory missing')
  failed = true
}

function validateXpTableRow(table, label) {
  if (!validateXpTableDoc(table)) {
    failed = true
    console.error(`ERR ${label} id=${table?.id ?? '?'}:`, validateXpTableDoc.errors)
    return false
  }
  const floors = table.floors ?? []
  if (floors[0] !== 0) {
    failed = true
    console.error(`ERR ${label} — floors[0] must be 0`)
  }
  for (let i = 1; i < floors.length; i++) {
    if (floors[i] <= floors[i - 1]) {
      failed = true
      console.error(
        `ERR ${label} — floors must be strictly increasing at index ${i}`,
      )
      break
    }
  }
  if (floors.length !== table.maxLevel) {
    failed = true
    console.error(
      `ERR ${label} — floors.length (${floors.length}) must equal maxLevel (${table.maxLevel})`,
    )
  }
  if (tableById.has(table.id)) {
    failed = true
    console.error(`ERR duplicate XP table id "${table.id}"`)
  } else {
    tableById.set(table.id, table)
  }
  return true
}

if (xpTableFiles.length > 0) {
  let xpBad = 0
  let tableCount = 0
  for (const file of xpTableFiles) {
    const doc = loadJson(join(xpTablesDir, file))
    if (doc?.tables && Array.isArray(doc.tables)) {
      if (!validateXpTableBookDoc(doc)) {
        xpBad++
        if (xpBad <= 5) {
          console.error(
            `ERR progression/xp_tables/${file}:`,
            validateXpTableBookDoc.errors,
          )
        }
        continue
      }
      for (const table of doc.tables) {
        tableCount++
        if (!validateXpTableRow(table, `progression/xp_tables/${file} → ${table.id}`)) {
          xpBad++
        }
      }
    } else if (!validateXpTableRow(doc, `progression/xp_tables/${file}`)) {
      xpBad++
    } else {
      tableCount++
    }
  }
  if (xpBad === 0) {
    console.log(
      `OK  progression/xp_tables — ${xpTableFiles.length} book file(s), ${tableCount} table(s) validate`,
    )
  } else {
    failed = true
    console.error(`ERR progression/xp_tables — ${xpBad} validation error(s)`)
  }
}

if (Array.isArray(palladiumOccs) && tableById.size > 0) {
  const occById = new Map(palladiumOccs.map((o) => [o.id, o]))

  let xrefBad = 0
  for (const row of palladiumOccs) {
    const tid = row?.progression?.xpTableId
    if (tid && !tableById.has(tid)) {
      xrefBad++
      if (xrefBad <= 5) {
        console.error(
          `ERR occs id=${row.id}: unknown progression.xpTableId "${tid}"`,
        )
      }
    }
  }

  for (const [tableId, doc] of tableById) {
    const occIds = doc.occIds ?? []
    for (const occId of occIds) {
      const occ = occById.get(occId)
      if (!occ) {
        xrefBad++
        if (xrefBad <= 5) {
          console.error(
            `ERR progression/xp_tables id=${tableId}: occIds lists unknown O.C.C. "${occId}"`,
          )
        }
        continue
      }
      if (occ.progression?.xpTableId !== tableId) {
        xrefBad++
        if (xrefBad <= 5) {
          console.error(
            `ERR ${occId}: progression.xpTableId is "${occ.progression?.xpTableId ?? '(none)'}" but listed on table "${tableId}"`,
          )
        }
      }
    }
    for (const occ of palladiumOccs) {
      if (occ.progression?.xpTableId !== tableId) continue
      if (!occIds.includes(occ.id)) {
        xrefBad++
        if (xrefBad <= 5) {
          console.error(
            `ERR ${occ.id}: progression.xpTableId "${tableId}" but missing from that table's occIds`,
          )
        }
      }
    }
  }

  if (xrefBad === 0) {
    console.log('OK  progression.xpTableId ↔ occIds — bidirectional catalog links')
  } else {
    failed = true
    console.error(`ERR progression XP links — ${xrefBad} mismatch(es)`)
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
  let leakBad = 0
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
  if (leakBad === 0) {
    console.log('OK  morphus/tables descriptions — no post-table prose leakage markers')
  } else {
    failed = true
    console.error(`ERR morphus/tables descriptions — ${leakBad} leaked description(s) found`)
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
