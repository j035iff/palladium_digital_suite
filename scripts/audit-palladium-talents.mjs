/**
 * Chargen-focused audit for `src/data/content/talents/*.json`.
 *
 * Engine contract: `scripts/talent-engine-contract.mjs`
 *
 * Run: npm run audit:talents
 * JSON report: npm run audit:talents -- --json reports/talent-audit.json
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isTier1ChargenComplete,
  inferTalentUsableInNightbaneForm,
  listSchemaDriftKeys,
  listTier2KeysPresent,
  SCHEMA_TOP_LEVEL_KEYS,
  TALENT_ENGINE_CONTRACT,
} from './talent-engine-contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(root, 'src/data/content')
const talentsDir = join(contentDir, 'talents')
const morphusTablesDir = join(contentDir, 'morphus/tables')
const forgeDir = join(contentDir, 'morphus/forge')

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
  let tier1Complete = 0
  let tier2Present = 0

  for (const talent of talents) {
    if (isTier1ChargenComplete(talent)) tier1Complete++
    if (listTier2KeysPresent(talent).length > 0) tier2Present++

    const driftKeys = listSchemaDriftKeys(talent)
    for (const key of driftKeys) {
      issues.push(
        issue(
          'critical',
          'schema_drift',
          talent,
          `Undocumented top-level key \`${key}\` — not in talent engine contract / schema.`,
          'Add to `palladium-talent.schema.json` + `talent-engine-contract.mjs`, or rename to a Tier 2 block.',
        ),
      )
    }

    const inferredForm = inferTalentUsableInNightbaneForm(talent)
    const storedForm = talent.limitations?.usableInNightbaneForm
    if (storedForm != null && storedForm !== inferredForm) {
      issues.push(
        issue(
          'warning',
          'form_rule_mismatch',
          talent,
          `\`limitations.usableInNightbaneForm\` is \`${storedForm}\` but prose implies \`${inferredForm}\` (default: morphus_only).`,
          'Align stored form with catalog prose, or clarify Facade-use language in description/notes/limitations.',
        ),
      )
    }

    const formUsage = talent.limitations?.formUsage
    const storedScope = talent.limitations?.usableInNightbaneForm
    if (
      formUsage &&
      storedScope !== 'varies_by_scope' &&
      storedScope !== 'both_forms_note_special' &&
      !(storedScope === 'morphus_only' && formUsage.phases?.activation && !formUsage.phases?.ongoingUse)
    ) {
      issues.push(
        issue(
          'warning',
          'form_usage_scope_mismatch',
          talent,
          '`limitations.formUsage` is structured but `usableInNightbaneForm` should be `varies_by_scope` (or `morphus_only` when only an activation-phase rule applies).',
          'Set `usableInNightbaneForm` to match structured form rules.',
        ),
      )
    }
    if (
      (storedScope === 'varies_by_scope' || storedScope === 'both_forms_note_special') &&
      !formUsage
    ) {
      issues.push(
        issue(
          'info',
          'form_usage_missing',
          talent,
          '`usableInNightbaneForm` indicates varying form rules but `limitations.formUsage` is absent.',
          'Add structured `formUsage.byTarget` or `formUsage.phases` instead of form prose in `otherLimitations`.',
        ),
      )
    }

    if (!isTier1ChargenComplete(talent)) {
      const missing = []
      if (!tierOf(talent)) missing.push('tier')
      if (!talent.ppe) missing.push('ppe')
      else {
        if (talent.ppe.permanentBurnToAcquire == null) missing.push('ppe.permanentBurnToAcquire')
        if (talent.ppe.baseActivation == null) missing.push('ppe.baseActivation')
      }
      if (!(talent.sources ?? []).some((s) => String(s?.reference ?? '').toLowerCase().includes('dark designs'))) {
        missing.push('sources (Dark Designs)')
      }
      issues.push(
        issue(
          'critical',
          'tier1_incomplete',
          talent,
          `Tier 1 chargen contract incomplete — missing: ${missing.join(', ')}.`,
          'Ingest Pass A: mechanics from Dark Designs + verified sources before play-mechanics blocks.',
        ),
      )
    } else if (!talent.ppe) {
      // unreachable if isTier1ChargenComplete is accurate
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

    if (!['common', 'elite'].includes(tierOf(talent) ?? '') && tierOf(talent)) {
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
          `Both prose and structured Morphus gates (prose: ${proseMorphus.join(' ')}; tables: ${structuredMorphus.join(', ')}).`,
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
          'Ingest full Dark Designs mechanics (Pass A) before Tier 2 play blocks (Pass B).',
        ),
      )
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
    contract: TALENT_ENGINE_CONTRACT,
    summary: {
      totalTalents: talents.length,
      tier1ChargenComplete: tier1Complete,
      tier2PlayBlocksPresent: tier2Present,
      schemaTopLevelKeyCount: SCHEMA_TOP_LEVEL_KEYS.size,
      issueCount: issues.length,
      critical: bySeverity.critical.length,
      warning: bySeverity.warning.length,
      info: bySeverity.info.length,
    },
    fixList: {
      schema_drift: byCode.get('schema_drift') ?? [],
      tier1_incomplete: byCode.get('tier1_incomplete') ?? [],
      prose_morphus_gate: byCode.get('prose_morphus_gate') ?? [],
      invalid_morphus_table_id: byCode.get('invalid_morphus_table_id') ?? [],
      likely_stub_row: byCode.get('likely_stub_row') ?? [],
    },
    issues,
  }
}

function printReport(report) {
  const { summary, fixList } = report
  console.log(`Talent catalog audit — ${summary.totalTalents} rows`)
  console.log(
    `Tier 1 chargen-complete: ${summary.tier1ChargenComplete}/${summary.totalTalents} · Tier 2 blocks: ${summary.tier2PlayBlocksPresent} rows`,
  )
  console.log(
    `Issues: ${summary.issueCount} (${summary.critical} critical, ${summary.warning} warning, ${summary.info} info)`,
  )
  console.log('')

  const sections = [
    ['CRITICAL — schema drift (unknown keys)', fixList.schema_drift],
    ['CRITICAL — Tier 1 incomplete', fixList.tier1_incomplete.slice(0, 15)],
    ['CRITICAL — invalid morphus table id', fixList.invalid_morphus_table_id],
    ['WARNING — prose-only Morphus gate', fixList.prose_morphus_gate],
    ['WARNING — likely stub rows', fixList.likely_stub_row],
  ]

  for (const [heading, rows] of sections) {
    if (rows.length === 0) continue
    console.log(heading)
    const shown = heading.includes('Tier 1 incomplete') && fixList.tier1_incomplete.length > 15
      ? rows
      : rows
    for (const row of shown) {
      console.log(`  • ${row.id} — ${row.name}`)
      console.log(`    ${row.detail}`)
      console.log(`    Fix: ${row.fix}`)
    }
    if (heading.includes('Tier 1 incomplete') && fixList.tier1_incomplete.length > 15) {
      console.log(`  … and ${fixList.tier1_incomplete.length - 15} more Tier 1 incomplete rows`)
    }
    console.log('')
  }

  console.log('Ingest guidance: Pass A = Tier 1 (4/batch) · Pass B = Tier 2 play blocks (2–3/batch when schema extends)')
  console.log('')
}

function loadTalentsFromDir() {
  const rows = []
  for (const file of readdirSync(talentsDir).filter((f) => f.endsWith('.json')).sort()) {
    const doc = loadJson(join(talentsDir, file))
    if (!Array.isArray(doc)) {
      throw new Error(`talents/${file} — expected top-level array`)
    }
    rows.push(...doc)
  }
  return rows
}

const talents = loadTalentsFromDir()
if (!Array.isArray(talents) || talents.length === 0) {
  console.error('ERR talents/ — no talent rows loaded')
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
