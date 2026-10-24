import { describe, expect, it } from 'vitest'
import {
  COMBAT_SUB_TAB_LABELS,
  COMBAT_SUB_TAB_ORDER,
  DEFAULT_COMBAT_SUB_TAB,
  isCombatSubTabId,
  normalizeCombatSubTabId,
} from './liveCombatTabs'

describe('liveCombatTabs', () => {
  it('exposes Action · Abilities · Vitals in order with Action default', () => {
    expect(COMBAT_SUB_TAB_ORDER).toEqual(['action', 'abilities', 'vitals'])
    expect(DEFAULT_COMBAT_SUB_TAB).toBe('action')
    expect(COMBAT_SUB_TAB_LABELS.action).toBe('Action')
    expect(COMBAT_SUB_TAB_LABELS.abilities).toBe('Abilities')
    expect(COMBAT_SUB_TAB_LABELS.vitals).toBe('Vitals')
  })

  it('type-guards current sub-tab ids', () => {
    expect(isCombatSubTabId('action')).toBe(true)
    expect(isCombatSubTabId('abilities')).toBe(true)
    expect(isCombatSubTabId('vitals')).toBe(true)
    expect(isCombatSubTabId('spd')).toBe(false)
    expect(isCombatSubTabId('physical')).toBe(false)
    expect(isCombatSubTabId('notes')).toBe(false)
  })

  it('migrates legacy spd / physical ids to action', () => {
    expect(normalizeCombatSubTabId('spd')).toBe('action')
    expect(normalizeCombatSubTabId('physical')).toBe('action')
    expect(normalizeCombatSubTabId('action')).toBe('action')
    expect(normalizeCombatSubTabId('vitals')).toBe('vitals')
    expect(normalizeCombatSubTabId('abilities')).toBe('abilities')
    expect(normalizeCombatSubTabId(undefined)).toBe('action')
    expect(normalizeCombatSubTabId('bogus')).toBe('action')
  })
})
