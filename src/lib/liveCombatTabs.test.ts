import { describe, expect, it } from 'vitest'
import {
  COMBAT_SUB_TAB_LABELS,
  COMBAT_SUB_TAB_ORDER,
  isCombatSubTabId,
} from './liveCombatTabs'

describe('liveCombatTabs', () => {
  it('exposes Vitals · S/P/D · Abilities in Campaigns-style order', () => {
    expect(COMBAT_SUB_TAB_ORDER).toEqual(['vitals', 'spd', 'abilities'])
    expect(COMBAT_SUB_TAB_LABELS.vitals).toBe('Vitals')
    expect(COMBAT_SUB_TAB_LABELS.spd).toBe('S/P/D')
    expect(COMBAT_SUB_TAB_LABELS.abilities).toBe('Abilities')
  })

  it('type-guards sub-tab ids', () => {
    expect(isCombatSubTabId('vitals')).toBe(true)
    expect(isCombatSubTabId('spd')).toBe(true)
    expect(isCombatSubTabId('physical')).toBe(false)
    expect(isCombatSubTabId('notes')).toBe(false)
  })
})
