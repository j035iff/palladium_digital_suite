import { describe, expect, it } from 'vitest'
import {
  COMBAT_SUB_TAB_LABELS,
  COMBAT_SUB_TAB_ORDER,
  isCombatSubTabId,
} from './liveCombatTabs'

describe('liveCombatTabs', () => {
  it('exposes Vitals · Physical · Abilities in Campaigns-style order', () => {
    expect(COMBAT_SUB_TAB_ORDER).toEqual(['vitals', 'physical', 'abilities'])
    expect(COMBAT_SUB_TAB_LABELS.vitals).toBe('Vitals')
    expect(COMBAT_SUB_TAB_LABELS.physical).toBe('Physical')
    expect(COMBAT_SUB_TAB_LABELS.abilities).toBe('Abilities')
  })

  it('type-guards sub-tab ids', () => {
    expect(isCombatSubTabId('vitals')).toBe(true)
    expect(isCombatSubTabId('notes')).toBe(false)
  })
})
