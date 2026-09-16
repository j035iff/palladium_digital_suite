import { describe, expect, it } from 'vitest'
import {
  buildGearForgeLaneViews,
  GEAR_FORGE_LANE_ORDER,
  gearForgeLaneNaReason,
} from './gearForge'

describe('gearForge navigation', () => {
  it('keeps all four lanes visible', () => {
    expect(GEAR_FORGE_LANE_ORDER).toEqual([
      'weapons',
      'armor',
      'artifacts',
      'other',
    ])
    const views = buildGearForgeLaneViews('weapons')
    expect(views).toHaveLength(4)
    expect(views.every((v) => v.clickable)).toBe(true)
    expect(gearForgeLaneNaReason('weapons')).toBeNull()
    expect(gearForgeLaneNaReason('armor')).toMatch(/not wired/i)
  })
})
