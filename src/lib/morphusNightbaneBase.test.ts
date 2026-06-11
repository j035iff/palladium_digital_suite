import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from './characterRoot'
import { applyNightbaneMorphusBaseAttributes } from './morphusNightbaneBase'

describe('applyNightbaneMorphusBaseAttributes', () => {
  it('adds R.C.C. morphus attribute bonuses on top of facade assignments', () => {
    let root = createBlankCharacterForGenre('nightbane')
    root = {
      ...root,
      creationAttributeAssignments: {
        ps: 12,
        pe: 14,
        pp: 11,
        spd: 10,
      },
    }
    const next = applyNightbaneMorphusBaseAttributes(root, undefined)
    expect(next.morphus.attributes.ps.score).toBe(22)
    expect(next.morphus.attributes.pe).toBe(24)
    expect(next.morphus.attributes.pp).toBe(17)
    expect(next.morphus.attributes.spd).toBe(20)
    expect(next.morphus.attributes.ps.tier).toBe('supernatural')
  })
})
