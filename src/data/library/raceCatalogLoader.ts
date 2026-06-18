import type { Race } from '../../types'
import type { RaceAudience } from '../../lib/raceCatalog'
import {
  normalizeRaceAudience,
  RACE_POOL_FILE_AUDIENCE,
} from '../../lib/raceCatalog'

/** Runtime genre scope — not stored in JSON rows. */
export type CatalogRace = Race & { catalogGenreId: string }

const raceModules = import.meta.glob('../content/races/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Race[]>

function parseGenreFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const marker = '/races/'
  const idx = normalized.indexOf(marker)
  if (idx < 0) {
    throw new Error(`Race pool path missing /races/ segment: ${path}`)
  }
  const after = normalized.slice(idx + marker.length)
  const genre = after.split('/')[0]
  if (!genre?.length) {
    throw new Error(`Race pool path missing genre folder: ${path}`)
  }
  return genre
}

function poolAudienceFromPath(path: string): RaceAudience {
  const file = path.split('/').pop() ?? path
  const mapped = RACE_POOL_FILE_AUDIENCE[file]
  if (!mapped) {
    throw new Error(
      `Unknown race pool file "${file}" — expected player.json, npc.json, or gm_approval.json`,
    )
  }
  return mapped
}

function flattenRaceCatalog(): CatalogRace[] {
  const byKey = new Map<string, CatalogRace>()
  for (const [path, rows] of Object.entries(raceModules)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Race pool ${path} must be a top-level JSON array`)
    }
    const catalogGenreId = parseGenreFromPath(path)
    const poolAudience = poolAudienceFromPath(path)
    for (const row of rows) {
      if (!row?.id) continue
      const key = `${catalogGenreId}:${row.id}`
      if (byKey.has(key)) {
        throw new Error(
          `Duplicate race id "${row.id}" in genre "${catalogGenreId}" (e.g. ${path})`,
        )
      }
      const raceAudience = normalizeRaceAudience(row, poolAudience)
      if (raceAudience !== poolAudience) {
        throw new Error(
          `Race "${row.id}" in ${path} has raceAudience "${raceAudience}" but file pool is "${poolAudience}"`,
        )
      }
      byKey.set(key, { ...row, raceAudience, catalogGenreId })
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const genreCmp = a.catalogGenreId.localeCompare(b.catalogGenreId)
    if (genreCmp !== 0) return genreCmp
    return a.id.localeCompare(b.id)
  })
}

export const PALLADIUM_RACE_CATALOG: readonly CatalogRace[] = flattenRaceCatalog()

const DEFAULT_DUPLICATE_GENRE = 'nightbane'

export function getPalladiumRaceById(
  id: string,
  genreId?: string,
): CatalogRace | undefined {
  if (genreId?.trim()) {
    const genre = genreId.toLowerCase()
    return PALLADIUM_RACE_CATALOG.find(
      (r) => r.id === id && r.catalogGenreId === genre,
    )
  }
  const matches = PALLADIUM_RACE_CATALOG.filter((r) => r.id === id)
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    return (
      matches.find((r) => r.catalogGenreId === DEFAULT_DUPLICATE_GENRE) ??
      matches[0]
    )
  }
  return undefined
}

export function listPalladiumRacesForGenre(
  genreId: string,
): readonly CatalogRace[] {
  const genre = genreId.toLowerCase()
  return PALLADIUM_RACE_CATALOG.filter((r) => r.catalogGenreId === genre)
}
