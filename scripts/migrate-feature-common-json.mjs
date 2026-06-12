/**
 * Migrates legacy `summonedEntity` and array `resolutionTable` rows to the
 * palladium-feature-common structure (`spawnedPresence`, structured resolutionTable).
 *
 * Run: node scripts/migrate-feature-common-json.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const RESOLUTION_TABLE_CONTEXT = {
  psionic_astral_projection: {
    label: 'Return to physical body accuracy',
    resolutionTrigger: { when: 'on_duration_end', rollKind: 'd100' },
  },
  psionic_total_recall: {
    label: 'Recall clarity when I.S.P. is exhausted',
    resolutionTrigger: { when: 'on_duration_end', rollKind: 'd100' },
  },
  psionic_psychic_surgery: {
    label: 'Coma recovery success',
    resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
  },
  psionic_dreamdance_minor: {
    label: 'Find Dream Pool success',
    resolutionTrigger: { when: 'on_cast', rollKind: 'd100' },
  },
}

function parseRollRangeToPercentile(rollRange) {
  const match = String(rollRange).trim().match(/^(\d+)-(\d+|00)$/)
  if (!match) return null
  return {
    min: Number.parseInt(match[1], 10),
    max: match[2] === '00' ? 100 : Number.parseInt(match[2], 10),
  }
}

function migrateResolutionTableEntry(entry) {
  if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return entry
  const migrated = { ...entry }
  if (migrated.rollRange && !migrated.percentile) {
    const percentile = parseRollRangeToPercentile(migrated.rollRange)
    if (percentile) {
      migrated.percentile = percentile
      delete migrated.rollRange
    }
  }
  if (migrated.followUpTable) {
    migrated.followUpTable = migrateResolutionTable(migrated.followUpTable)
  }
  return migrated
}

function migrateResolutionTable(table, context = {}) {
  if (table == null) return table
  if (Array.isArray(table)) {
    return {
      rollKind: context.rollKind ?? 'd100',
      ...(context.label ? { label: context.label } : {}),
      ...(context.resolutionTrigger
        ? { resolutionTrigger: context.resolutionTrigger }
        : {}),
      entries: table.map(migrateResolutionTableEntry),
    }
  }
  if (typeof table === 'object' && Array.isArray(table.entries)) {
    return {
      ...table,
      entries: table.entries.map(migrateResolutionTableEntry),
      ...(table.followUpTable
        ? { followUpTable: migrateResolutionTable(table.followUpTable) }
        : {}),
    }
  }
  return table
}

function migrateSummonedEntity(entity) {
  if (entity == null || typeof entity !== 'object') return entity
  if (entity.kind === 'construct' || entity.kind === 'creature') return entity
  return { kind: 'construct', ...entity }
}

function migrateRow(row) {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) return row

  if (row.summonedEntity) {
    row.spawnedPresence = migrateSummonedEntity(row.summonedEntity)
    delete row.summonedEntity
  } else if (row.spawnedPresence) {
    row.spawnedPresence = migrateSummonedEntity(row.spawnedPresence)
  }

  if (row.resolutionTable) {
    const context = RESOLUTION_TABLE_CONTEXT[row.id] ?? {}
    row.resolutionTable = migrateResolutionTable(row.resolutionTable, context)
  }

  if (Array.isArray(row.subAbilities)) {
    row.subAbilities = row.subAbilities.map((sub) => migrateRow({ ...sub }))
  }

  if (Array.isArray(row.effectProfiles)) {
    row.effectProfiles = row.effectProfiles.map((profile) => migrateRow({ ...profile }))
  }

  return row
}

function migrateJsonArrayFile(absPath) {
  const raw = readFileSync(absPath, 'utf8')
  const rows = JSON.parse(raw)
  if (!Array.isArray(rows)) {
    throw new Error(`${absPath} is not a JSON array`)
  }
  const migrated = rows.map((row) => migrateRow({ ...row }))
  writeFileSync(absPath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
  return migrated.length
}

function migrateJsonObjectFile(absPath) {
  const raw = readFileSync(absPath, 'utf8')
  const doc = JSON.parse(raw)
  writeFileSync(absPath, `${JSON.stringify(migrateRow({ ...doc }), null, 2)}\n`, 'utf8')
}

const targets = [
  join(root, 'src/data/content/palladiumPsionics.json'),
  join(root, 'src/data/content/magic/wizard.json'),
  join(root, 'src/data/schemas/examples/palladium-psionic.example-mechanical.json'),
  join(root, 'src/data/schemas/examples/palladium-psionic.example-summoned.json'),
]

for (const path of targets) {
  if (path.endsWith('wizard.json') || path.includes('palladiumPsionics')) {
    const count = migrateJsonArrayFile(path)
    console.log(`OK  ${path} — ${count} row(s) migrated`)
  } else {
    migrateJsonObjectFile(path)
    console.log(`OK  ${path} — example migrated`)
  }
}
