/**
 * Ingest brief CLI — validate input, init run state, chunk batches, show status.
 *
 *   npm run ingest:brief -- validate src/data/source/ingest-briefs/examples/foo.brief.json
 *   npm run ingest:brief -- init <brief.json>
 *   npm run ingest:brief -- show <brief.json>
 *   npm run ingest:brief -- status <brief-id>
 *   npm run ingest:brief -- chunk --items "A,B,C" --size 6
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  INGEST_BRIEF_VERSION,
  chunkItems,
  defaultBatchSize,
  formatPageRange,
  getContentType,
  resolvePassPhases,
} from './lib/ingest-brief-registry.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const briefsRoot = join(root, 'src/data/source/ingest-briefs')
const runsRoot = join(briefsRoot, 'runs')
const schemaPath = join(root, 'src/data/schemas/ingest-brief.schema.json')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function resolveBriefPath(arg) {
  const p = resolve(process.cwd(), arg)
  if (existsSync(p)) return p
  const underBriefs = join(briefsRoot, arg)
  if (existsSync(underBriefs)) return underBriefs
  const withExt = join(briefsRoot, `${arg}.brief.json`)
  if (existsSync(withExt)) return withExt
  throw new Error(`Brief not found: ${arg}`)
}

function validateBriefSchema(brief) {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  const schema = loadJson(schemaPath)
  const validate = ajv.compile(schema)
  if (!validate(brief)) {
    const lines = (validate.errors ?? []).map((e) => {
      const path = e.instancePath || '(root)'
      return `  ${path}: ${e.message}`
    })
    throw new Error(`Brief schema invalid:\n${lines.join('\n')}`)
  }
}

function validateBriefSemantics(brief) {
  const def = getContentType(brief.contentType)
  const errors = []

  if (brief.version !== INGEST_BRIEF_VERSION) {
    errors.push(`version must be ${INGEST_BRIEF_VERSION}`)
  }

  const needsGenre = def.options.genre === 'required'
  if (needsGenre && !brief.genre) {
    errors.push(`genre is required for contentType "${brief.contentType}"`)
  }

  for (const [key, requirement] of Object.entries(def.options)) {
    if (key === 'genre') continue
    if (requirement === 'required' && !brief.options?.[key]) {
      errors.push(`options.${key} is required for contentType "${brief.contentType}"`)
    }
  }

  if (brief.batchSizeOverride != null) {
    const passKey = brief.pass === 'B' ? 'B' : 'A'
    const limits = def.batchSize[passKey]
    if (limits.max != null && brief.batchSizeOverride > limits.max) {
      errors.push(
        `batchSizeOverride ${brief.batchSizeOverride} exceeds max ${limits.max} for ${brief.contentType} Pass ${passKey}`,
      )
    }
  }

  if (brief.batchSizeOverrideB != null && brief.pass !== 'AB') {
    errors.push('batchSizeOverrideB is only valid when pass is AB')
  }

  if (brief.batchSizeOverrideB != null) {
    const limits = def.batchSize.B
    if (limits.max != null && brief.batchSizeOverrideB > limits.max) {
      errors.push(
        `batchSizeOverrideB ${brief.batchSizeOverrideB} exceeds max ${limits.max} for ${brief.contentType} Pass B`,
      )
    }
  }

  if (brief.contentType === 'morphus' && brief.options?.mode === 'table_pipeline') {
    for (const key of ['table', 'tableHeading', 'targetJson']) {
      if (!brief.options?.[key]) {
        errors.push(`options.${key} is required when morphus mode is table_pipeline`)
      }
    }
  }

  if (errors.length) {
    throw new Error(`Brief semantic errors:\n  ${errors.join('\n  ')}`)
  }
}

function runDirFor(briefId) {
  return join(runsRoot, briefId)
}

function runStatePath(briefId) {
  return join(runDirFor(briefId), 'run.json')
}

function loadBrief(arg) {
  const path = resolveBriefPath(arg)
  const brief = loadJson(path)
  validateBriefSchema(brief)
  validateBriefSemantics(brief)
  return { brief, path }
}

function initRun(brief) {
  const runDir = runDirFor(brief.id)
  const statePath = runStatePath(brief.id)
  if (existsSync(statePath)) {
    console.log(`Run already exists: ${statePath}`)
    return loadJson(statePath)
  }

  const def = getContentType(brief.contentType)
  const now = new Date().toISOString()
  const state = {
    briefId: brief.id,
    briefTitle: brief.title,
    contentType: brief.contentType,
    pass: brief.pass,
    passPhases: resolvePassPhases(brief.pass),
    currentPassPhase: resolvePassPhases(brief.pass)[0],
    playbook: def.playbook,
    status: 'planned',
    phase: 'review',
    createdAt: now,
    updatedAt: now,
    checklist: (brief.items ?? []).map((name) => ({
      name,
      status: 'pending',
      passA: 'pending',
      passB: brief.pass === 'AB' ? 'pending' : null,
      pages: null,
      notes: null,
    })),
    batches: [],
    rulings: [],
    completedBatchIds: [],
    validationCommands: def.validateCommands,
  }

  mkdirSync(runDir, { recursive: true })
  writeJson(statePath, state)
  writeJson(join(runDir, 'rulings.json'), { open: [], resolved: [] })
  console.log(`OK  initialized run at ${statePath}`)
  return state
}

function showBrief(brief, briefPath) {
  const def = getContentType(brief.contentType)
  const scope =
    brief.scope ??
    def.defaultScope[brief.pass === 'B' ? 'B' : 'A']
  const pages = formatPageRange(brief.book.pages)

  console.log(`Ingest brief: ${brief.title}`)
  console.log(`  File:         ${briefPath}`)
  console.log(`  Id:           ${brief.id}`)
  console.log(`  Content type: ${brief.contentType} → ${def.playbook}`)
  console.log(`  Pass:         ${brief.pass}${brief.pass === 'AB' ? ' (phased A → B)' : ''}`)
  if (brief.pass === 'AB') {
    const sizeA = brief.batchSizeOverride ?? defaultBatchSize(brief.contentType, 'A')
    const sizeB = brief.batchSizeOverrideB ?? defaultBatchSize(brief.contentType, 'B')
    console.log(`  Batch sizes:  Pass A ${sizeA} · Pass B ${sizeB} ${def.itemField}/batch`)
    if (brief.passBAfterRulings) {
      console.log(`  AB gate:      pause Pass B until Pass A rulings resolved`)
    }
  } else {
    const batchSize =
      brief.batchSizeOverride ?? defaultBatchSize(brief.contentType, brief.pass)
    console.log(`  Batch size:   ${batchSize} ${def.itemField}/batch`)
  }
  if (brief.genre) console.log(`  Genre:        ${brief.genre}`)
  console.log(`  Book:         ${brief.book.reference} ${pages}`)
  if (brief.book.path) console.log(`  PDF path:     ${brief.book.path}`)
  console.log(`  Scope:        ${scope}`)
  console.log(`  Validation:   ${def.validateCommands.map((c) => `npm run ${c}`).join(', ')}`)
  if (brief.options && Object.keys(brief.options).length) {
    console.log(`  Options:      ${JSON.stringify(brief.options)}`)
  }
  if (brief.items?.length) {
    console.log(`  Pre-listed:   ${brief.items.length} item(s)`)
  } else {
    console.log(`  Pre-listed:   (none — agent discovers during review)`)
  }
  if (brief.linkedBriefs?.length) {
    console.log(`  Linked:       ${brief.linkedBriefs.join(', ')}`)
  }
  if (brief.notes?.trim()) {
    console.log(`  Notes:        ${brief.notes.trim().split('\n')[0]}…`)
  }
  const runPath = runStatePath(brief.id)
  if (existsSync(runPath)) {
    const run = loadJson(runPath)
    console.log(`  Run status:   ${run.status} (phase: ${run.phase})`)
    console.log(`  Checklist:    ${run.checklist.length} item(s), ${run.batches.length} batch(es)`)
    console.log(`  Open rulings: ${run.rulings.filter((r) => r.status === 'open').length}`)
  } else {
    console.log(`  Run status:   not initialized — run: npm run ingest:brief -- init ${brief.id}`)
  }
}

function showStatus(briefId) {
  const statePath = runStatePath(briefId)
  if (!existsSync(statePath)) {
    throw new Error(`No run for brief id "${briefId}". Run: npm run ingest:brief -- init <brief.json>`)
  }
  const run = loadJson(statePath)
  const openRulings = run.rulings.filter((r) => r.status === 'open')

  console.log(`Run: ${run.briefTitle} (${run.briefId})`)
  console.log(`  Status: ${run.status} · Phase: ${run.phase}${run.currentPassPhase ? ` · Pass phase: ${run.currentPassPhase}` : ''}`)
  console.log(`  Playbook: ${run.playbook}`)
  console.log(`  Checklist: ${run.checklist.length} items`)
  for (const row of run.checklist) {
    console.log(`    [${row.status}] ${row.name}${row.pages ? ` (${row.pages})` : ''}`)
  }
  console.log(`  Batches: ${run.batches.length}`)
  for (const batch of run.batches) {
    const items = batch.items?.join(', ') ?? ''
    const passLabel = batch.pass ? ` Pass ${batch.pass}` : ''
    console.log(`    [${batch.status}] ${batch.id}${passLabel}: ${items}`)
  }
  console.log(`  Completed: ${run.completedBatchIds.length}/${run.batches.length}`)
  console.log(`  Open rulings: ${openRulings.length}`)
  for (const r of openRulings) {
    console.log(`    - [${r.id}] ${r.item ?? r.batchId}: ${r.question}`)
  }
}

function cmdChunk(argv) {
  let items = []
  let size = 6
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--items') {
      items = argv[++i].split(',').map((s) => s.trim()).filter(Boolean)
    } else if (argv[i] === '--size') {
      size = Number(argv[++i])
    }
  }
  if (!items.length) throw new Error('chunk requires --items "A,B,C"')
  if (!Number.isFinite(size) || size < 1) throw new Error('--size must be a positive integer')
  const chunks = chunkItems(items, size)
  chunks.forEach((chunk, i) => {
    console.log(`Batch ${String(i + 1).padStart(2, '0')}: ${chunk.join(', ')}`)
  })
}

function cmdCompare(argv) {
  const briefId = argv[0]
  if (!briefId) throw new Error('compare requires <brief-id>')

  const { brief } = loadBrief(briefId)
  if (!brief.sandboxOutput) {
    throw new Error(`Brief "${briefId}" has no sandboxOutput path`)
  }

  const sandboxPath = resolve(process.cwd(), brief.sandboxOutput)
  if (!existsSync(sandboxPath)) {
    throw new Error(`Sandbox file missing: ${sandboxPath}`)
  }

  const sandbox = loadJson(sandboxPath)
  if (!Array.isArray(sandbox)) throw new Error('sandboxOutput must be a JSON array')

  let productionPath
  if (brief.contentType === 'skills') {
    const cat = brief.options?.category ?? 'Physical'
    const file = `${cat.toLowerCase().replace(/\s+/g, '_')}.json`
    productionPath = join(root, 'src/data/content/skills', file)
  } else {
    throw new Error(`compare production path not implemented for ${brief.contentType}`)
  }

  const production = loadJson(productionPath)
  const prodById = new Map(production.map((r) => [r.id, r]))
  const sandboxIds = new Set(sandbox.map((r) => r.id))

  console.log(`Compare: ${brief.title}`)
  console.log(`  Sandbox:    ${sandboxPath}`)
  console.log(`  Production: ${productionPath}`)
  console.log('')

  let same = 0
  let different = 0
  let missingProd = 0

  for (const row of sandbox) {
    const prod = prodById.get(row.id)
    if (!prod) {
      missingProd++
      console.log(`  [missing in production] ${row.id}`)
      continue
    }
    const a = JSON.stringify(row, Object.keys(row).sort())
    const b = JSON.stringify(prod, Object.keys(prod).sort())
    if (a === b) {
      same++
      console.log(`  [identical] ${row.id}`)
    } else {
      different++
      const keys = new Set([...Object.keys(row), ...Object.keys(prod)])
      const delta = [...keys].filter((k) => JSON.stringify(row[k]) !== JSON.stringify(prod[k]))
      console.log(`  [diff] ${row.id} — fields: ${delta.join(', ')}`)
    }
  }

  const extraProd = [...prodById.keys()].filter((id) => {
    if (!sandboxIds.has(id)) {
      const p = prodById.get(id)
      const nb = (p.sources ?? []).some(
        (s) => s.reference === brief.book.reference && s.pageNumber >= 53 && s.pageNumber <= 55,
      )
      return nb
    }
    return false
  })

  console.log('')
  console.log(
    `Summary: ${same} identical · ${different} differ · ${missingProd} missing in production · ${extraProd.length} in production (pp. 53-55) not in sandbox`,
  )
  if (extraProd.length) {
    console.log(`  Production-only (53-55): ${extraProd.join(', ')}`)
  }
}

function printHelp() {
  console.log(`Ingest brief CLI

Commands:
  validate <brief.json>   Schema + semantic validation
  init <brief.json>       Create run state under src/data/source/ingest-briefs/runs/<id>/
  show <brief.json>       Human-readable brief summary
  status <brief-id>       Show run checklist, batches, open rulings
  compare <brief-id>      Diff sandboxOutput vs production catalog (skills)
  chunk --items "A,B,C" --size 6   Split item names into batch lines

Brief files live in: src/data/source/ingest-briefs/
Orchestrator playbook: docs/ingest/orchestrator.md
`)
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp()
    return
  }

  try {
    switch (cmd) {
      case 'validate': {
        const { brief, path } = loadBrief(rest[0])
        console.log(`OK  ${path} — ${brief.title}`)
        break
      }
      case 'init': {
        const { brief } = loadBrief(rest[0])
        initRun(brief)
        break
      }
      case 'show': {
        const { brief, path } = loadBrief(rest[0])
        showBrief(brief, path)
        break
      }
      case 'status':
        showStatus(rest[0])
        break
      case 'chunk':
        cmdChunk(rest)
        break
      case 'compare':
        cmdCompare(rest)
        break
      default:
        throw new Error(`Unknown command: ${cmd}`)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
