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

/**
 * Capsule geometry for the Level overlay vial (`h-64 w-16` → radius/height).
 * Fill at exact floor covers only the bottom rounded cap; at next−1 the flat
 * fill line sits just under the top cap (Joe mockup 07 states 1 + 5).
 */
export const XP_VIAL_BOTTOM_CAP_PCT = 12.5
export const XP_VIAL_TOP_BAND_PCT = 87.5
/** Visible rise once XP exceeds the level floor (mockup state 2). */
export const XP_VIAL_ABOVE_FLOOR_MIN_PCT = 15.5

export type LiveSheetXpVialModel = {
  level: number
  currentXp: number
  floorXp: number
  /** Next level threshold, or null at cap. */
  nextThresholdXp: number | null
  /** Visual fill % (capsule band; mockup states 1–5). */
  fillPct: number
  /** XP at/below current-level floor — black min + next only, no white current. */
  atExactFloor: boolean
  /** White current XP label rides just under the fill line when past floor. */
  showCurrentXp: boolean
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
 * Vial fill = capsule band from bottom rounded cap → just under top cap.
 * Joe mockup 07: (1) exact floor → bottom cap only, no white current;
 * (2) floor+1 → slight rise + white current under fill line;
 * (3–4) mid progress; (5) next−1 → nearly full, current near black next.
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
  const atNearMax =
    nextThresholdXp != null && input.totalXp >= nextThresholdXp - 1

  let fillPct: number
  if (nextThresholdXp == null) {
    fillPct = 100
  } else if (atExactFloor) {
    fillPct = XP_VIAL_BOTTOM_CAP_PCT
  } else if (atNearMax) {
    fillPct = XP_VIAL_TOP_BAND_PCT
  } else {
    // Map (floor, next−1] into [above-floor min, top band].
    const spanToMax = Math.max(1, nextThresholdXp - 1 - floorXp)
    const t = Math.min(
      1,
      Math.max(0, (input.totalXp - floorXp) / spanToMax),
    )
    fillPct =
      XP_VIAL_ABOVE_FLOOR_MIN_PCT +
      t * (XP_VIAL_TOP_BAND_PCT - XP_VIAL_ABOVE_FLOOR_MIN_PCT)
  }

  return {
    level,
    currentXp: input.totalXp,
    floorXp,
    nextThresholdXp,
    fillPct: Math.round(fillPct * 10) / 10,
    atExactFloor,
    showCurrentXp: !atExactFloor,
    chartRows: buildLiveSheetXpChartRows(level, input.table),
    citation: formatLiveSheetXpTableCitation(input.catalog),
    tableName: input.catalog?.name?.trim() || 'Experience table',
  }
}
