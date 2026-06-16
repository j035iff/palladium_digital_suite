import { describe, expect, it } from 'vitest'
import { nightbaneBecomingLevelBonus } from './nightbaneBecomingSave'

describe('nightbaneBecomingLevelBonus', () => {
  it('matches Nightbane RPG progression (+1 at 1st, +1 per two levels)', () => {
    expect(nightbaneBecomingLevelBonus(1)).toBe(1)
    expect(nightbaneBecomingLevelBonus(2)).toBe(1)
    expect(nightbaneBecomingLevelBonus(3)).toBe(2)
    expect(nightbaneBecomingLevelBonus(4)).toBe(2)
    expect(nightbaneBecomingLevelBonus(5)).toBe(3)
    expect(nightbaneBecomingLevelBonus(11)).toBe(6)
  })
})
