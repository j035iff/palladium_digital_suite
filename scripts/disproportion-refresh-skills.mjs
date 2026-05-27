/** Re-apply skill modifier migration to disproportion leaf tables only. */
import { migrateEntrySkillModifiers } from './migrate-morphus-skill-modifiers.mjs'
import { loadJson, resolveRepoPath, writeJson } from './lib/morphus-ingest-shared.mjs'

const files = [
  'src/data/content/morphus/tables/disproportion_head.json',
  'src/data/content/morphus/tables/disproportion_arms_hands.json',
  'src/data/content/morphus/tables/disproportion_legs_feet.json',
  'src/data/content/morphus/tables/disproportion_torso.json',
]

for (const rel of files) {
  const path = resolveRepoPath(rel)
  const doc = loadJson(path)
  let n = 0
  for (const entry of doc.entries ?? []) {
    if (migrateEntrySkillModifiers(entry).changed) n += 1
  }
  writeJson(path, doc)
  console.log(`OK  ${rel} — ${n} skill modifier row(s) refreshed`)
}
