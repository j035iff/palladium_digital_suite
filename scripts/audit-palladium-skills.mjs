/**
 * Genre-agnostic audit for `src/data/content/skills/*.json`.
 *
 * Engine contract: `scripts/skill-engine-contract.mjs`
 *
 * Run: npm run audit:skills
 * JSON report: npm run audit:skills -- --json reports/skill-audit.json
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSkillsFromDir, primarySkillCategory, skillCategoryFileName } from './lib/skills-catalog-fs.mjs'
import {
  SKILL_ENGINE_CONTRACT,
  SCHEMA_TOP_LEVEL_KEYS,
  collectGrantSkillIds,
  collectPrerequisiteSkillIds,
  collectSynergySkillIds,
  hasCatalogProgression,
  hasPercentileProgression,
  isPassACatalogComplete,
  listPassBKeysPresent,
  listSchemaDriftKeys,
  loadSkillTraitRegistryIds,
  resolveCatalogSkillId,
  skillHasValidSources,
} from './skill-engine-contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = join(root, 'src/data/content/skills')

function issue(severity, code, skill, detail, fix) {
  return { severity, code, id: skill.id, name: skill.name, detail, fix }
}

function loadSkillsWithSourceFiles() {
  const skills = []
  const sourceFileById = new Map()
  for (const file of readdirSync(skillsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const rows = JSON.parse(readFileSync(join(skillsDir, file), 'utf8'))
    if (!Array.isArray(rows)) {
      throw new Error(`skills/${file} — expected top-level array`)
    }
    for (const row of rows) {
      if (!row?.id) continue
      if (sourceFileById.has(row.id)) {
        throw new Error(
          `Duplicate skill id "${row.id}" in ${file} and ${sourceFileById.get(row.id)}`,
        )
      }
      sourceFileById.set(row.id, file)
      skills.push(row)
    }
  }
  return { skills, sourceFileById }
}

function auditSkills(skills, sourceFileById, knownTraits) {
  const catalogIds = new Set(skills.map((s) => s.id))
  const issues = []
  let passAComplete = 0
  let passBPresent = 0

  for (const skill of skills) {
    if (isPassACatalogComplete(skill)) passAComplete++
    if (listPassBKeysPresent(skill).length > 0) passBPresent++

    for (const key of listSchemaDriftKeys(skill)) {
      issues.push(
        issue(
          'critical',
          'schema_drift',
          skill,
          `Undocumented top-level key \`${key}\` — not in skill engine contract / schema.`,
          'Add to `palladium-skill.schema.json` + `skill-engine-contract.mjs`, or remove the key.',
        ),
      )
    }

    if (!skill.id?.startsWith('skill_')) {
      issues.push(
        issue(
          'critical',
          'invalid_skill_id',
          skill,
          `\`id\` must use the \`skill_\` prefix (got \`${skill.id}\`).`,
          'Rename to `skill_snake_case_name`.',
        ),
      )
    }

    const sourceFile = sourceFileById.get(skill.id)
    const expectedFile = skillCategoryFileName(primarySkillCategory(skill))
    if (sourceFile && sourceFile !== expectedFile) {
      issues.push(
        issue(
          'warning',
          'category_file_mismatch',
          skill,
          `Row is in \`${sourceFile}\` but \`categories[0]\` is "${skill.categories?.[0]}" → expected \`${expectedFile}\`.`,
          'Run `npm run split:skills` or move the row to the correct category file.',
        ),
      )
    }

    if (!isPassACatalogComplete(skill)) {
      const missing = []
      if (!skill.id || !skill.name || !skill.description) missing.push('identity')
      if (!Array.isArray(skill.categories) || skill.categories.length === 0) {
        missing.push('categories')
      }
      if (!Array.isArray(skill.synergies)) missing.push('synergies[]')
      if (!Array.isArray(skill.prerequisites)) missing.push('prerequisites[]')
      if (!skillHasValidSources(skill)) missing.push('sources (reference + pageNumber)')
      if (!hasCatalogProgression(skill)) missing.push('progression (% / subSkills / physical / synergy-only)')
      issues.push(
        issue(
          'critical',
          'pass_a_incomplete',
          skill,
          `Pass A catalog contract incomplete — missing: ${missing.join(', ')}.`,
          'Ingest Pass A: identity, categories, sources, prerequisites/synergies arrays, and progression.',
        ),
      )
    }

    if (
      skill.requiresSpecialization &&
      (!skill.specialization || !skill.specialization.kind || !skill.specialization.prompt)
    ) {
      issues.push(
        issue(
          'warning',
          'specialization_incomplete',
          skill,
          '`requiresSpecialization` is true but `specialization` is missing or incomplete.',
          'Add `specialization.kind`, `specialization.prompt`, and `allowsMultipleInstances` when applicable.',
        ),
      )
    }

    if (skill.replaces && !catalogIds.has(skill.replaces)) {
      issues.push(
        issue(
          'warning',
          'replaces_missing_target',
          skill,
          `\`replaces\` points to unknown id \`${skill.replaces}\`.`,
          'Keep the replaced row until migration completes, or remove `replaces`.',
        ),
      )
    }

    const refChecks = [
      ...collectPrerequisiteSkillIds(skill.prerequisites),
      ...collectSynergySkillIds(skill),
      ...collectGrantSkillIds(skill),
    ]
    for (const refId of refChecks) {
      if (!resolveCatalogSkillId(refId, catalogIds)) {
        issues.push(
          issue(
            'critical',
            'invalid_skill_reference',
            skill,
            `References unknown catalog skill id \`${refId}\`.`,
            'Fix the id or add the missing skill row to the catalog.',
          ),
        )
      }
    }

    for (const traitId of skill.skillTraits ?? []) {
      if (!knownTraits.has(traitId)) {
        issues.push(
          issue(
            'critical',
            'unknown_skill_trait',
            skill,
            `Unknown \`skillTraits\` id \`${traitId}\`.`,
            'Add to `skill_trait_registry.json` + trait list file; run `npm run apply:skill-traits`.',
          ),
        )
      }
    }

    if (
      Array.isArray(skill.gameSystems) &&
      skill.gameSystems.length === 0 &&
      isPassACatalogComplete(skill)
    ) {
      issues.push(
        issue(
          'info',
          'generic_game_systems',
          skill,
          '`gameSystems` is empty (generic Megaversal / unspecified scope).',
          'Set explicit genre slugs when the skill is setting-specific.',
        ),
      )
    }

    if (
      !hasPercentileProgression(skill) &&
      hasCatalogProgression(skill) &&
      !/no base percent/i.test(skill.description ?? '') &&
      skill.physicalSkillBonuses
    ) {
      issues.push(
        issue(
          'info',
          'physical_training_skill',
          skill,
          'Physical-training skill without self percentile (Pass B `physicalSkillBonuses`).',
          'Confirm book has no base %; Pass A complete via physical progression.',
        ),
      )
    }

    if (
      (skill.description?.length ?? 0) < 80 &&
      !hasCatalogProgression(skill) &&
      (skill.synergies?.length ?? 0) === 0
    ) {
      issues.push(
        issue(
          'warning',
          'likely_stub_row',
          skill,
          'Short description and no progression blocks — row may be a placeholder.',
          'Complete Pass A ingest from the rulebook before Pass B mechanics.',
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
    contract: SKILL_ENGINE_CONTRACT,
    summary: {
      totalSkills: skills.length,
      passACatalogComplete: passAComplete,
      passBMechanicalPresent: passBPresent,
      schemaTopLevelKeyCount: SCHEMA_TOP_LEVEL_KEYS.size,
      issueCount: issues.length,
      critical: bySeverity.critical.length,
      warning: bySeverity.warning.length,
      info: bySeverity.info.length,
    },
    fixList: {
      schema_drift: byCode.get('schema_drift') ?? [],
      pass_a_incomplete: byCode.get('pass_a_incomplete') ?? [],
      invalid_skill_reference: byCode.get('invalid_skill_reference') ?? [],
      category_file_mismatch: byCode.get('category_file_mismatch') ?? [],
      unknown_skill_trait: byCode.get('unknown_skill_trait') ?? [],
      likely_stub_row: byCode.get('likely_stub_row') ?? [],
    },
    issues,
  }
}

function printReport(report) {
  const { summary, fixList } = report
  console.log(`Skill catalog audit — ${summary.totalSkills} rows`)
  console.log(
    `Pass A catalog-complete: ${summary.passACatalogComplete}/${summary.totalSkills} · Pass B blocks: ${summary.passBMechanicalPresent} rows`,
  )
  console.log(
    `Issues: ${summary.issueCount} (${summary.critical} critical, ${summary.warning} warning, ${summary.info} info)`,
  )
  console.log('')

  const sections = [
    ['CRITICAL — schema drift', fixList.schema_drift],
    ['CRITICAL — Pass A incomplete', fixList.pass_a_incomplete.slice(0, 15)],
    ['CRITICAL — invalid skill reference', fixList.invalid_skill_reference.slice(0, 15)],
    ['CRITICAL — unknown skill trait', fixList.unknown_skill_trait],
    ['WARNING — category file mismatch', fixList.category_file_mismatch.slice(0, 10)],
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
    if (heading.includes('Pass A incomplete') && fixList.pass_a_incomplete.length > 15) {
      console.log(`  … and ${fixList.pass_a_incomplete.length - 15} more Pass A incomplete rows`)
    }
    if (
      heading.includes('invalid skill reference') &&
      fixList.invalid_skill_reference.length > 15
    ) {
      console.log(
        `  … and ${fixList.invalid_skill_reference.length - 15} more invalid references`,
      )
    }
    console.log('')
  }

  console.log(
    'Ingest guidance: Pass A = catalog (6/batch) · Pass B = mechanics (3–4/batch) — `docs/ingest/skills.md`',
  )
  console.log('')
}

const { skills, sourceFileById } = loadSkillsWithSourceFiles()
if (skills.length === 0) {
  console.error('ERR skills/ — no skill rows loaded')
  process.exit(1)
}

const knownTraits = loadSkillTraitRegistryIds()
const report = auditSkills(skills, sourceFileById, knownTraits)
printReport(report)

const jsonArgIndex = process.argv.indexOf('--json')
if (jsonArgIndex >= 0) {
  const outPath = process.argv[jsonArgIndex + 1] ?? join(root, 'reports/skill-audit.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outPath}`)
}

process.exit(report.summary.critical > 0 ? 1 : 0)
