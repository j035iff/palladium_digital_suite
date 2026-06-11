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
    for (const variant of entry.variantPercentiles ?? []) {
      const merged = mergeVariantIntoCharacteristic(entry, variant)
      characteristicById.set(`${entry.id}::variant:${variant.roll}`, merged)
      characteristicById.set(`${entry.id}::variant:${variant.label}`, merged)
    }
  }
}

function mergeVariantIntoCharacteristic(
  entry: MorphusCharacteristic,
  variant: NonNullable<MorphusCharacteristic['variantPercentiles']>[number],
): MorphusCharacteristic {
  return {
    ...entry,
    name: `${entry.name} (${variant.label})`,
    description: variant.description ?? entry.description,
    statModifiers: {
      ...(entry.statModifiers ?? {}),
      ...(variant.statModifiers ?? {}),
    },
    skillModifiers: {
      ...(entry.skillModifiers ?? {}),
      ...(variant.skillModifiers ?? {}),
    },
    sensory: {
      ...(entry.sensory ?? {}),
      ...(variant.sensory ?? {}),
    },
    mobility: {
      ...(entry.mobility ?? {}),
      ...(variant.mobility ?? {}),
    },
    limbDurability: variant.limbDurability ?? entry.limbDurability,
    naturalWeapons: variant.naturalWeapons ?? entry.naturalWeapons,
    weightModifier: variant.weightModifier ?? entry.weightModifier,
    customOneOffs: [
      ...(entry.customOneOffs ?? []),
      ...(variant.customOneOffs ?? []),
    ],
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

/** Resolve a trait-table row by main-table d100 roll (01 = 1, 00 = 100). */
export function resolveMorphusTraitEntryByPercentile(
  tableId: string,
  percentileRoll: number,
): MorphusCharacteristic | undefined {
  const table = getMorphusTableById(tableId)
  if (!table || table.kind !== 'morphus_trait_table') return undefined
  const roll = Math.min(100, Math.max(1, Math.round(percentileRoll)))
  return table.entries.find((entry) => {
    const band = entry.percentile
    return band != null && roll >= band.min && roll <= band.max
  })
}

/** Entries with percentile bands, sorted for Sub-Forge display. */
export function listMorphusTraitEntriesWithPercentiles(
  tableId: string,
): MorphusCharacteristic[] {
  const table = getMorphusTableById(tableId)
  if (!table) return []
  return [...table.entries]
    .filter((entry) => entry.percentile != null)
    .sort((a, b) => (a.percentile!.min ?? 0) - (b.percentile!.min ?? 0))
}
