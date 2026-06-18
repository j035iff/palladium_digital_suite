import type { PalladiumOcc } from '../../types'
import { isGenreSupernaturalAbilitiesDisallowed } from '../genres'
import { isWhitelistedForHostGenre } from '../../lib/genreGating'
import { normalizePalladiumOcc } from '../../lib/occCatalogEngine'
import { occOffersSupernaturalCreation } from '../../lib/occSupernatural'

const occModules = import.meta.glob('../content/occs/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, PalladiumOcc[]>

function flattenOccCatalog(): PalladiumOcc[] {
  const byId = new Map<string, PalladiumOcc>()
  for (const [path, rows] of Object.entries(occModules)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row?.id) continue
      if (byId.has(row.id)) {
        throw new Error(
          `Duplicate O.C.C. id "${row.id}" in occ catalog (e.g. ${path})`,
        )
      }
      byId.set(row.id, normalizePalladiumOcc(row))
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export const PALLADIUM_OCC_CATALOG: readonly PalladiumOcc[] = flattenOccCatalog()

export function getPalladiumOccById(id: string): PalladiumOcc | undefined {
  return PALLADIUM_OCC_CATALOG.find((o) => o.id === id)
}

export function listPalladiumOccsForGameSystem(
  gameSystem: string,
): readonly PalladiumOcc[] {
  const g = gameSystem.toLowerCase()
  return PALLADIUM_OCC_CATALOG.filter((o) =>
    o.gameSystems.some((x) => x.toLowerCase() === g),
  )
}

/** Flat pool for creation: book rows tied to creation genre, excluding non-host whitelist rows. */
export function listPalladiumOccsForCreation(
  creationGenreId: string,
  hostGenreId: string,
): readonly PalladiumOcc[] {
  const creation = creationGenreId.toLowerCase()
  const mundaneOnly = isGenreSupernaturalAbilitiesDisallowed(creationGenreId)
  return PALLADIUM_OCC_CATALOG.filter(
    (o) =>
      o.gameSystems.some((x) => x.toLowerCase() === creation) &&
      isWhitelistedForHostGenre(o, hostGenreId) &&
      (!mundaneOnly || !occOffersSupernaturalCreation(o)),
  ).sort((a, b) => a.name.localeCompare(b.name))
}

export function listPalladiumOccsByType(
  occType: string,
): readonly PalladiumOcc[] {
  const t = occType.toLowerCase()
  return PALLADIUM_OCC_CATALOG.filter((o) => o.occType.toLowerCase() === t)
}
