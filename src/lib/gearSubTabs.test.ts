import { describe, expect, it } from 'vitest'
import {
  GEAR_SUB_TAB_LABELS,
  GEAR_SUB_TAB_ORDER,
  buildGearSubTabViews,
} from './gearSubTabs'

describe('gearSubTabs', () => {
  it('defines four sub-tabs in display order', () => {
    expect(GEAR_SUB_TAB_ORDER).toEqual(['weapons', 'armor', 'artifacts', 'other'])
    expect(GEAR_SUB_TAB_LABELS.weapons).toBe('Weapons')
    expect(GEAR_SUB_TAB_LABELS.other).toBe('Other')
  })

  it('marks the active sub-tab in forge views', () => {
    const views = buildGearSubTabViews('armor')
    const armor = views.find((v) => v.id === 'armor')
    const weapons = views.find((v) => v.id === 'weapons')
    expect(armor?.visual).toBe('active')
    expect(armor?.isViewing).toBe(true)
    expect(weapons?.visual).toBe('available')
    expect(weapons?.isViewing).toBe(false)
  })
})
