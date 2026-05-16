import type { PalladiumOcc } from '../../types'
import { normalizePalladiumOcc } from '../../lib/occCatalogEngine'
import palladiumOccs from '../content/palladiumOccs.json'

function loadOccs(): readonly PalladiumOcc[] {
  const rows = palladiumOccs as unknown
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizePalladiumOcc(row as PalladiumOcc))
}

export const PALLADIUM_OCC_CATALOG: readonly PalladiumOcc[] = loadOccs()

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

export function listPalladiumOccsByType(
  occType: string,
): readonly PalladiumOcc[] {
  const t = occType.toLowerCase()
  return PALLADIUM_OCC_CATALOG.filter((o) => o.occType.toLowerCase() === t)
}
