/**
 * Level / XP overlay — vertical vial math + 1–15 chart rows + book citation.
 * Unified Path with `xpTables.ts` floors; no parallel progression math.
 */

import type {
  PalladiumOcc,
  PalladiumSourceRef,
  Race,
  XPTable,
} from '../types'
import {
  LEVEL_CAP,
  nextLevelThresholdXp,
  xpFloorForCharacterLevel,
  xpProgressTowardNext,
} from '../data/xpTables'
import { formatPalladiumSourceCitation } from './formatPalladiumSources'
import {
  getXpTableById,
  type PalladiumXpTable,
} from '../data/library/progression/xpTableCatalogLoader'
import { occXpTableId } from './occCatalogEngine'

export type LiveSheetXpChartRow = {
  level: number
  /** Inclusive floor XP for this level. */
  floorXp: number
  /** Inclusive ceiling (next floor − 1), or null at cap when unbounded. */
  ceilingXp: number | null
  /** passed | current | future — Radical Visibility: future stays readable. */
  tone: 'passed' | 'current' | 'future'
}

export type LiveSheetXpVialModel = {
  level: number
  currentXp: number
  floorXp: number
  /** Next level threshold, or null at cap. */
  nextThresholdXp: number | null
  /** 0..100 fill within current level span (edge cases match mockup). */
  fillPct: number
  /** At exact floor: show only bottom label inside the tip fill. */
  atExactFloor: boolean
  chartRows: LiveSheetXpChartRow[]
  /** Book citation for the XP table when catalog has sources. */
  citation: string
  tableName: string
}

function formatXp(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatLiveSheetXpAmount(n: number): string {
  return formatXp(n)
}

export function buildLiveSheetXpChartRows(
  level: number,
  table: XPTable,
): LiveSheetXpChartRow[] {
  const rows: LiveSheetXpChartRow[] = []
  for (let L = 1; L <= LEVEL_CAP; L++) {
    const floorXp = xpFloorForCharacterLevel(L, table)
    const next = nextLevelThresholdXp(L, table)
    const ceilingXp = next == null ? null : next - 1
    const tone: LiveSheetXpChartRow['tone'] =
      L < level ? 'passed' : L === level ? 'current' : 'future'
    rows.push({ level: L, floorXp, ceilingXp, tone })
  }
  return rows
}

export function formatLiveSheetXpChartRange(row: LiveSheetXpChartRow): string {
  const lo = formatXp(row.floorXp)
  if (row.ceilingXp == null) return `${lo}+`
  return `${lo} - ${formatXp(row.ceilingXp)}`
}

export function resolveLiveSheetXpTableCatalog(input: {
  occXpTableId?: string | null
  libraryOcc?: PalladiumOcc | null
  race?: Race | undefined
}): PalladiumXpTable | undefined {
  const fromOcc =
    input.libraryOcc != null
      ? occXpTableId(input.libraryOcc, input.race)
      : null
  const id = (input.occXpTableId || fromOcc || '').trim()
  if (!id) return undefined
  return getXpTableById(id)
}

export function formatLiveSheetXpTableCitation(
  catalog: PalladiumXpTable | undefined,
): string {
  const sources = catalog?.sources as readonly PalladiumSourceRef[] | undefined
  if (sources?.length) {
    return sources.map(formatPalladiumSourceCitation).filter(Boolean).join(' · ')
  }
  return catalog?.name?.trim() || ''
}

/**
 * Vial fill = progress from current-level floor → next-level floor.
 * Edge cases: exact floor → tiny tip fill; near max → almost full.
 */
export function buildLiveSheetXpVialModel(input: {
  level: number
  totalXp: number
  table: XPTable
  catalog?: PalladiumXpTable | undefined
}): LiveSheetXpVialModel {
  const level = Math.max(1, Math.min(LEVEL_CAP, Math.floor(input.level)))
  const progress = xpProgressTowardNext(level, input.totalXp, input.table)
  const floorXp = progress.floorXp
  const nextThresholdXp = progress.nextThresholdXp
  const atExactFloor = input.totalXp <= floorXp
  // Keep a visible tip at exact floor (mockup edge case 1).
  let fillPct = progress.pct
  if (nextThresholdXp == null) {
    fillPct = 100
  } else if (atExactFloor) {
    fillPct = Math.max(fillPct, 4)
  } else if (input.totalXp >= nextThresholdXp - 1) {
    fillPct = Math.min(98, Math.max(fillPct, 96))
  }

  return {
    level,
    currentXp: input.totalXp,
    floorXp,
    nextThresholdXp,
    fillPct,
    atExactFloor,
    chartRows: buildLiveSheetXpChartRows(level, input.table),
    citation: formatLiveSheetXpTableCitation(input.catalog),
    tableName: input.catalog?.name?.trim() || 'Experience table',
  }
}
