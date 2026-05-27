import type { MorphusCharacteristic, PalladiumMorphusTable } from '../../types'

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

const characteristicById = new Map<string, MorphusCharacteristic>()
for (const table of MORPHUS_TABLE_CATALOG) {
  for (const entry of table.entries) {
    characteristicById.set(entry.id, entry)
  }
}

export function getMorphusTableById(id: string): PalladiumMorphusTable | undefined {
  return byId.get(id)
}

/** Leaf trait tables that declare `parentTable` equal to `hubId`. */
export function listMorphusChildTables(hubId: string): readonly PalladiumMorphusTable[] {
  return MORPHUS_TABLE_CATALOG.filter(
    (t) => t.kind === 'morphus_trait_table' && t.parentTable === hubId,
  )
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

export function getMorphusCharacteristicById(
  id: string,
): MorphusCharacteristic | undefined {
  return characteristicById.get(id)
}

export function resolveMorphusCharacteristicsByIds(
  ids: readonly string[],
): MorphusCharacteristic[] {
  const out: MorphusCharacteristic[] = []
  for (const id of ids) {
    const row = characteristicById.get(id)
    if (row) out.push(row)
  }
  return out
}
