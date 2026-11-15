import { describe, expect, it } from 'vitest'
import { STANDARD_XP_TABLE } from '../data/xpTables'
import {
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

  it('vial fill handles exact floor and near-max edge cases', () => {
    const floor = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 2000,
      table: STANDARD_XP_TABLE,
    })
    expect(floor.atExactFloor).toBe(true)
    expect(floor.fillPct).toBeGreaterThanOrEqual(4)
    expect(floor.floorXp).toBe(2000)

    const nearMax = buildLiveSheetXpVialModel({
      level: 2,
      totalXp: 3999,
      table: STANDARD_XP_TABLE,
    })
    expect(nearMax.atExactFloor).toBe(false)
    expect(nearMax.fillPct).toBeGreaterThanOrEqual(96)
  })
})
