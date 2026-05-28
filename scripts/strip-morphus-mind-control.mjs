#!/usr/bin/env node
/** One-off / maintenance: strip mind-control prose from all Morphus table JSON. */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  sanitizeMorphusEntryForNightbane,
  stripMindControlFromMorphusProse,
} from './lib/morphus-nightbane-prose.mjs'
import { loadJson, repoRoot, writeJson } from './lib/morphus-ingest-shared.mjs'

const tablesDir = join(repoRoot, 'src/data/content/morphus/tables')
let filesChanged = 0
let entriesChanged = 0

for (const name of readdirSync(tablesDir).filter((f) => f.endsWith('.json'))) {
  const path = join(tablesDir, name)
  const doc = loadJson(path)
  let changed = false
  for (const entry of doc.entries ?? []) {
    const before = JSON.stringify(entry)
    if (entry.description) {
      entry.description = stripMindControlFromMorphusProse(entry.description)
    }
    sanitizeMorphusEntryForNightbane(entry)
    if (JSON.stringify(entry) !== before) {
      entriesChanged += 1
      changed = true
    }
  }
  if (changed) {
    writeJson(path, doc)
    filesChanged += 1
    console.log(`OK  ${name}`)
  }
}

console.log(`Done — ${entriesChanged} entr(ies) updated in ${filesChanged} file(s).`)
