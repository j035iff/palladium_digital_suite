import type { EncounterArchetype } from '../../lib/encounterArchetypes'

/** Runtime genre scope — not stored in JSON rows. */
export type CatalogEncounterArchetype = EncounterArchetype & {
  catalogGenreId: string
}

const encounterModules = import.meta.glob('../content/encounters/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, EncounterArchetype[]>

function parseGenreFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const marker = '/encounters/'
  const idx = normalized.indexOf(marker)
  if (idx < 0) {
    throw new Error(`Encounter pool path missing /encounters/ segment: ${path}`)
  }
  const after = normalized.slice(idx + marker.length)
  const genre = after.split('/')[0]
  if (!genre?.length) {
    throw new Error(`Encounter pool path missing genre folder: ${path}`)
  }
  return genre
}

function flattenEncounterCatalog(): CatalogEncounterArchetype[] {
  const byKey = new Map<string, CatalogEncounterArchetype>()
  for (const [path, rows] of Object.entries(encounterModules)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Encounter pool ${path} must be a top-level JSON array`)
    }
    const catalogGenreId = parseGenreFromPath(path)
    for (const row of rows) {
      if (!row?.id) continue
      const key = `${catalogGenreId}:${row.id}`
      if (byKey.has(key)) {
        throw new Error(
          `Duplicate encounter archetype id "${row.id}" in genre "${catalogGenreId}" (e.g. ${path})`,
        )
      }
      byKey.set(key, { ...row, catalogGenreId })
    }
  }
  return [...byKey.values()]
}

const CATALOG = flattenEncounterCatalog()

export function listEncounterArchetypes(genreId?: string): CatalogEncounterArchetype[] {
  if (!genreId) return CATALOG
  return CATALOG.filter((row) => row.catalogGenreId === genreId)
}

export function getEncounterArchetypeById(
  id: string,
  genreId: string,
): CatalogEncounterArchetype | undefined {
  return CATALOG.find((row) => row.id === id && row.catalogGenreId === genreId)
}
