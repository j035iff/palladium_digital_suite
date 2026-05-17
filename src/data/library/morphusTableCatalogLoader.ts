import type { PalladiumMorphusTable } from '../../types'

const tableModules = import.meta.glob('../content/morphus/tables/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, PalladiumMorphusTable>

function loadMorphusTableCatalog(): readonly PalladiumMorphusTable[] {
  return Object.values(tableModules).sort((a, b) => a.id.localeCompare(b.id))
}

/** Morphus tables — one JSON per file under `src/data/content/morphus/tables/`. */
export const MORPHUS_TABLE_CATALOG: readonly PalladiumMorphusTable[] =
  loadMorphusTableCatalog()

const byId = new Map(MORPHUS_TABLE_CATALOG.map((t) => [t.id, t]))

export function getMorphusTableById(id: string): PalladiumMorphusTable | undefined {
  return byId.get(id)
}

export function listMorphusTableIds(): readonly string[] {
  return MORPHUS_TABLE_CATALOG.map((t) => t.id)
}

export function listMorphusCategoryHubs(): readonly PalladiumMorphusTable[] {
  return MORPHUS_TABLE_CATALOG.filter((t) => t.kind === 'category_hub')
}

export function listMorphusTraitTables(): readonly PalladiumMorphusTable[] {
  return MORPHUS_TABLE_CATALOG.filter((t) => t.kind === 'morphus_trait_table')
}
