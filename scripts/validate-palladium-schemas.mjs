/**
 * Ensures bundled Palladium JSON Schemas (draft 2020-12) compile under Ajv.
 * Run: npm run validate:schemas
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { loadSkillsFromDir } from './lib/skills-catalog-fs.mjs'
import {
  expectedPsionicCategoryFile,
  loadPsionicsFromDir,
} from './lib/psionics-catalog-fs.mjs'

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
const psionicSchema = loadJson(join(schemasDir, 'palladium-psionic.schema.json'))
const featureCommonSchema = loadJson(
  join(schemasDir, 'palladium-feature-common.schema.json'),
)
const magicSchema = loadJson(join(schemasDir, 'palladium-magic.schema.json'))
const morphusCharacteristicSchema = loadJson(
  join(schemasDir, 'palladium-morphus.schema.json'),
)
const morphusTableSchema = loadJson(
  join(schemasDir, 'palladium-morphus-table.schema.json'),
)
const morphusForgeRoutingSchema = loadJson(
  join(schemasDir, 'palladium-morphus-forge-routing.schema.json'),
)
const xpTableSchema = loadJson(join(schemasDir, 'palladium-xp-table.schema.json'))
const xpTableBookSchema = loadJson(join(schemasDir, 'palladium-xp-table-book.schema.json'))
const encounterArchetypeSchema = loadJson(
  join(schemasDir, 'palladium-encounter-archetype.schema.json'),
)
const morphusDescriptionLeakRe =
  /\b(?:Talent Manifestations|New Common Talents|Appendix Talents|Common Talents from Nightbane|Elite Talents from Nightbane)\b/i

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)
ajv.addSchema(featureCommonSchema)
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
  ['palladium-psionic.schema.json', psionicSchema],
  ['palladium-feature-common.schema.json', featureCommonSchema],
  ['palladium-magic.schema.json', magicSchema],
  ['palladium-morphus.schema.json', morphusCharacteristicSchema],
  ['palladium-morphus-table.schema.json', morphusTableSchema],
  ['palladium-morphus-forge-routing.schema.json', morphusForgeRoutingSchema],
  ['palladium-xp-table.schema.json', xpTableSchema],
  ['palladium-xp-table-book.schema.json', xpTableBookSchema],
  ['palladium-encounter-archetype.schema.json', encounterArchetypeSchema],
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
const validatePsionicRow = ajv.compile(psionicSchema)
const validateMagicRow = ajv.compile(magicSchema)
const validateMorphusCharacteristic = ajv.compile(morphusCharacteristicSchema)
const validateMorphusTableDoc = ajv.compile(morphusTableSchema)
const validateMorphusForgeRoutingDoc = ajv.compile(morphusForgeRoutingSchema)
const validateXpTableDoc = ajv.compile(xpTableSchema)
const validateXpTableBookDoc = ajv.compile(xpTableBookSchema)
const validateEncounterArchetypeRow = ajv.compile(encounterArchetypeSchema)

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

  const traitRegistry = loadJson(join(skillsDir, 'utils/skill_trait_registry.json'))
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

const weaponProficiencies = loadJson(join(skillsDir, 'weapon_proficiencies.json'))
if (!Array.isArray(weaponProficiencies)) {
  failed = true
  console.error('ERR skills/weapon_proficiencies.json — expected top-level array')
} else {
  let bad = 0
  for (const row of weaponProficiencies) {
    if (!validateWeaponProficiencyRow(row)) {
      bad++
      if (bad <= 5) {
        console.error(
          `ERR skills/weapon_proficiencies.json id=${row?.id ?? '?'}:`,
          validateWeaponProficiencyRow.errors,
        )
      }
    }
  }
  if (bad === 0) {
    console.log(
      `OK  skills/weapon_proficiencies.json — ${weaponProficiencies.length} rows validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR skills/weapon_proficiencies.json — ${bad} row(s) failed schema validation`,
    )
  }
}

const progressionJson = loadJson(
  join(skillsDir, 'utils/standard_modern_weapon_progression.json'),
)
if (!validateProgressionDoc(progressionJson)) {
  failed = true
  console.error(
    'ERR skills/utils/standard_modern_weapon_progression.json:',
    validateProgressionDoc.errors,
  )
} else {
  console.log('OK  skills/utils/standard_modern_weapon_progression.json — document validates')
}

const racesDir = join(contentDir, 'races')
const RACE_POOL_FILES = ['player.json', 'npc.json', 'gm_approval.json', 'creatures.json']
const POOL_AUDIENCE = {
  'player.json': 'player',
  'npc.json': 'npc',
  'gm_approval.json': 'gm_approval',
  'creatures.json': 'creature',
}
let raceTotal = 0
const raceKeys = new Set()
const allRaceIds = new Set()
try {
  const genreDirs = readdirSync(racesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  for (const genre of genreDirs) {
    const genrePath = join(racesDir, genre)
    for (const file of RACE_POOL_FILES) {
      const poolPath = join(genrePath, file)
      if (!existsSync(poolPath)) continue
      const rows = loadJson(poolPath)
      if (!Array.isArray(rows)) {
        failed = true
        console.error(`ERR races/${genre}/${file} — expected top-level array`)
        continue
      }
      const expectedAudience = POOL_AUDIENCE[file]
      let raceBad = 0
      for (const row of rows) {
        if (row?.id) {
          const key = `${genre}:${row.id}`
          if (raceKeys.has(key)) {
            failed = true
            console.error(
              `ERR races/${genre}/${file} — duplicate id "${row.id}" in genre`,
            )
          }
          raceKeys.add(key)
          allRaceIds.add(row.id)
        }
        const systems = row?.gameSystems ?? []
        if (
          systems.length &&
          !systems.every((g) => String(g).toLowerCase() === genre.toLowerCase())
        ) {
          failed = true
          console.error(
            `ERR races/${genre}/${file} id=${row?.id ?? '?'}: gameSystems must match folder "${genre}"`,
          )
        }
        if (row?.raceAudience && row.raceAudience !== expectedAudience) {
          failed = true
          console.error(
            `ERR races/${genre}/${file} id=${row?.id ?? '?'}: raceAudience "${row.raceAudience}" must match pool "${expectedAudience}"`,
          )
        }
        if (expectedAudience === 'creature') {
          if (row?.raceComposition !== 'creature') {
            failed = true
            console.error(
              `ERR races/${genre}/${file} id=${row?.id ?? '?'}: creatures.json rows must set raceComposition "creature"`,
            )
          }
          if (row?.canPickOcc !== false) {
            failed = true
            console.error(
              `ERR races/${genre}/${file} id=${row?.id ?? '?'}: creature rows must set canPickOcc false`,
            )
          }
          if (row?.forcedOccId) {
            failed = true
            console.error(
              `ERR races/${genre}/${file} id=${row?.id ?? '?'}: creature rows must not set forcedOccId`,
            )
          }
        }
        if (row?.raceComposition === 'creature' && expectedAudience !== 'creature') {
          failed = true
          console.error(
            `ERR races/${genre}/${file} id=${row?.id ?? '?'}: raceComposition "creature" belongs in creatures.json`,
          )
        }
        if (row?.raceComposition === 'rcc' && !row?.forcedOccId) {
          failed = true
          console.error(
            `ERR races/${genre}/${file} id=${row?.id ?? '?'}: raceComposition "rcc" requires forcedOccId`,
          )
        }
        if (row?.forcedOccId && row?.raceComposition === 'creature') {
          failed = true
          console.error(
            `ERR races/${genre}/${file} id=${row?.id ?? '?'}: creature rows cannot use forcedOccId`,
          )
        }
        if (!validateRaceRow(row)) {
          raceBad++
          if (raceBad <= 3) {
            console.error(
              `ERR races/${genre}/${file} id=${row?.id ?? '?'}:`,
              validateRaceRow.errors,
            )
          }
        }
      }
      raceTotal += rows.length
      if (raceBad > 0) {
        failed = true
        console.error(
          `ERR races/${genre}/${file} — ${raceBad} row(s) failed schema validation`,
        )
      } else {
        console.log(`OK  races/${genre}/${file} — ${rows.length} row(s) validate`)
      }
    }
  }
  if (!failed) {
    console.log(
      `OK  races — ${raceTotal} total row(s) across ${genreDirs.length} genre folder(s)`,
    )
  }
} catch (e) {
  failed = true
  console.error('ERR races — directory or pool file missing', e?.message ?? e)
}

const occsDir = join(contentDir, 'occs')
const palladiumOccs = []
let occBookFiles = []
try {
  const genreDirs = readdirSync(occsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  for (const genre of genreDirs) {
    const genrePath = join(occsDir, genre)
    const books = readdirSync(genrePath)
      .filter((f) => f.endsWith('.json'))
      .sort()
    for (const book of books) {
      occBookFiles.push({ genre, book, path: join(genrePath, book) })
    }
  }
} catch {
  console.error('ERR occs — directory missing')
  failed = true
}

if (occBookFiles.length > 0) {
  const occIdsSeen = new Set()
  let occBad = 0
  for (const { genre, book, path: bookPath } of occBookFiles) {
    const label = `occs/${genre}/${book}`
    const rows = loadJson(bookPath)
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
      `OK  occs — ${occBookFiles.length} book file(s) in ${new Set(occBookFiles.map((f) => f.genre)).size} genre folder(s), ${palladiumOccs.length} row(s) validate`,
    )
  } else {
    failed = true
    console.error(`ERR occs — ${occBad} validation error(s)`)
  }
}

const xpTablesDir = join(contentDir, 'progression/xp_tables')
const tableById = new Map()
let xpTableBookFiles = []
try {
  const genreDirs = readdirSync(xpTablesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  for (const genre of genreDirs) {
    const genrePath = join(xpTablesDir, genre)
    const books = readdirSync(genrePath)
      .filter((f) => f.endsWith('.json'))
      .sort()
    for (const book of books) {
      xpTableBookFiles.push({ genre, book, path: join(genrePath, book) })
    }
  }
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

if (xpTableBookFiles.length > 0) {
  let xpBad = 0
  let tableCount = 0
  for (const { genre, book, path: bookPath } of xpTableBookFiles) {
    const relPath = `progression/xp_tables/${genre}/${book}`
    const doc = loadJson(bookPath)
    if (doc?.tables && Array.isArray(doc.tables)) {
      if (!validateXpTableBookDoc(doc)) {
        xpBad++
        if (xpBad <= 5) {
          console.error(`ERR ${relPath}:`, validateXpTableBookDoc.errors)
        }
        continue
      }
      for (const table of doc.tables) {
        tableCount++
        if (!validateXpTableRow(table, `${relPath} → ${table.id}`)) {
          xpBad++
        }
      }
    } else if (!validateXpTableRow(doc, relPath)) {
      xpBad++
    } else {
      tableCount++
    }
  }
  if (xpBad === 0) {
    console.log(
      `OK  progression/xp_tables — ${xpTableBookFiles.length} book file(s) in ${new Set(xpTableBookFiles.map((f) => f.genre)).size} genre folder(s), ${tableCount} table(s) validate`,
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

const palladiumHandToHand = loadJson(join(skillsDir, 'hand_to_hand.json'))
if (!Array.isArray(palladiumHandToHand)) {
  failed = true
  console.error('ERR skills/hand_to_hand.json — expected top-level array')
} else {
  let hthBad = 0
  for (const row of palladiumHandToHand) {
    if (!validateHandToHandRow(row)) {
      hthBad++
      if (hthBad <= 5) {
        console.error(
          `ERR skills/hand_to_hand.json id=${row?.id ?? '?'}:`,
          validateHandToHandRow.errors,
        )
      }
    }
  }
  if (hthBad === 0) {
    console.log(
      `OK  skills/hand_to_hand.json — ${palladiumHandToHand.length} rows validate`,
    )
  } else {
    failed = true
    console.error(
      `ERR skills/hand_to_hand.json — ${hthBad} row(s) failed schema validation`,
    )
  }
}

const encountersDir = join(contentDir, 'encounters')
let encounterBookFiles = []
try {
  const encounterGenreDirs = readdirSync(encountersDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  for (const genre of encounterGenreDirs) {
    const genrePath = join(encountersDir, genre)
    const books = readdirSync(genrePath)
      .filter((f) => f.endsWith('.json'))
      .sort()
    for (const book of books) {
      encounterBookFiles.push({ genre, book, path: join(genrePath, book) })
    }
  }
} catch {
  console.error('ERR encounters — directory missing')
  failed = true
}

if (encounterBookFiles.length > 0) {
  const hthIds = new Set(
    Array.isArray(palladiumHandToHand)
      ? palladiumHandToHand.map((row) => row?.id).filter(Boolean)
      : [],
  )
  const wpIds = new Set(
    Array.isArray(weaponProficiencies)
      ? weaponProficiencies.map((row) => row?.id).filter(Boolean)
      : [],
  )
  const occIds = new Set(
    Array.isArray(palladiumOccs) ? palladiumOccs.map((row) => row?.id).filter(Boolean) : [],
  )
  const encounterIdsSeen = new Set()
  let encounterBad = 0
  let encounterXrefBad = 0

  const checkEncounterRaceRef = (raceId, label, archetypeId) => {
    if (!raceId || allRaceIds.has(raceId)) return
    encounterXrefBad++
    if (encounterXrefBad <= 5) {
      console.error(`ERR ${label} id=${archetypeId}: unknown race ref "${raceId}"`)
    }
  }

  for (const { genre, book, path: bookPath } of encounterBookFiles) {
    const label = `encounters/${genre}/${book}`
    const rows = loadJson(bookPath)
    if (!Array.isArray(rows)) {
      failed = true
      console.error(`ERR ${label} — expected top-level array`)
      continue
    }
    for (const row of rows) {
      const archetypeId = row?.id ?? '?'
      if (row?.id) {
        if (encounterIdsSeen.has(row.id)) {
          encounterBad++
          if (encounterBad <= 5) {
            console.error(`ERR ${label} — duplicate encounter id "${row.id}"`)
          }
        } else {
          encounterIdsSeen.add(row.id)
        }
      }
      const systems = row?.gameSystems ?? []
      if (
        systems.length &&
        !systems.every((g) => String(g).toLowerCase() === genre.toLowerCase())
      ) {
        failed = true
        console.error(
          `ERR ${label} id=${archetypeId}: gameSystems must match folder "${genre}"`,
        )
      }
      if (!validateEncounterArchetypeRow(row)) {
        encounterBad++
        if (encounterBad <= 5) {
          console.error(`ERR ${label} id=${archetypeId}:`, validateEncounterArchetypeRow.errors)
        }
        continue
      }

      const composition = row.composition ?? {}
      checkEncounterRaceRef(composition.defaultBaseRaceId, label, archetypeId)
      checkEncounterRaceRef(composition.speciesBaselineRaceId, label, archetypeId)
      for (const raceId of composition.alternateBaseRaceIds ?? []) {
        checkEncounterRaceRef(raceId, label, archetypeId)
      }
      for (const raceId of row.relatedRaceIds ?? []) {
        checkEncounterRaceRef(raceId, label, archetypeId)
      }
      for (const variant of row.variants ?? []) {
        checkEncounterRaceRef(variant.baseRaceId, label, archetypeId)
      }
      for (const occId of row.relatedOccIds ?? []) {
        if (!occIds.has(occId)) {
          encounterXrefBad++
          if (encounterXrefBad <= 5) {
            console.error(`ERR ${label} id=${archetypeId}: unknown O.C.C. ref "${occId}"`)
          }
        }
      }
      const hthId = row.handToHand?.skillId
      if (hthId && !hthIds.has(hthId)) {
        encounterXrefBad++
        if (encounterXrefBad <= 5) {
          console.error(`ERR ${label} id=${archetypeId}: unknown H2H ref "${hthId}"`)
        }
      }
      for (const wp of row.weaponProficiencies ?? []) {
        const wpId = wp?.skillId
        if (wpId && !wpIds.has(wpId)) {
          encounterXrefBad++
          if (encounterXrefBad <= 5) {
            console.error(`ERR ${label} id=${archetypeId}: unknown W.P. ref "${wpId}"`)
          }
        }
      }
    }
  }

  if (encounterBad === 0) {
    console.log(
      `OK  encounters — ${encounterBookFiles.length} book file(s) in ${new Set(encounterBookFiles.map((f) => f.genre)).size} genre folder(s), ${encounterIdsSeen.size} row(s) validate`,
    )
  } else {
    failed = true
    console.error(`ERR encounters — ${encounterBad} row(s) failed schema or duplicate-id validation`)
  }
  if (encounterXrefBad === 0) {
    console.log('OK  encounters — race/O.C.C./H2H/W.P. cross-refs resolve')
  } else {
    failed = true
    console.error(`ERR encounters — ${encounterXrefBad} cross-ref mismatch(es)`)
  }
}

const talentsDir = join(contentDir, 'talents')
let talentFiles = []
try {
  talentFiles = readdirSync(talentsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR talents/ — directory missing')
  failed = true
}
if (talentFiles.length > 0) {
  const seenTalentIds = new Set()
  let talentBad = 0
  let talentDup = 0
  let talentTierMismatch = 0
  let talentTotal = 0
  for (const file of talentFiles) {
    const fileTier = file.replace(/\.json$/, '')
    const rows = loadJson(join(talentsDir, file))
    if (!Array.isArray(rows)) {
      failed = true
      console.error(`ERR talents/${file} — expected top-level array`)
      continue
    }
    talentTotal += rows.length
    for (const row of rows) {
      const id = row?.id
      const rowTier = row?.talentTier ?? row?.tier
      if (
        (fileTier === 'common' || fileTier === 'elite') &&
        rowTier &&
        rowTier !== fileTier
      ) {
        talentTierMismatch++
        if (talentTierMismatch <= 5) {
          console.error(
            `ERR talents/${file} id=${id ?? '?'}: talentTier "${rowTier}" does not match file "${fileTier}"`,
          )
        }
      }
      if (id) {
        if (seenTalentIds.has(id)) {
          talentDup++
          if (talentDup <= 5) {
            console.error(`ERR talents/${file} duplicate id=${id}`)
          }
        } else {
          seenTalentIds.add(id)
        }
      }
      if (!validateTalentRow(row)) {
        talentBad++
        if (talentBad <= 5) {
          console.error(
            `ERR talents/${file} id=${row?.id ?? '?'}:`,
            validateTalentRow.errors,
          )
        }
      }
    }
  }
  if (talentBad === 0 && talentDup === 0 && talentTierMismatch === 0) {
    console.log(
      `OK  talents/ — ${talentFiles.length} file(s), ${talentTotal} row(s) validate`,
    )
  } else {
    failed = true
    if (talentBad > 0) {
      console.error(`ERR talents/ — ${talentBad} row(s) failed schema validation`)
    }
    if (talentDup > 0) {
      console.error(`ERR talents/ — ${talentDup} duplicate id(s)`)
    }
    if (talentTierMismatch > 0) {
      console.error(`ERR talents/ — ${talentTierMismatch} tier/file mismatch(es)`)
    }
  }
}

const psionicsDir = join(contentDir, 'psionics')
let palladiumPsionics = []
let psionicCategoryMismatch = 0
try {
  const psionicFileById = new Map()
  for (const file of readdirSync(psionicsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    for (const row of loadJson(join(psionicsDir, file))) {
      if (row?.id) psionicFileById.set(row.id, file)
    }
  }
  palladiumPsionics = loadPsionicsFromDir(psionicsDir)
  for (const row of palladiumPsionics) {
    const actual = psionicFileById.get(row.id)
    const expected = expectedPsionicCategoryFile(row)
    if (actual && actual !== expected) {
      psionicCategoryMismatch++
      if (psionicCategoryMismatch <= 5) {
        console.error(
          `ERR psionics/${actual} id=${row.id}: expected file "${expected}" from genrePlacements[0].category`,
        )
      }
    }
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('ERR psionics/ — directory missing')
  } else {
    failed = true
    console.error('ERR psionics/ —', err.message)
  }
}
if (palladiumPsionics.length > 0) {
  const seenPsionicIds = new Set()
  let psionicBad = 0
  let psionicDup = 0
  for (const row of palladiumPsionics) {
    if (row?.id) {
      if (seenPsionicIds.has(row.id)) {
        psionicDup++
        if (psionicDup <= 5) {
          console.error(`ERR psionics/ duplicate id=${row.id}`)
        }
      } else {
        seenPsionicIds.add(row.id)
      }
    }
    if (!validatePsionicRow(row)) {
      psionicBad++
      if (psionicBad <= 5) {
        console.error(
          `ERR psionics/ id=${row?.id ?? '?'}:`,
          validatePsionicRow.errors,
        )
      }
    }
  }
  if (psionicBad === 0 && psionicDup === 0 && psionicCategoryMismatch === 0) {
    const categoryFiles = readdirSync(psionicsDir).filter((f) => f.endsWith('.json')).length
    console.log(
      `OK  psionics/ — ${categoryFiles} category file(s), ${palladiumPsionics.length} rows validate`,
    )
  } else {
    failed = true
    if (psionicBad > 0) {
      console.error(`ERR psionics/ — ${psionicBad} row(s) failed schema validation`)
    }
    if (psionicDup > 0) {
      console.error(`ERR psionics/ — ${psionicDup} duplicate id(s)`)
    }
    if (psionicCategoryMismatch > 0) {
      console.error(
        `ERR psionics/ — ${psionicCategoryMismatch} category file placement mismatch(es)`,
      )
    }
  }
} else if (!failed) {
  console.log('OK  psionics/ — empty catalog')
}

const trueVampirePowersPath = join(
  racesDir,
  'nightbane/utils/true_vampire_powers.json',
)
if (existsSync(trueVampirePowersPath)) {
  const doc = loadJson(trueVampirePowersPath)
  const psionicIds = new Set(palladiumPsionics.map((row) => row.id))
  let tvBad = 0
  if (doc?.id !== 'nightbane_true_vampire') {
    tvBad++
    console.error('ERR true_vampire_powers.json — id must be "nightbane_true_vampire"')
  }
  if (!Array.isArray(doc?.classAbilities) || doc.classAbilities.length < 1) {
    tvBad++
    console.error('ERR true_vampire_powers.json — classAbilities must be a non-empty array')
  } else {
    for (const entry of doc.classAbilities) {
      if (!entry?.name || !entry?.description) {
        tvBad++
        if (tvBad <= 5) {
          console.error(
            'ERR true_vampire_powers.json — classAbilities entry missing name or description',
          )
        }
      }
    }
  }
  if (!Array.isArray(doc?.psionicGrantIds) || doc.psionicGrantIds.length < 1) {
    tvBad++
    console.error('ERR true_vampire_powers.json — psionicGrantIds must be a non-empty array')
  } else {
    for (const pid of doc.psionicGrantIds) {
      if (!psionicIds.has(pid)) {
        tvBad++
        if (tvBad <= 5) {
          console.error(`ERR true_vampire_powers.json — unknown psionicGrantId "${pid}"`)
        }
      }
    }
  }
  if (tvBad === 0) {
    console.log(
      `OK  races/nightbane/utils/true_vampire_powers.json — ${doc.classAbilities.length} abilities, ${doc.psionicGrantIds.length} psionic grants`,
    )
  } else {
    failed = true
    console.error(`ERR true_vampire_powers.json — ${tvBad} issue(s)`)
  }
} else {
  failed = true
  console.error('ERR races/nightbane/utils/true_vampire_powers.json — file missing')
}

const magicDir = join(contentDir, 'magic')
let magicSchoolFiles = []
try {
  magicSchoolFiles = readdirSync(magicDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
} catch {
  console.error('ERR magic/ — directory missing')
  failed = true
}
if (magicSchoolFiles.length > 0) {
  const seenMagicIds = new Set()
  let magicBad = 0
  let magicDup = 0
  let magicIdPrefixBad = 0
  let magicTotal = 0
  for (const file of magicSchoolFiles) {
    const school = file.replace(/\.json$/, '')
    const expectedIdPrefix = `magic_${school}_`
    const rows = loadJson(join(magicDir, file))
    if (!Array.isArray(rows)) {
      failed = true
      console.error(`ERR magic/${file} — expected top-level array`)
      continue
    }
    magicTotal += rows.length
    for (const row of rows) {
      const id = row?.id
      if (typeof id === 'string' && !id.startsWith(expectedIdPrefix)) {
        magicIdPrefixBad++
        if (magicIdPrefixBad <= 5) {
          console.error(
            `ERR magic/${file} id=${id}: expected id prefix "${expectedIdPrefix}"`,
          )
        }
      }
      if (id) {
        if (seenMagicIds.has(id)) {
          magicDup++
          if (magicDup <= 5) {
            console.error(`ERR magic/${file} duplicate id=${id}`)
          }
        } else {
          seenMagicIds.add(id)
        }
      }
      if (!validateMagicRow(row)) {
        magicBad++
        if (magicBad <= 5) {
          console.error(`ERR magic/${file} id=${row?.id ?? '?'}:`, validateMagicRow.errors)
        }
      }
    }
  }
  if (magicBad === 0 && magicDup === 0 && magicIdPrefixBad === 0) {
    console.log(
      `OK  magic/ — ${magicSchoolFiles.length} school file(s), ${magicTotal} spell(s) validate`,
    )
  } else {
    failed = true
    if (magicBad > 0) {
      console.error(`ERR magic/ — ${magicBad} spell row(s) failed schema validation`)
    }
    if (magicDup > 0) {
      console.error(`ERR magic/ — ${magicDup} duplicate id(s)`)
    }
    if (magicIdPrefixBad > 0) {
      console.error(`ERR magic/ — ${magicIdPrefixBad} id prefix mismatch(es)`)
    }
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
  { prefix: 'palladium-psionic', compile: validatePsionicRow },
  { prefix: 'palladium-magic', compile: validateMagicRow },
  { prefix: 'palladium-morphus-table', compile: validateMorphusTableDoc },
  {
    prefix: 'palladium-morphus-characteristic',
    compile: validateMorphusCharacteristic,
  },
  {
    prefix: 'palladium-morphus-custom-trait-router',
    compile: validateMorphusCharacteristic,
  },
  {
    prefix: 'palladium-morphus-forge',
    compile: validateMorphusForgeRoutingDoc,
  },
  {
    prefix: 'palladium-weapon-proficiency',
    compile: validateWeaponProficiencyRow,
  },
  {
    prefix: 'palladium-encounter-archetype',
    compile: validateEncounterArchetypeRow,
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
