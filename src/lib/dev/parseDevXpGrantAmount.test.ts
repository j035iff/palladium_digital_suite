import { describe, expect, it } from 'vitest'
import {
  DEV_XP_GRANT_HISTORY_LABEL,
  parseDevXpGrantAmount,
} from './parseDevXpGrantAmount'
import {
  newlyCrossedLevels,
  STANDARD_XP_TABLE,
} from '../../data/xpTables'

describe('parseDevXpGrantAmount', () => {
  it('accepts positive whole numbers and comma-grouped values', () => {
    expect(parseDevXpGrantAmount('1')).toBe(1)
    expect(parseDevXpGrantAmount(' 2500 ')).toBe(2500)
    expect(parseDevXpGrantAmount('2,000')).toBe(2000)
  })

  it('rejects empty, zero, negative, fractional, and non-numeric input', () => {
    expect(parseDevXpGrantAmount('')).toBeNull()
    expect(parseDevXpGrantAmount('   ')).toBeNull()
    expect(parseDevXpGrantAmount('0')).toBeNull()
    expect(parseDevXpGrantAmount('-10')).toBeNull()
    expect(parseDevXpGrantAmount('1.5')).toBeNull()
    expect(parseDevXpGrantAmount('abc')).toBeNull()
    expect(parseDevXpGrantAmount('2e3')).toBeNull()
  })

  it('exports a stable debug history label', () => {
    expect(DEV_XP_GRANT_HISTORY_LABEL).toBe('Debug XP')
  })
})

describe('newlyCrossedLevels (debug grant path)', () => {
  it('queues level-ups when cumulative XP crosses floors (shared grantXp math)', () => {
    // Level 1 at 0 XP → grant 2000 crosses level 2 floor on STANDARD table.
    expect(newlyCrossedLevels(1, 0, 2000, STANDARD_XP_TABLE)).toEqual([2])
    // Large debug dump can cross multiple thresholds at once.
    expect(newlyCrossedLevels(1, 0, 6500, STANDARD_XP_TABLE)).toEqual([2, 3, 4])
    // Already past the floor: no re-queue.
    expect(newlyCrossedLevels(2, 2000, 2500, STANDARD_XP_TABLE)).toEqual([])
  })
})
