/**
 * Structure Disproportion leaf tables from survival_guide extract sections.
 *
 *   npm run morphus:ingest -- extract disproportion
 *   node scripts/disproportion-structure-subtables.mjs [--force]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  enrichMorphusEntry,
  matchBlockForEntry,
  splitTraitBlocks,
} from './lib/morphus-transcribe-structure.mjs'
import { migrateEntrySkillModifiers } from './migrate-morphus-skill-modifiers.mjs'
import {
  getMorphusValidators,
  loadJson,
  repoRoot,
  resolveRepoPath,
  writeJson,
} from './lib/morphus-ingest-shared.mjs'

const force = process.argv.includes('--force')
const fillOnly = !force

const SECTIONS = [
  {
    id: 'disproportion_head',
    marker: 'Disproportionate Head',
    targetJson: 'src/data/content/morphus/tables/disproportion_head.json',
  },
  {
    id: 'disproportion_arms_hands',
    marker: 'Disproportionate Arms & Hands',
    targetJson: 'src/data/content/morphus/tables/disproportion_arms_hands.json',
  },
  {
    id: 'disproportion_legs_feet',
    marker: 'Disproportionate Legs & Feet',
    targetJson: 'src/data/content/morphus/tables/disproportion_legs_feet.json',
  },
  {
    id: 'disproportion_torso',
    marker: 'Disproportionate Torso',
    targetJson: 'src/data/content/morphus/tables/disproportion_torso.json',
  },
]

const BLEED_MARKERS = [
  'Disproportionate Arms & Hands',
  'Disproportionate Legs & Feet',
  'Disproportionate Torso',
  'Disproportionate Head',
]

function traitBodyToDescription(body) {
  let text = body.replace(/^\d{2}-\d{2}%\s+[^:]+:\s*/i, '').replace(/\s+/g, ' ').trim()
  for (const marker of BLEED_MARKERS) {
    const idx = text.indexOf(marker)
    if (idx > 40) text = text.slice(0, idx).trim()
  }
  return text
}

function splitAuthoritativeSections(fullText) {
  const positions = SECTIONS.map((s) => ({
    ...s,
    index: fullText.indexOf(s.marker),
  })).filter((s) => s.index >= 0)
  positions.sort((a, b) => a.index - b.index)
  const out = {}
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index
    const end =
      i + 1 < positions.length ? positions[i + 1].index : fullText.length
    out[positions[i].id] = fullText.slice(start, end)
  }
  return out
}

function blocksForSection(sectionText) {
  return splitTraitBlocks(sectionText)
}

const authPath = join(
  repoRoot,
  'src/data/source/morphus-ingest/disproportion/extracted-authoritative.txt',
)
if (!existsSync(authPath)) {
  console.error(`Missing ${authPath} — run: npm run morphus:ingest -- extract disproportion`)
  process.exit(1)
}

const fullText = readFileSync(authPath, 'utf8')
const sections = splitAuthoritativeSections(fullText)
const { validateCharacteristic, validateTableDoc } = getMorphusValidators()

let totalChanged = 0
const unmatched = []

for (const section of SECTIONS) {
  const sectionText = sections[section.id]
  if (!sectionText) {
    console.error(`ERR section not found in extract: ${section.marker}`)
    process.exitCode = 1
    continue
  }
  const blocks = blocksForSection(sectionText)
  const path = resolveRepoPath(section.targetJson)
  const doc = loadJson(path)
  let changed = 0

  for (const entry of doc.entries ?? []) {
    const block = matchBlockForEntry(blocks, entry)
    if (!block) {
      unmatched.push({ section: section.id, id: entry.id, name: entry.name })
      continue
    }
    const before = JSON.stringify(entry)
    enrichMorphusEntry(entry, block.body, {
      fillOnly,
      descriptionText: traitBodyToDescription(block.body),
    })
    migrateEntrySkillModifiers(entry)
    if (JSON.stringify(entry) !== before) changed += 1
  }

  writeJson(path, doc)
  if (!validateTableDoc(doc)) {
    process.exitCode = 1
    continue
  }
  for (const entry of doc.entries ?? []) {
    if (!validateCharacteristic(entry)) {
      console.error(`ERR validate failed: ${entry.id}`)
      process.exitCode = 1
    }
  }
  totalChanged += changed
  console.log(
    `OK  ${section.id} — ${changed}/${doc.entries?.length ?? 0} rows structured (${blocks.length} blocks in section)`,
  )
}

if (unmatched.length) {
  console.log(`WARN ${unmatched.length} unmatched:`)
  for (const u of unmatched) console.log(`  ${u.section}: ${u.name} (${u.id})`)
}

console.log(`Done — ${totalChanged} entr(ies) updated across sub-tables (force=${force}).`)
