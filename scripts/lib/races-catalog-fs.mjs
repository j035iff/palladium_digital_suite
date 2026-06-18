/**
 * Genre-split race catalog I/O — `content/races/<genre>/{player,npc,gm_approval}.json`
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

export const RACE_POOL_FILES = ['player.json', 'npc.json', 'gm_approval.json']

export const RACE_POOL_AUDIENCE = {
  'player.json': 'player',
  'npc.json': 'npc',
  'gm_approval.json': 'gm_approval',
}

export function parseGenreFromRacePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const marker = '/races/'
  const idx = normalized.indexOf(marker)
  if (idx < 0) return null
  const after = normalized.slice(idx + marker.length)
  const genre = after.split('/')[0]
  return genre?.length ? genre : null
}

export function parsePoolFileFromRacePath(filePath) {
  const file = filePath.replace(/\\/g, '/').split('/').pop() ?? ''
  return RACE_POOL_FILES.includes(file) ? file : null
}

export function loadRacesFromDir(racesDir) {
  if (!existsSync(racesDir)) return []
  const rows = []
  const keyToPath = new Map()
  const genreDirs = readdirSync(racesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  for (const genre of genreDirs) {
    const genrePath = join(racesDir, genre)
    for (const poolFile of RACE_POOL_FILES) {
      const poolPath = join(genrePath, poolFile)
      if (!existsSync(poolPath)) continue
      const parsed = JSON.parse(readFileSync(poolPath, 'utf8'))
      if (!Array.isArray(parsed)) {
        throw new Error(`${genre}/${poolFile} must be a top-level JSON array`)
      }
      for (const row of parsed) {
        if (!row?.id) continue
        const key = `${genre}:${row.id}`
        if (keyToPath.has(key)) {
          throw new Error(
            `Duplicate race id "${row.id}" in genre "${genre}" (${poolFile} and ${keyToPath.get(key)})`,
          )
        }
        keyToPath.set(key, `${genre}/${poolFile}`)
        rows.push({ ...row, catalogGenreId: genre })
      }
    }
  }
  return rows
}

export function writeRacePoolFile(genreDir, poolFile, rows) {
  mkdirSync(genreDir, { recursive: true })
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(join(genreDir, poolFile), `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
}

export function removeLegacyFlatRacePools(racesDir) {
  for (const poolFile of RACE_POOL_FILES) {
    const legacy = join(racesDir, poolFile)
    if (existsSync(legacy)) unlinkSync(legacy)
  }
}
