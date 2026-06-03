import type { Race } from '../../types'
import type { RaceAudience } from '../../lib/raceCatalog'
import {
  normalizeRaceAudience,
  RACE_POOL_FILE_AUDIENCE,
} from '../../lib/raceCatalog'

const raceModules = import.meta.glob('../content/races/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Race[]>

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

function flattenRaceCatalog(): Race[] {
  const byId = new Map<string, Race>()
  for (const [path, rows] of Object.entries(raceModules)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Race pool ${path} must be a top-level JSON array`)
    }
    const poolAudience = poolAudienceFromPath(path)
    for (const row of rows) {
      if (!row?.id) continue
      if (byId.has(row.id)) {
        throw new Error(
          `Duplicate race id "${row.id}" in race catalog (e.g. ${path})`,
        )
      }
      const raceAudience = normalizeRaceAudience(row, poolAudience)
      if (raceAudience !== poolAudience) {
        throw new Error(
          `Race "${row.id}" in ${path} has raceAudience "${raceAudience}" but file pool is "${poolAudience}"`,
        )
      }
      byId.set(row.id, { ...row, raceAudience })
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export const PALLADIUM_RACE_CATALOG: readonly Race[] = flattenRaceCatalog()

export function getPalladiumRaceById(id: string): Race | undefined {
  return PALLADIUM_RACE_CATALOG.find((r) => r.id === id)
}
