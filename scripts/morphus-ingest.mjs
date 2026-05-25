#!/usr/bin/env node
/**
 * Morphus table ingest pipeline (per content group).
 *
 * Workflow:
 *   1. init     — create manifest for table + book + target JSON
 *   2. extract  — PDF → extracted.txt + traits-index.json (needs pymupdf)
 *   3. scaffold — traits-index → entries.staging.json skeletons (+ sources pages)
 *   4. (you/agent transcribe mechanics into entries.staging.json vs schema)
 *   5. report   — validate staging/target, schema key audit, book index diff
 *   6. merge    — copy staging entries into content/morphus/tables/<id>.json
 *   7. validate — npm run validate:schemas (morphus focus)
 *   8. aggregate — aggregation hook coverage per entry
 *   all         — extract → scaffold → report → validate → aggregate
 *
 * Usage:
 *   npm run morphus:ingest -- init --id athlete --display "Athlete" \
 *     --heading "Athlete Table" \
 *     --book src/data/reference/nightbane/WB6-Dark_Designs.pdf \
 *     --also-book src/data/reference/nightbane/Nightbane_RPG.pdf
 *   npm run morphus:ingest -- extract hobbyist
 *   npm run morphus:ingest -- scaffold hobbyist
 *   npm run morphus:ingest -- report hobbyist
 *   npm run morphus:ingest -- merge hobbyist
 *   npm run morphus:ingest -- validate hobbyist
 *   npm run morphus:ingest -- aggregate hobbyist
 *   npm run morphus:ingest -- all hobbyist
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  aggregationCoverageReport,
} from './lib/morphus-aggregation-coverage.mjs'
import {
  characteristicSchemaKeys,
  formatAjvErrors,
  getMorphusValidators,
  ingestRoot,
  loadJson,
  bookKeyFromPdf,
  defaultReference,
  loadManifest,
  manifestPath,
  repoRoot,
  resolveRepoPath,
  slugifyTraitId,
  sourcesFromTraitIndex,
  workDir,
  writeJson,
} from './lib/morphus-ingest-shared.mjs'

const PYTHON = process.env.MORPHUS_INGEST_PYTHON ?? 'python'
const PY_SCRIPT = join(repoRoot, 'scripts/lib/morphus-extract-table.py')

function usage() {
  console.log(`Morphus ingest — per-table pipeline

Commands:
  init      Create manifest (--id, --display, --heading, --book, [--also-book]…, [--books-file])
  extract   PDF(s) → extracted/<book>.txt + merged traits-index.json
  scaffold  traits-index → entries.staging.json (multi-book sources; authority = Dark Designs)
  report    Validate + schema audit + book index diff
  merge     Apply entries.staging.json → target table JSON
  validate  Run npm run validate:schemas
  aggregate Aggregation hook coverage report
  all       extract → scaffold → report → validate → aggregate

Example:
  npm run morphus:ingest -- init --id athlete --display "Athlete" \\
    --heading "Athlete Table" \\
    --book src/data/reference/nightbane/WB6-Dark_Designs.pdf \\
    --also-book src/data/reference/nightbane/Nightbane_RPG.pdf
  npm run morphus:ingest -- all athlete

Prompt template (chat): list every book PDF + table heading; Dark Designs = authoritative.
`)
}

const REPEATABLE_FLAGS = new Set(['also-book', 'also-reference', 'also-heading'])

function parseArgs(argv) {
  const args = [...argv]
  const cmd = args.shift()
  const positional = []
  const flags = {}
  while (args.length) {
    const a = args[0]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = args[1]
      if (REPEATABLE_FLAGS.has(key)) {
        if (!flags[key]) flags[key] = []
        if (next == null || next.startsWith('--')) {
          args.shift()
        } else {
          flags[key].push(next)
          args.shift(2)
        }
        continue
      }
      if (next == null || next.startsWith('--')) {
        flags[key] = true
        args.shift()
      } else {
        flags[key] = next
        args.shift(2)
      }
    } else {
      positional.push(a)
      args.shift()
    }
  }
  return { cmd, positional, flags }
}

function defaultTargetJson(tableId) {
  return `src/data/content/morphus/tables/${tableId}.json`
}

function buildBooksFromInitFlags(flags) {
  const defaultHeading = flags.heading
  if (!defaultHeading) throw new Error('--heading is required (e.g. "Athlete Table")')

  if (flags['books-file']) {
    const raw = loadJson(resolveRepoPath(flags['books-file']))
    const list = Array.isArray(raw) ? raw : raw.books
    if (!list?.length) throw new Error('--books-file must contain a books array')
    const books = list.map((b) => ({
      key: b.key ?? bookKeyFromPdf(b.pdf),
      pdf: b.pdf,
      reference: b.reference ?? defaultReference(b.pdf),
      tableHeading: b.tableHeading ?? defaultHeading,
      authoritative: Boolean(b.authoritative),
    }))
    if (!books.some((b) => b.authoritative)) {
      const dd = books.find((b) => /dark.?designs/i.test(b.pdf))
      if (dd) dd.authoritative = true
      else books[0].authoritative = true
    }
    const auth = books.find((b) => b.authoritative)
    return { books, authoritativeBookKey: auth?.key ?? books[0].key }
  }

  const primaryPdf = flags.book
  if (!primaryPdf) throw new Error('--book is required, or pass --books-file')

  const alsoPdfs = flags['also-book'] ?? []
  const alsoRefs = flags['also-reference'] ?? []
  const alsoHeadings = flags['also-heading'] ?? []

  const pdfs = [primaryPdf, ...alsoPdfs]
  const books = pdfs.map((pdf, i) => {
    const key = bookKeyFromPdf(pdf)
    const isDarkDesigns = /dark.?designs/i.test(pdf)
    return {
      key,
      pdf,
      reference:
        (i === 0 ? flags.reference : alsoRefs[i - 1]) ?? defaultReference(pdf),
      tableHeading: (i === 0 ? defaultHeading : alsoHeadings[i - 1]) ?? defaultHeading,
      authoritative: flags.authoritative === true || (flags.authoritative !== false && isDarkDesigns),
      required: true,
    }
  })

  if (!books.some((b) => b.authoritative)) {
    const dd = books.find((b) => /dark.?designs/i.test(b.pdf))
    if (dd) dd.authoritative = true
    else books[0].authoritative = true
  }

  const auth = books.find((b) => b.authoritative)
  return { books, authoritativeBookKey: auth?.key ?? books[0].key }
}

function cmdInit(flags) {
  const id = flags.id
  if (!id) throw new Error('--id is required')
  const display = flags.display ?? id
  const targetJson = flags.target ?? defaultTargetJson(id)
  const { books, authoritativeBookKey } = buildBooksFromInitFlags(flags)

  const manifest = {
    id,
    displayName: display,
    tableCategory: display,
    tableHeading: flags.heading,
    targetJson,
    gameSystem: flags.gameSystem ?? 'nightbane',
    excludeOther: flags['include-other'] ? false : true,
    authoritativeBookKey,
    descriptionAuthorityNote:
      'Transcribe description and mechanics from the authoritative book (Dark Designs when present).',
    books,
  }
  mkdirSync(ingestRoot, { recursive: true })
  writeJson(manifestPath(id), manifest)
  mkdirSync(workDir(id), { recursive: true })
  console.log(`OK  manifest ${manifestPath(id)}`)
  console.log(`    target ${targetJson}`)
  console.log(`    books: ${books.map((b) => `${b.key}${b.authoritative ? ' (authoritative)' : ''}`).join(', ')}`)
}

function runPythonExtract(tableId) {
  const manifest = manifestPath(tableId)
  const r = spawnSync(PYTHON, [PY_SCRIPT, manifest], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) {
    throw new Error(
      r.status === 2
        ? 'PDF extract failed — install pymupdf: pip install pymupdf'
        : `PDF extract exited ${r.status}`,
    )
  }
}

function cmdExtract(tableId) {
  runPythonExtract(tableId)
}

function cmdScaffold(tableId) {
  const manifest = loadManifest(tableId)
  const indexPath = join(workDir(tableId), 'traits-index.json')
  if (!existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath} — run extract first`)
  }
  const index = loadJson(indexPath)
  const authKey = index.authoritativeBookKey ?? manifest.authoritativeBookKey
  const authExtract = join('src/data/source/morphus-ingest', tableId, 'extracted-authoritative.txt')
  const entries = []
  for (const trait of index.traits) {
    if (trait.skip) continue
    const id = slugifyTraitId(tableId, trait.name)
    const sources = sourcesFromTraitIndex(trait, manifest.gameSystem)
    const alsoNote =
      trait.alsoPublishedIn?.length > 0
        ? ` Also in: ${trait.alsoPublishedIn.join(', ')}.`
        : ''
    entries.push({
      id,
      name: trait.name,
      tableCategory: manifest.tableCategory ?? manifest.displayName,
      gameSystems: [manifest.gameSystem],
      sources,
      description: `TODO: transcribe from ${authExtract} (${trait.percent}; authority=${authKey}).${alsoNote}`,
    })
  }
  const staging = { entries }
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  writeJson(stagingPath, staging)
  console.log(`OK  scaffold ${entries.length} entries → ${stagingPath}`)
}

function collectKeys(obj, prefix = '') {
  const keys = new Set()
  if (obj == null || typeof obj !== 'object') return keys
  if (Array.isArray(obj)) {
    for (const item of obj) collectKeys(item, prefix).forEach((k) => keys.add(k))
    return keys
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    keys.add(path)
    if (v && typeof v === 'object') {
      collectKeys(v, path).forEach((nested) => keys.add(nested))
    }
  }
  return keys
}

function validateEntries(entries, label) {
  const { validateCharacteristic } = getMorphusValidators()
  const errors = []
  for (const entry of entries) {
    if (!validateCharacteristic(entry)) {
      errors.push({ id: entry.id, detail: formatAjvErrors(validateCharacteristic) })
    }
  }
  if (errors.length) {
    console.error(`ERR ${label} — ${errors.length} row(s) failed`)
    for (const e of errors.slice(0, 8)) {
      console.error(`  ${e.id}:\n${e.detail.split('\n').map((l) => `    ${l}`).join('\n')}`)
    }
    return false
  }
  console.log(`OK  ${label} — ${entries.length} characteristic row(s) validate`)
  return true
}

function validateTableDoc(doc, label) {
  const { validateTableDoc } = getMorphusValidators()
  if (!validateTableDoc(doc)) {
    console.error(`ERR ${label}:`, formatAjvErrors(validateTableDoc))
    return false
  }
  console.log(`OK  ${label} — table document validates`)
  return true
}

function cmdReport(tableId) {
  const manifest = loadManifest(tableId)
  const targetPath = resolveRepoPath(manifest.targetJson)
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  const indexPath = join(workDir(tableId), 'traits-index.json')
  const allowed = new Set(characteristicSchemaKeys())
  const report = {
    tableId,
    generatedAt: new Date().toISOString(),
    schemaKeys: [...allowed].sort(),
    staging: null,
    target: null,
    bookIndex: null,
    recommendations: [],
  }

  let ok = true

  if (existsSync(indexPath)) {
    const index = loadJson(indexPath)
    const included = index.traits.filter((t) => !t.skip)
    report.bookIndex = {
      total: index.traits.length,
      included: included.length,
      skippedOther: index.traits.length - included.length,
      names: included.map((t) => t.name),
      authoritativeBookKey: index.authoritativeBookKey,
      books: index.books ?? manifest.books?.map((b) => b.key),
      multiSourceTraits: included.filter((t) => (t.sources?.length ?? 0) > 1).length,
    }
    const comparePath = join(workDir(tableId), 'description-compare.json')
    if (existsSync(comparePath)) {
      report.descriptionCompare = loadJson(comparePath)
      report.recommendations.push(
        `Description conflicts detected — use extracted-authoritative.txt (${index.authoritativeBookKey}); see description-compare.json`,
      )
    }
  }

  if (existsSync(stagingPath)) {
    const staging = loadJson(stagingPath)
    report.staging = {
      entryCount: staging.entries?.length ?? 0,
      unknownKeys: [],
      aggregation: aggregationCoverageReport(staging.entries ?? []),
    }
    for (const entry of staging.entries ?? []) {
      for (const key of collectKeys(entry)) {
        const top = key.split('.')[0]
        if (!allowed.has(top)) report.staging.unknownKeys.push({ id: entry.id, key })
      }
    }
    ok = validateEntries(staging.entries ?? [], 'entries.staging.json') && ok
  } else {
    report.recommendations.push('Run scaffold (or author entries.staging.json) before merge.')
  }

  if (existsSync(targetPath)) {
    const target = loadJson(targetPath)
    report.target = {
      entryCount: target.entries?.length ?? 0,
      ids: (target.entries ?? []).map((e) => e.id),
    }
    ok = validateTableDoc(target, manifest.targetJson) && ok
    if (existsSync(stagingPath)) {
      const staging = loadJson(stagingPath)
      const stagingIds = new Set((staging.entries ?? []).map((e) => e.id))
      const targetIds = new Set((target.entries ?? []).map((e) => e.id))
      const missingInStaging = [...targetIds].filter((id) => !stagingIds.has(id))
      const missingInTarget = [...stagingIds].filter((id) => !targetIds.has(id))
      if (missingInStaging.length) {
        report.recommendations.push(`Target has ids not in staging: ${missingInStaging.join(', ')}`)
      }
      if (missingInTarget.length) {
        report.recommendations.push(`Staging has ids not in target (merge pending): ${missingInTarget.join(', ')}`)
      }
      if (report.bookIndex) {
        const bookNames = new Set(report.bookIndex.names)
        for (const e of staging.entries ?? []) {
          if (!bookNames.has(e.name)) {
            report.recommendations.push(`Staging name not in book index: ${e.name} (${e.id})`)
          }
        }
      }
    }
  } else {
    report.recommendations.push(`Create target file: ${manifest.targetJson}`)
  }

  const reportPath = join(workDir(tableId), 'report.json')
  writeJson(reportPath, report)
  console.log(`OK  report → ${reportPath}`)
  if (report.recommendations.length) {
    console.log('--- recommendations ---')
    for (const r of report.recommendations) console.log(`  • ${r}`)
  }
  if (!ok) process.exitCode = 1
}

function cmdMerge(tableId) {
  const manifest = loadManifest(tableId)
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (!existsSync(stagingPath)) throw new Error(`Missing ${stagingPath}`)
  const staging = loadJson(stagingPath)
  if (!validateEntries(staging.entries ?? [], 'entries.staging.json (pre-merge)')) {
    process.exit(1)
  }
  const targetPath = resolveRepoPath(manifest.targetJson)
  let target
  if (existsSync(targetPath)) {
    target = loadJson(targetPath)
  } else {
    target = {
      id: tableId,
      kind: 'morphus_trait_table',
      displayName: manifest.displayName,
      parentTable: null,
      description: `${manifest.displayName} Morphus table.`,
      entries: [],
    }
  }
  target.entries = staging.entries
  target.displayName = manifest.displayName
  writeJson(targetPath, target)
  if (!validateTableDoc(target, manifest.targetJson)) process.exit(1)
  console.log(`OK  merged ${staging.entries.length} entries → ${manifest.targetJson}`)
}

function cmdValidate() {
  const r = spawnSync('npm', ['run', 'validate:schemas'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function cmdAggregate(tableId) {
  const manifest = loadManifest(tableId)
  const targetPath = resolveRepoPath(manifest.targetJson)
  if (!existsSync(targetPath)) throw new Error(`Missing target ${targetPath}`)
  const target = loadJson(targetPath)
  const coverage = aggregationCoverageReport(target.entries ?? [])
  const outPath = join(workDir(tableId), 'aggregation-coverage.json')
  writeJson(outPath, { tableId, entries: coverage })
  console.log(`OK  aggregation coverage → ${outPath}`)
  for (const row of coverage) {
    const flags = row.hooks.length ? row.hooks.join(', ') : '(no wired hooks — notes only?)'
    console.log(`  ${row.id}: ${flags}`)
  }
  const notesOnly = coverage.filter((r) => r.notesOnly || r.hooks.length === 0)
  if (notesOnly.length) {
    console.log(`--- ${notesOnly.length} row(s) with no aggregation hooks (customOneOffs only or empty) ---`)
  }
}

function cmdAll(tableId) {
  cmdExtract(tableId)
  cmdScaffold(tableId)
  cmdReport(tableId)
  cmdValidate()
  cmdAggregate(tableId)
  console.log('\nNext: transcribe mechanics in entries.staging.json, then:')
  console.log(`  npm run morphus:ingest -- merge ${tableId}`)
  console.log('  npm run morphus:ingest -- validate')
  console.log(`  npm run morphus:ingest -- aggregate ${tableId}`)
}

function main() {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2))
  if (!cmd || cmd === 'help' || cmd === '-h') {
    usage()
    return
  }
  const tableId = positional[0] ?? flags.id
  try {
    switch (cmd) {
      case 'init':
        cmdInit(flags)
        break
      case 'extract':
        if (!tableId) throw new Error('table id required')
        cmdExtract(tableId)
        break
      case 'scaffold':
        if (!tableId) throw new Error('table id required')
        cmdScaffold(tableId)
        break
      case 'report':
        if (!tableId) throw new Error('table id required')
        cmdReport(tableId)
        break
      case 'merge':
        if (!tableId) throw new Error('table id required')
        cmdMerge(tableId)
        break
      case 'validate':
        cmdValidate()
        break
      case 'aggregate':
        if (!tableId) throw new Error('table id required')
        cmdAggregate(tableId)
        break
      case 'all':
        if (!tableId) throw new Error('table id required')
        cmdAll(tableId)
        break
      default:
        usage()
        process.exit(1)
    }
  } catch (e) {
    console.error('ERR', e.message ?? e)
    process.exit(1)
  }
}

main()
