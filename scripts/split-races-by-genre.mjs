/**
 * Migrate flat `races/{player,npc,gm_approval}.json` into `races/<genre>/` pools.
 * Run: npm run split:races
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RACE_POOL_FILES,
  loadRacesFromDir,
  removeLegacyFlatRacePools,
  writeRacePoolFile,
} from './lib/races-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const racesDir = join(root, 'src/data/content/races')

function loadLegacyFlat() {
  const byGenre = new Map()
  for (const poolFile of RACE_POOL_FILES) {
    const path = join(racesDir, poolFile)
    if (!existsSync(path)) continue
    const rows = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(rows)) throw new Error(`${poolFile} must be an array`)
    for (const row of rows) {
      if (!row?.id) continue
      const genres = row.gameSystems?.length ? row.gameSystems : ['nightbane']
      for (const genre of genres) {
        const pool = byGenre.get(genre) ?? {
          player: [],
          npc: [],
          gm_approval: [],
        }
        const audience = row.raceAudience ?? (poolFile === 'player.json' ? 'player' : poolFile.replace('.json', ''))
        const key = audience === 'gm_approval' ? 'gm_approval' : audience
        const copy = {
          ...row,
          raceAudience: audience,
          gameSystems: [genre],
          sources: (row.sources ?? []).filter((s) => s.gameSystem === genre),
        }
        if (copy.sources.length === 0 && row.sources?.[0]) {
          copy.sources = [{ ...row.sources[0], gameSystem: genre }]
        }
        pool[key].push(copy)
        byGenre.set(genre, pool)
      }
    }
  }
  return byGenre
}

const existing = loadRacesFromDir(racesDir)
if (existing.length > 0) {
  console.log(`Catalog already has ${existing.length} genre-scoped row(s) — skipping legacy migration body`)
} else {
  const byGenre = loadLegacyFlat()
  for (const [genre, pools] of byGenre) {
    const genreDir = join(racesDir, genre)
    writeRacePoolFile(genreDir, 'player.json', pools.player)
    writeRacePoolFile(genreDir, 'npc.json', pools.npc)
    writeRacePoolFile(genreDir, 'gm_approval.json', pools.gm_approval)
    console.log(
      `${genre}: player=${pools.player.length} npc=${pools.npc.length} gm_approval=${pools.gm_approval.length}`,
    )
  }
  removeLegacyFlatRacePools(racesDir)
  console.log('Removed legacy flat race pool files')
}

const total = loadRacesFromDir(racesDir)
console.log(`Race catalog: ${total.length} row(s) across genre folders`)
