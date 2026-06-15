/**
 * Chargen-focused audit for `src/data/content/palladiumTalents.json`.
 *
 * Run: npm run audit:talents
 * JSON report: npm run audit:talents -- --json reports/talent-audit.json
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(root, 'src/data/content')
const talentsPath = join(contentDir, 'palladiumTalents.json')
const morphusTablesDir = join(contentDir, 'morphus/tables')
const forgeDir = join(contentDir, 'morphus/forge')

const KNOWN_TOP_LEVEL_KEYS = new Set([
  '$schema',
  'id',
  'name',
  'description',
  'descriptionMorphus',
  'gameSystems',
  'sources',
  'talentTier',
  'tier',
  'tags',
  'ppe',
  'limitations',
  'ranges',
  'range',
  'duration',
  'areaOfEffect',
  'damage',
  'save',
  'combat',
  'resolutionTable',
  'permanentCosts',
  'spawnedPresence',
  'formTransformation',
  'materialComponents',
  'forgedOutputs',
  'prerequisites',
  'incompatibleTalentIds',
  'notes',
  'modifiers',
  'formRequirement',
  'activation',
  'durationType',
  'pumpable',
])

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function loadMorphusTableIds() {
  const ids = new Set(['characteristics', 'appearance'])
  for (const file of readdirSync(morphusTablesDir)) {
    if (!file.endsWith('.json')) continue
    const doc = loadJson(join(morphusTablesDir, file))
    if (doc?.id) ids.add(doc.id)
  }
  for (const file of readdirSync(forgeDir)) {
    if (!file.endsWith('.json')) continue
    const doc = loadJson(join(forgeDir, file))
    if (doc?.id) ids.add(doc.id)
  }
  return ids
}

function readStructuredMorphusTableIds(talent) {
  const pre = talent.prerequisites
  if (pre && !Array.isArray(pre) && Array.isArray(pre.morphusTableIds)) {
    return pre.morphusTableIds
  }
  return []
}

function readProseMorphusPrerequisites(talent) {
  const block = talent.limitations?.morphusTablePrerequisites
  if (!Array.isArray(block)) return []
  return block.filter((line) => typeof line === 'string' && line.trim())
}

function minimumTalentLevel(talent) {
  let min = talent.limitations?.minimumCharacterLevelToAcquire ?? 1
  const pre = talent.prerequisites
  if (Array.isArray(pre)) {
    for (const row of pre) {
      if (row?.type === 'level_minimum' && typeof row.level === 'number') {
        min = Math.max(min, row.level)
      }
    }
  }
  return min
}

function tierOf(talent) {
  return talent.talentTier ?? talent.tier ?? null
}

function issue(severity, code, talent, detail, fix) {
  return { severity, code, id: talent.id, name: talent.name, detail, fix }
}

function auditTalents(talents, morphusTableIds) {
  const issues = []
  const extensionFieldCounts = new Map()

  for (const talent of talents) {
    if (!talent.ppe) {
      issues.push(
        issue(
          'critical',
          'missing_ppe',
          talent,
          'No `ppe` block — acquire/activation costs cannot display in chargen.',
          'Add `ppe.permanentBurnToAcquire` and `ppe.baseActivation` from the rulebook entry.',
        ),
      )
    } else {
      if (talent.ppe.permanentBurnToAcquire == null) {
        issues.push(
          issue(
            'warning',
            'missing_ppe_acquire',
            talent,
            '`ppe` present but `permanentBurnToAcquire` is missing.',
            'Set permanent P.P.E. burn to acquire.',
          ),
        )
      }
      if (talent.ppe.baseActivation == null) {
        issues.push(
          issue(
            'warning',
            'missing_ppe_activation',
            talent,
            '`ppe` present but `baseActivation` is missing.',
            'Set activation P.P.E. cost.',
          ),
        )
      }
    }

    if (!tierOf(talent)) {
      issues.push(
        issue(
          'critical',
          'missing_tier',
          talent,
          'No `talentTier` or `tier` — talent will not appear in Common/Elite columns.',
          'Set `talentTier` to `common` or `elite`.',
        ),
      )
    } else if (!['common', 'elite'].includes(tierOf(talent))) {
      issues.push(
        issue(
          'warning',
          'non_binary_tier',
          talent,
          `Tier \`${tierOf(talent)}\` is not mapped to Common/Elite UI buckets.`,
          'Use `common` or `elite`, or extend runtime tier mapping.',
        ),
      )
    }

    const structuredMorphus = readStructuredMorphusTableIds(talent)
    const proseMorphus = readProseMorphusPrerequisites(talent)

    for (const tableId of structuredMorphus) {
      if (!morphusTableIds.has(tableId)) {
        issues.push(
          issue(
            'critical',
            'invalid_morphus_table_id',
            talent,
            `prerequisites.morphusTableIds references unknown table \`${tableId}\`.`,
            'Replace with a valid morphus table id from `morphus/tables/` or forge routing.',
          ),
        )
      }
    }

    if (proseMorphus.length > 0 && structuredMorphus.length === 0) {
      issues.push(
        issue(
          'warning',
          'prose_morphus_gate',
          talent,
          `Prose-only Morphus gate: ${proseMorphus.join(' ')}`,
          'Add structured `prerequisites.morphusTableIds` for auto-gating; keep prose in `notes` if helpful.',
        ),
      )
    }

    if (proseMorphus.length > 0 && structuredMorphus.length > 0) {
      issues.push(
        issue(
          'info',
          'redundant_prose_morphus_gate',
          talent,
          `Both prose and structured Morphus gates present (prose: ${proseMorphus.join(' ')}; tables: ${structuredMorphus.join(', ')}).`,
          'Remove `limitations.morphusTablePrerequisites` if structured ids are authoritative.',
        ),
      )
    }

    if (talent.limitations?.minimumCharacterLevelToAcquire == null && minimumTalentLevel(talent) === 1) {
      issues.push(
        issue(
          'info',
          'implicit_level_one',
          talent,
          'No explicit `minimumCharacterLevelToAcquire` (defaults to level 1).',
          'Confirm rulebook level and set explicitly when not 1st level.',
        ),
      )
    }

    const hasMechanics =
      Boolean(talent.ppe) ||
      Boolean(talent.limitations) ||
      Boolean(talent.ranges?.length) ||
      Boolean(talent.duration) ||
      Boolean(talent.prerequisites)

    if (!hasMechanics && (talent.description?.length ?? 0) < 200) {
      issues.push(
        issue(
          'warning',
          'likely_stub_row',
          talent,
          'Short description and no P.P.E./limitations/prerequisites — row may be a placeholder.',
          'Ingest full rulebook mechanics or mark as draft in `notes`.',
        ),
      )
    }

    for (const key of Object.keys(talent)) {
      if (KNOWN_TOP_LEVEL_KEYS.has(key)) continue
      extensionFieldCounts.set(key, (extensionFieldCounts.get(key) ?? 0) + 1)
    }
  }

  const bySeverity = {
    critical: issues.filter((i) => i.severity === 'critical'),
    warning: issues.filter((i) => i.severity === 'warning'),
    info: issues.filter((i) => i.severity === 'info'),
  }

  const byCode = new Map()
  for (const row of issues) {
    if (!byCode.has(row.code)) byCode.set(row.code, [])
    byCode.get(row.code).push(row)
  }

  return {
    summary: {
      totalTalents: talents.length,
      issueCount: issues.length,
      critical: bySeverity.critical.length,
      warning: bySeverity.warning.length,
      info: bySeverity.info.length,
      extensionFieldKinds: extensionFieldCounts.size,
    },
    fixList: {
      missing_ppe: byCode.get('missing_ppe') ?? [],
      missing_tier: byCode.get('missing_tier') ?? [],
      prose_morphus_gate: byCode.get('prose_morphus_gate') ?? [],
      invalid_morphus_table_id: byCode.get('invalid_morphus_table_id') ?? [],
      likely_stub_row: byCode.get('likely_stub_row') ?? [],
    },
    extensionFields: [...extensionFieldCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => ({ field, count })),
    issues,
  }
}

function printReport(report) {
  const { summary, fixList } = report
  console.log(`Talent catalog audit — ${summary.totalTalents} rows`)
  console.log(
    `Issues: ${summary.issueCount} (${summary.critical} critical, ${summary.warning} warning, ${summary.info} info)`,
  )
  console.log('')

  const sections = [
    ['CRITICAL — missing P.P.E.', fixList.missing_ppe],
    ['CRITICAL — missing tier', fixList.missing_tier],
    ['CRITICAL — invalid morphus table id', fixList.invalid_morphus_table_id],
    ['WARNING — prose-only Morphus gate', fixList.prose_morphus_gate],
    ['WARNING — likely stub rows', fixList.likely_stub_row],
  ]

  for (const [heading, rows] of sections) {
    if (rows.length === 0) continue
    console.log(heading)
    for (const row of rows) {
      console.log(`  • ${row.id} — ${row.name}`)
      console.log(`    ${row.detail}`)
      console.log(`    Fix: ${row.fix}`)
    }
    console.log('')
  }

  if (report.extensionFields.length > 0) {
    console.log('Extension fields (authoring-only until runtime consumes them):')
    for (const { field, count } of report.extensionFields.slice(0, 12)) {
      console.log(`  • ${field} (${count})`)
    }
    if (report.extensionFields.length > 12) {
      console.log(`  … and ${report.extensionFields.length - 12} more`)
    }
    console.log('')
  }
}

const talents = loadJson(talentsPath)
if (!Array.isArray(talents)) {
  console.error('ERR palladiumTalents.json — expected top-level array')
  process.exit(1)
}

const morphusTableIds = loadMorphusTableIds()
const report = auditTalents(talents, morphusTableIds)
printReport(report)

const jsonArgIndex = process.argv.indexOf('--json')
if (jsonArgIndex >= 0) {
  const outPath = process.argv[jsonArgIndex + 1] ?? join(root, 'reports/talent-audit.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outPath}`)
}

process.exit(report.summary.critical > 0 ? 1 : 0)
