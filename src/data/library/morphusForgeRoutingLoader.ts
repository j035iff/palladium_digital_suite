import type {
  MorphusForgeManifest,
  MorphusForgeRoutingEntry,
  MorphusForgeSlotRequirement,
  PalladiumMorphusForgeRoutingTable,
} from '../../types'
import { getMorphusTableById } from './morphusTableCatalogLoader'

import appearanceTable from '../content/morphus/forge/appearance.json'
import characteristicsTable from '../content/morphus/forge/characteristics.json'
import forgeManifest from '../content/morphus/forge/manifest.json'

export const MORPHUS_FORGE_MANIFEST = forgeManifest as MorphusForgeManifest

export const MORPHUS_APPEARANCE_ROUTING_TABLE =
  appearanceTable as PalladiumMorphusForgeRoutingTable

export const MORPHUS_CHARACTERISTICS_ROUTING_TABLE =
  characteristicsTable as PalladiumMorphusForgeRoutingTable

const ROUTING_BY_ID = new Map<string, PalladiumMorphusForgeRoutingTable>([
  [MORPHUS_APPEARANCE_ROUTING_TABLE.id, MORPHUS_APPEARANCE_ROUTING_TABLE],
  [MORPHUS_CHARACTERISTICS_ROUTING_TABLE.id, MORPHUS_CHARACTERISTICS_ROUTING_TABLE],
])

export function getMorphusForgeRoutingTableById(
  id: string,
): PalladiumMorphusForgeRoutingTable | undefined {
  return ROUTING_BY_ID.get(id)
}

export function listMorphusForgeRoutingTables(): readonly PalladiumMorphusForgeRoutingTable[] {
  return [MORPHUS_APPEARANCE_ROUTING_TABLE, MORPHUS_CHARACTERISTICS_ROUTING_TABLE]
}

/** Player-facing characteristic / appearance rows (excludes `playerSelectable: false`). */
export function isMorphusForgeRoutingEntryPlayerSelectable(
  entry: MorphusForgeRoutingEntry,
): boolean {
  return entry.playerSelectable !== false
}

export function listPlayerSelectableMorphusForgeRoutingEntries(
  table: PalladiumMorphusForgeRoutingTable,
): MorphusForgeRoutingEntry[] {
  return table.entries.filter(isMorphusForgeRoutingEntryPlayerSelectable)
}

/** Resolve appearance/characteristics percentile row by 1–100 roll. */
export function resolveMorphusForgeRoutingEntry(
  table: PalladiumMorphusForgeRoutingTable,
  percentileRoll: number,
): MorphusForgeRoutingEntry | undefined {
  const roll = Math.min(100, Math.max(1, Math.round(percentileRoll)))
  return table.entries.find(
    (entry) =>
      isMorphusForgeRoutingEntryPlayerSelectable(entry) &&
      roll >= entry.percentile.min &&
      roll <= entry.percentile.max,
  )
}

function collectTableIdsFromSlot(slot: MorphusForgeSlotRequirement): string[] {
  switch (slot.kind) {
    case 'required':
    case 'repeat':
      return [slot.tableId]
    case 'choice':
      return slot.options.map((o) => o.tableId)
    case 'combination_pool':
      return slot.pool.map((p) => p.tableId)
    case 'characteristics_multiplier':
      return ['characteristics']
    default:
      return []
  }
}

/** Trait table ids referenced by a routing entry (excluding self-referential `characteristics`). */
export function morphusForgeTraitTableIdsForEntry(
  entry: MorphusForgeRoutingEntry,
): string[] {
  const ids = new Set<string>()
  for (const slot of entry.slotPlan) {
    for (const id of collectTableIdsFromSlot(slot)) {
      if (id !== 'characteristics') ids.add(id)
    }
  }
  return [...ids]
}

/** Validate that every non-routing table id resolves in the trait catalog. */
export function validateMorphusForgeRoutingTableRefs(
  table: PalladiumMorphusForgeRoutingTable,
): string[] {
  const missing: string[] = []
  for (const entry of table.entries) {
    for (const tableId of morphusForgeTraitTableIdsForEntry(entry)) {
      if (!getMorphusTableById(tableId) && !ROUTING_BY_ID.has(tableId)) {
        missing.push(`${entry.id} → ${tableId}`)
      }
    }
  }
  return missing
}
