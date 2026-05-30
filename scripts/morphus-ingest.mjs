#!/usr/bin/env node
/**
 * Morphus table ingest pipeline (per content group).
 *
 * High-level pipeline:
 *   prepare  — extract PDF → schema-loop → scaffold → structure-entries
 *   build    — structure-entries + merge + validate (after prepare)
 *   finalize — aggregation coverage on target JSON
 *
 * Low-level:
 *   init, extract, analyze-schema, apply-schema, schema-loop, scaffold, structure-entries, report, merge, validate, aggregate
 *   all = prepare only (does not transcribe or aggregate)
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
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  aggregationCoverageReport,
} from './lib/morphus-aggregation-coverage.mjs'
import {
  analyzeMorphusSchemaFit,
  printSchemaAnalysisSummary,
} from './lib/morphus-schema-analysis.mjs'
import {
  applySchemaPatches,
  buildSchemaPatches,
} from './lib/morphus-schema-apply.mjs'
import {
  enrichMorphusEntry,
  matchBlockForEntry,
  splitTraitBlocks,
} from './lib/morphus-transcribe-structure.mjs'
import {
  filterPlayableEntries,
  isPlayableMorphusTrait,
  normTraitName,
  traitIndexRowIsPlayable,
} from './lib/morphus-trait-filter.mjs'
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
  resetMorphusValidators,
  sourcesFromTraitIndex,
  workDir,
  writeJson,
} from './lib/morphus-ingest-shared.mjs'

const PYTHON = process.env.MORPHUS_INGEST_PYTHON ?? 'python'
const PY_SCRIPT = join(repoRoot, 'scripts/lib/morphus-extract-table.py')

function usage() {
  console.log(`Morphus ingest — per-table pipeline

Commands (pipeline):
  prepare      extract + schema-loop + scaffold + structure-entries
  build        structure-entries + validate target JSON (merge if needed)
  finalize     aggregation coverage on target JSON

Commands (steps):
  init, extract, analyze-schema, apply-schema, schema-loop [--max N]
  scaffold, structure-entries [--force] [--target], sync-sources, report, merge, validate, aggregate
  all          same as prepare (extract + schema-loop)

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
    excludeNonPlayable: flags['include-non-playable'] ? false : true,
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

function runMorphusAnalyze(tableId) {
  const manifest = loadManifest(tableId)
  const authPath = join(workDir(tableId), 'extracted-authoritative.txt')
  if (!existsSync(authPath)) {
    throw new Error(`missing ${authPath} — run: npm run morphus:ingest -- extract ${tableId}`)
  }
  const tableText = readFileSync(authPath, 'utf8')
  const indexPath = join(workDir(tableId), 'traits-index.json')
  const traitsIndex = existsSync(indexPath) ? loadJson(indexPath) : null
  const targetPath = resolveRepoPath(manifest.targetJson)
  const targetTable = existsSync(targetPath) ? loadJson(targetPath) : null
  resetMorphusValidators()
  const schemaKeys = characteristicSchemaKeys()
  const analysis = analyzeMorphusSchemaFit({
    tableText,
    schemaKeys,
    targetTable,
    traitsIndex,
  })
  analysis.tableId = tableId
  const outPath = join(workDir(tableId), 'schema-analysis.json')
  writeJson(outPath, analysis)
  return { analysis, outPath }
}

function cmdAnalyzeSchema(tableId, { quiet = false } = {}) {
  const { analysis, outPath } = runMorphusAnalyze(tableId)
  if (!quiet) {
    printSchemaAnalysisSummary(analysis)
    console.log(`OK  schema analysis → ${outPath}`)
  }
  return analysis
}

function cmdApplySchema(tableId) {
  const analysisPath = join(workDir(tableId), 'schema-analysis.json')
  if (!existsSync(analysisPath)) {
    throw new Error(`missing ${analysisPath} — run analyze-schema first`)
  }
  const analysis = loadJson(analysisPath)
  const patches = buildSchemaPatches(analysis)
  const result = applySchemaPatches(patches)
  const outPath = join(workDir(tableId), 'schema-apply-log.json')
  writeJson(outPath, {
    tableId,
    generatedAt: new Date().toISOString(),
    patches,
    ...result,
  })
  resetMorphusValidators()
  if (result.schemaChanged) {
    console.log(`OK  applied ${result.applied.length} schema patch(es) → ${outPath}`)
    cmdValidate()
  } else {
    console.log(`OK  no automatic schema patches applied (${result.manual.length} need manual edit)`)
  }
  if (result.manual.length) {
    const tasksPath = join(workDir(tableId), 'schema-gap-tasks.json')
    writeJson(tasksPath, {
      tableId,
      manual: result.manual,
      edgeCases: analysis.edgeCases ?? [],
    })
    console.log(`    manual tasks → ${tasksPath}`)
  }
  return result
}

function cmdSchemaLoop(tableId, flags = {}) {
  const max = Number(flags.max ?? 12)
  const loopReport = {
    tableId,
    maxIterations: max,
    iterations: [],
    completed: false,
  }
  for (let i = 1; i <= max; i++) {
    console.log(`\n--- schema loop ${i}/${max} ---`)
    const analysis = cmdAnalyzeSchema(tableId, { quiet: false })
    const iteration = {
      iteration: i,
      readyToTranscribe: analysis.readyToTranscribe,
      edgeCaseCount: analysis.edgeCases?.length ?? 0,
    }
    if (analysis.readyToTranscribe) {
      loopReport.iterations.push(iteration)
      loopReport.completed = true
      const outPath = join(workDir(tableId), 'schema-loop-report.json')
      writeJson(outPath, loopReport)
      console.log(`\nOK  schema loop complete after ${i} iteration(s) → ${outPath}`)
      return true
    }
    const applyResult = cmdApplySchema(tableId)
    iteration.applied = applyResult.applied.length
    iteration.manual = applyResult.manual.length
    iteration.schemaChanged = applyResult.schemaChanged
    loopReport.iterations.push(iteration)
    if (!applyResult.schemaChanged) {
      const tasksPath = join(workDir(tableId), 'schema-gap-tasks.json')
      console.error(
        `\nERR schema loop stopped — manual schema edits required (see ${tasksPath}). Re-run: npm run morphus:ingest -- schema-loop ${tableId}`,
      )
      writeJson(join(workDir(tableId), 'schema-loop-report.json'), loopReport)
      process.exitCode = 2
      return false
    }
  }
  writeJson(join(workDir(tableId), 'schema-loop-report.json'), loopReport)
  console.error(`ERR schema loop exceeded --max ${max} — extend schema manually, then re-run schema-loop`)
  process.exitCode = 2
  return false
}

function requireSchemaReady(tableId) {
  const analysisPath = join(workDir(tableId), 'schema-analysis.json')
  if (!existsSync(analysisPath)) {
    throw new Error(`Run prepare first: npm run morphus:ingest -- prepare ${tableId}`)
  }
  const analysis = loadJson(analysisPath)
  if (!analysis.readyToTranscribe) {
    throw new Error(
      `Schema not ready (${analysis.edgeCases?.length ?? 0} edge case(s)). Run: npm run morphus:ingest -- schema-loop ${tableId}`,
    )
  }
}

function cmdPrepare(tableId, flags = {}) {
  const authPath = join(workDir(tableId), 'extracted-authoritative.txt')
  if (!existsSync(authPath) || flags['re-extract']) {
    cmdExtract(tableId)
  }
  const schemaOk = cmdSchemaLoop(tableId, flags)
  if (!schemaOk) return false
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (!existsSync(stagingPath) || flags.scaffold) {
    cmdScaffold(tableId)
  }
  cmdStructureEntries(tableId, flags)
  return true
}

function traitBodyToDescription(body) {
  return body.replace(/^\d{2}-\d{2}%\s+[^:]+:\s*/i, '').replace(/\s+/g, ' ').trim()
}

/** Later files win when the same trait name appears in multiple book extracts. */
function extractedTxtPriority(fileName) {
  const rank = [
    'extracted-authoritative.txt',
    'core.txt',
    'between_the_shadows.txt',
    'nightlands.txt',
    'survival_guide.txt',
    'dark_designs.txt',
    'dark_designs_ii.txt',
  ]
  const base = fileName.replace(/^.*[/\\]/, '')
  const i = rank.indexOf(base)
  return i >= 0 ? i : rank.length + base.localeCompare('')
}

/** Trait blocks from authoritative extract plus per-book extracts (e.g. Alien Shape II). */
function loadTraitBlocksForStructure(tableId) {
  const work = workDir(tableId)
  const byName = new Map()
  const addFromText = (text) => {
    for (const block of splitTraitBlocks(text)) {
      byName.set(normTraitName(block.name), block)
    }
  }
  const paths = []
  const authPath = join(work, 'extracted-authoritative.txt')
  if (existsSync(authPath)) paths.push(authPath)
  const extractedDir = join(work, 'extracted')
  if (existsSync(extractedDir)) {
    for (const name of readdirSync(extractedDir).filter((f) => f.endsWith('.txt'))) {
      paths.push(join(extractedDir, name))
    }
  }
  for (const name of readdirSync(work).filter((f) => /^extracted_.+\.txt$/i.test(f))) {
    paths.push(join(work, name))
  }
  paths.sort((a, b) => extractedTxtPriority(a) - extractedTxtPriority(b))
  for (const path of paths) {
    addFromText(readFileSync(path, 'utf8'))
  }
  return [...byName.values()]
}

function inferTraitTableCategory(trait, manifest) {
  const bookKeys = new Set((trait.sources ?? []).map((s) => s.bookKey))
  if (manifest.id === 'alien_shape') {
    const survivalOnly =
      bookKeys.has('survival_guide') && !bookKeys.has('dark_designs') && !bookKeys.has('core')
    if (survivalOnly) return 'Alien Shape II'
    return manifest.tableCategory ?? manifest.displayName
  }
  if (manifest.id === 'biomechanical') {
    const tableI =
      bookKeys.has('dark_designs') || bookKeys.has('core')
    const tableII =
      bookKeys.has('dark_designs_ii') || bookKeys.has('between_the_shadows')
    const tableIII = bookKeys.has('survival_guide')
    if (tableIII && !tableI && !tableII) return 'Biomechanical III'
    if (tableII && !tableI && !tableIII) return 'Biomechanical II'
    if (tableI && !tableII && !tableIII) return 'Biomechanical'
    if (tableIII) return 'Biomechanical III'
    if (tableII) return 'Biomechanical II'
    return 'Biomechanical'
  }
  if (manifest.id === 'plant_life') {
    if (bookKeys.has('dark_designs_ii') || bookKeys.has('plant_life_ii')) {
      return 'Plant Life II'
    }
    return 'Plant Life'
  }
  if (manifest.id === 'mineral') {
    if (bookKeys.has('mineral_ii')) {
      return 'Mineral II'
    }
    return 'Mineral'
  }
  if (manifest.id === 'stigmata') {
    if (bookKeys.has('stigmata_iii')) {
      return 'Stigmata III'
    }
    if (bookKeys.has('dark_designs_ii') || bookKeys.has('between_the_shadows')) {
      return 'Stigmata II'
    }
    return 'Stigmata I'
  }
  if (manifest.id === 'unnatural_limbs') {
    if (bookKeys.has('appendages')) {
      return 'Unnatural Appendages & Limbs'
    }
    return 'Unnatural Limbs'
  }
  if (manifest.id === 'unusual_facial_features') {
    if (bookKeys.has('facial_features_ii')) {
      return 'Unusual Facial Features II'
    }
    return 'Unusual Facial Features'
  }
  return manifest.tableCategory ?? manifest.displayName
}

function cmdStructureEntries(tableId, flags = {}) {
  const authPath = join(workDir(tableId), 'extracted-authoritative.txt')
  if (!existsSync(authPath)) {
    throw new Error(`Missing ${authPath} — run extract first`)
  }
  const blocks = loadTraitBlocksForStructure(tableId)
  const fillOnly = !flags.force
  const manifest = loadManifest(tableId)
  const targets = []

  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (existsSync(stagingPath)) targets.push({ path: stagingPath, label: 'entries.staging.json' })

  const targetPath = resolveRepoPath(manifest.targetJson)
  if (flags.target || !existsSync(stagingPath)) {
    if (existsSync(targetPath)) targets.push({ path: targetPath, label: manifest.targetJson })
  }

  if (!targets.length) {
    console.log('WARN structure-entries — no staging or target JSON; run scaffold first')
    return { changed: 0, unmatched: [] }
  }

  const report = {
    tableId,
    generatedAt: new Date().toISOString(),
    fillOnly,
    files: [],
  }
  let totalChanged = 0
  const unmatched = []

  for (const { path, label } of targets) {
    const doc = loadJson(path)
    let changed = 0
    for (const entry of doc.entries ?? []) {
      if (entry.entryRole === 'table_router' || entry.entryRole === 'subtable_header') {
        continue
      }
      if (!isPlayableMorphusTrait(entry.name, entry.description ?? '', entry.description ?? '')) {
        continue
      }
      const block = matchBlockForEntry(blocks, entry)
      if (!block) {
        unmatched.push({ id: entry.id, name: entry.name, file: label })
        continue
      }
      const before = JSON.stringify(entry)
      enrichMorphusEntry(entry, block.body, {
        fillOnly,
        descriptionText: traitBodyToDescription(block.body),
      })
      if (JSON.stringify(entry) !== before) changed += 1
    }
    writeJson(path, doc)
    if (path === targetPath) {
      validateTableDoc(doc, manifest.targetJson)
    } else {
      validateEntries(doc.entries ?? [], label)
    }
    totalChanged += changed
    report.files.push({ path: label, changed, entryCount: doc.entries?.length ?? 0 })
    console.log(`OK  structure-entries ${changed}/${doc.entries?.length ?? 0} rows → ${label}`)
  }

  const reportPath = join(workDir(tableId), 'structure-report.json')
  report.unmatched = unmatched
  report.totalChanged = totalChanged
  writeJson(reportPath, report)
  if (unmatched.length) {
    console.log(`WARN ${unmatched.length} entr(ies) not matched to book blocks — see structure-report.json`)
  }
  return report
}

function cmdBuild(tableId, flags = {}) {
  requireSchemaReady(tableId)
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (!existsSync(stagingPath)) {
    cmdScaffold(tableId)
  }
  cmdStructureEntries(tableId, flags)
  const manifest = loadManifest(tableId)
  const targetPath = resolveRepoPath(manifest.targetJson)
  cmdReport(tableId)
  if (!existsSync(targetPath)) {
    console.log('\nNext: transcribe entries.staging.json (or target JSON), then:')
    console.log(`  npm run morphus:ingest -- merge ${tableId}`)
    console.log(`  npm run morphus:ingest -- build ${tableId}`)
    return
  }
  const target = loadJson(targetPath)
  const todo = (target.entries ?? []).filter((e) =>
    String(e.description ?? '').includes('TODO: transcribe'),
  )
  if (todo.length) {
    console.log(`\nWARN ${todo.length} entr(ies) still have TODO descriptions — finish transcription, merge, then re-run build`)
    process.exitCode = 1
    return
  }
  if (!validateEntries(target.entries ?? [], manifest.targetJson)) {
    process.exit(1)
  }
  cmdValidate()
  console.log(`\nOK  build complete — target ${manifest.targetJson} validates`)
  console.log(`Next: npm run morphus:ingest -- finalize ${tableId}`)
}

function cmdFinalize(tableId) {
  requireSchemaReady(tableId)
  const manifest = loadManifest(tableId)
  const targetPath = resolveRepoPath(manifest.targetJson)
  if (!existsSync(targetPath)) {
    throw new Error(`Missing target ${targetPath} — run build (merge) first`)
  }
  cmdAggregate(tableId)
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
    if (!traitIndexRowIsPlayable(trait)) continue
    const id = slugifyTraitId(tableId, trait.name)
    const sources = sourcesFromTraitIndex(trait, manifest.gameSystem)
    const alsoNote =
      trait.alsoPublishedIn?.length > 0
        ? ` Also in: ${trait.alsoPublishedIn.join(', ')}.`
        : ''
    entries.push({
      id,
      name: trait.name,
      tableCategory: inferTraitTableCategory(trait, manifest),
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
    const included = index.traits.filter((t) => traitIndexRowIsPlayable(t))
    const skipped = index.traits.filter((t) => !traitIndexRowIsPlayable(t))
    report.bookIndex = {
      total: index.traits.length,
      included: included.length,
      skippedNonPlayable: skipped.length,
      skippedOther: skipped.length,
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
        const normName = (s) =>
          String(s)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
        const bookNames = new Set(report.bookIndex.names.map(normName))
        for (const e of staging.entries ?? []) {
          if (!bookNames.has(normName(e.name))) {
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

function cmdSyncSources(tableId) {
  const manifest = loadManifest(tableId)
  const indexPath = join(workDir(tableId), 'traits-index.json')
  if (!existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath} — run extract first`)
  }
  const index = loadJson(indexPath)
  const byId = new Map()
  for (const trait of index.traits) {
    if (!traitIndexRowIsPlayable(trait)) continue
    byId.set(slugifyTraitId(tableId, trait.name), sourcesFromTraitIndex(trait, manifest.gameSystem))
  }

  const targetPath = resolveRepoPath(manifest.targetJson)
  if (!existsSync(targetPath)) {
    throw new Error(`Missing ${targetPath}`)
  }
  const target = loadJson(targetPath)
  let updated = 0
  for (const entry of target.entries ?? []) {
    const sources = byId.get(entry.id)
    if (!sources) continue
    entry.sources = sources
    updated += 1
  }
  writeJson(targetPath, target)
  if (!validateTableDoc(target, manifest.targetJson)) process.exit(1)
  console.log(`OK  sync-sources ${updated}/${target.entries?.length ?? 0} entries → ${manifest.targetJson}`)

  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (existsSync(stagingPath)) {
    const staging = loadJson(stagingPath)
    let stagingUpdated = 0
    for (const entry of staging.entries ?? []) {
      const sources = byId.get(entry.id)
      if (!sources) continue
      entry.sources = sources
      stagingUpdated += 1
    }
    writeJson(stagingPath, staging)
    console.log(`OK  sync-sources ${stagingUpdated}/${staging.entries?.length ?? 0} staging rows`)
  }

  const missing = (target.entries ?? []).filter((e) => !byId.has(e.id)).map((e) => e.id)
  if (missing.length) {
    console.log(`WARN ${missing.length} target id(s) not in traits-index: ${missing.join(', ')}`)
  }
  const extra = [...byId.keys()].filter(
    (id) => !(target.entries ?? []).some((e) => e.id === id),
  )
  if (extra.length) {
    console.log(`WARN ${extra.length} index trait(s) not in target — transcribe and merge: ${extra.join(', ')}`)
  }
}

function cmdMerge(tableId, flags = {}) {
  cmdStructureEntries(tableId, flags)
  const manifest = loadManifest(tableId)
  const stagingPath = join(workDir(tableId), 'entries.staging.json')
  if (!existsSync(stagingPath)) throw new Error(`Missing ${stagingPath}`)
  const staging = loadJson(stagingPath)
  const { kept, skipped } = filterPlayableEntries(staging.entries ?? [])
  if (skipped.length) {
    console.log(
      `OK  prune non-playable ${skipped.length} entr(ies): ${skipped.map((s) => s.name).join(', ')}`,
    )
  }
  staging.entries = kept
  writeJson(stagingPath, staging)
  if (!validateEntries(staging.entries ?? [], 'entries.staging.json (post-prune)')) {
    process.exit(1)
  }
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

function cmdAll(tableId, flags = {}) {
  cmdPrepare(tableId, flags)
  console.log('\n--- Phase 2: build JSON (after transcription) ---')
  console.log(`  npm run morphus:ingest -- build ${tableId}`)
  console.log('\n--- Phase 3: aggregate ---')
  console.log(`  npm run morphus:ingest -- finalize ${tableId}`)
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
      case 'analyze-schema':
        if (!tableId) throw new Error('table id required')
        cmdAnalyzeSchema(tableId)
        if (!loadJson(join(workDir(tableId), 'schema-analysis.json')).readyToTranscribe) {
          process.exitCode = 2
        }
        break
      case 'apply-schema':
        if (!tableId) throw new Error('table id required')
        cmdApplySchema(tableId)
        break
      case 'schema-loop':
        if (!tableId) throw new Error('table id required')
        cmdSchemaLoop(tableId, flags)
        break
      case 'prepare':
        if (!tableId) throw new Error('table id required')
        cmdPrepare(tableId, flags)
        break
      case 'build':
        if (!tableId) throw new Error('table id required')
        cmdBuild(tableId, flags)
        break
      case 'finalize':
        if (!tableId) throw new Error('table id required')
        cmdFinalize(tableId)
        break
      case 'scaffold':
        if (!tableId) throw new Error('table id required')
        cmdScaffold(tableId)
        break
      case 'structure-entries':
        if (!tableId) throw new Error('table id required')
        cmdStructureEntries(tableId, flags)
        break
      case 'report':
        if (!tableId) throw new Error('table id required')
        cmdReport(tableId)
        break
      case 'sync-sources':
        if (!tableId) throw new Error('table id required')
        cmdSyncSources(tableId)
        break
      case 'merge':
        if (!tableId) throw new Error('table id required')
        cmdMerge(tableId, flags)
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
        cmdAll(tableId, flags)
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
