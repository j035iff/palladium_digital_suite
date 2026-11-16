import { describe, expect, it } from 'vitest'
import { STANDARD_XP_TABLE } from '../data/xpTables'
import {
  XP_VIAL_ABOVE_FLOOR_MIN_PCT,
  XP_VIAL_BOTTOM_CAP_PCT,
  XP_VIAL_TOP_BAND_PCT,
  buildLiveSheetXpChartRows,
  buildLiveSheetXpVialModel,
  formatLiveSheetXpChartRange,
} from './liveSheetXpOverlay'

describe('liveSheetXpOverlay', () => {
  it('builds 15 chart rows with passed/current/future tones', () => {
    const rows = buildLiveSheetXpChartRows(2, STANDARD_XP_TABLE)
    expect(rows).toHaveLength(15)
    expect(rows[0]?.tone).toBe('passed')
    expect(rows[1]?.tone).toBe('current')
    expect(rows[2]?.tone).toBe('future')
    expect(formatLiveSheetXpChartRange(rows[0]!)).toMatch(/0/)
  })

  it('vial fill matches mockup states 1–5 (floor → next−1)', () => {
    // Level 2: floor 2000, next 4000 (STANDARD_XP_TABLE)
    const floor = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 2000,
      table: STANDARD_XP_TABLE,
    })
    expect(floor.atExactFloor).toBe(true)
    expect(floor.showCurrentXp).toBe(false)
    expect(floor.fillPct).toBe(XP_VIAL_BOTTOM_CAP_PCT)
    expect(floor.floorXp).toBe(2000)
    expect(floor.nextThresholdXp).toBe(4000)

    const minPlusOne = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 2001,
      table: STANDARD_XP_TABLE,
    })
    expect(minPlusOne.atExactFloor).toBe(false)
    expect(minPlusOne.showCurrentXp).toBe(true)
    expect(minPlusOne.fillPct).toBeGreaterThan(XP_VIAL_BOTTOM_CAP_PCT)
    expect(minPlusOne.fillPct).toBeLessThanOrEqual(XP_VIAL_ABOVE_FLOOR_MIN_PCT + 0.5)

    const lowerMid = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 2500,
      table: STANDARD_XP_TABLE,
    })
    expect(lowerMid.showCurrentXp).toBe(true)
    expect(lowerMid.fillPct).toBeGreaterThan(minPlusOne.fillPct)
    expect(lowerMid.fillPct).toBeLessThan(XP_VIAL_TOP_BAND_PCT)

    const upperMid = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 3200,
      table: STANDARD_XP_TABLE,
    })
    expect(upperMid.fillPct).toBeGreaterThan(lowerMid.fillPct)
    expect(upperMid.fillPct).toBeLessThan(XP_VIAL_TOP_BAND_PCT)

    const nearMax = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 3999,
      table: STANDARD_XP_TABLE,
    })
    expect(nearMax.atExactFloor).toBe(false)
    expect(nearMax.showCurrentXp).toBe(true)
    expect(nearMax.fillPct).toBe(XP_VIAL_TOP_BAND_PCT)
  })
})
