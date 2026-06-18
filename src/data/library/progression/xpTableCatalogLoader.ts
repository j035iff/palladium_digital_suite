import type { PalladiumSourceRef, XPTable } from '../../../types'

export type PalladiumXpTable = {
  id: string
  /** Book table title (short label for UI). */
  name: string
  gameSystems: readonly string[]
  sources?: readonly PalladiumSourceRef[]
  maxLevel: number
  floors: readonly number[]
  /** Catalog O.C.C. ids that use this table; must match progression.xpTableId on each row. */
  occIds: readonly string[]
  /** Human-readable: book reference + O.C.C. list (include planned ids in notes when not yet in occIds). */
  notes: string
}

export type PalladiumXpTableBook = {
  id: string
  gameSystems: readonly string[]
  sources: readonly PalladiumSourceRef[]
  tables: readonly PalladiumXpTable[]
}

type XpTableBookModule = PalladiumXpTableBook
type XpTableSingleModule = PalladiumXpTable

const bookModules = import.meta.glob('../../content/progression/xp_tables/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, XpTableBookModule | XpTableSingleModule>

function isBookBundle(doc: XpTableBookModule | XpTableSingleModule): doc is PalladiumXpTableBook {
  return doc != null && typeof doc === 'object' && 'tables' in doc && Array.isArray(doc.tables)
}

function flattenXpTables(): PalladiumXpTable[] {
  const out: PalladiumXpTable[] = []
  for (const doc of Object.values(bookModules)) {
    if (isBookBundle(doc)) {
      for (const table of doc.tables) {
        out.push(table)
      }
    } else if (doc?.id) {
      out.push(doc as PalladiumXpTable)
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

export const XP_TABLE_CATALOG: readonly PalladiumXpTable[] = flattenXpTables()

const byId = new Map(XP_TABLE_CATALOG.map((t) => [t.id, t]))

/** Renamed catalog ids still referenced on saved characters or old OCC rows. */
export const LEGACY_XP_TABLE_ALIASES: Record<string, string> = {
  between_shadows_pab_psychic_agent: 'between_shadows_arcane_detective',
  standard: 'nightbane_core_doppleganger',
  psychic: 'nightbane_core_ashmedai_psychic_sorcerer',
  nightbane_core_ashmedai: 'nightbane_core_ashmedai_psychic_sorcerer',
  nightbane_core_psychic_pcc: 'nightbane_core_ashmedai_psychic_sorcerer',
  borg: 'nightbane_core_nightbane_guardian',
}

export function resolveXpTableCatalogId(id: string): string {
  return LEGACY_XP_TABLE_ALIASES[id] ?? id
}

export function getXpTableById(id: string): PalladiumXpTable | undefined {
  return byId.get(resolveXpTableCatalogId(id))
}

export function listXpTablesForGameSystem(gameSystem: string): readonly PalladiumXpTable[] {
  const g = gameSystem.toLowerCase()
  return XP_TABLE_CATALOG.filter((t) =>
    t.gameSystems.some((x) => x.toLowerCase() === g),
  )
}

export function toXpTable(row: PalladiumXpTable): XPTable {
  return { floors: [...row.floors] }
}
