import { describe, expect, it } from 'vitest'
import {
  combatDefenseBeatsStrike,
  resolveOpposedRoll,
  saveRollSucceeds,
} from './opposedRollRules'

describe('resolveOpposedRoll', () => {
  it('gives combat ties to the defender', () => {
    expect(resolveOpposedRoll(12, 12, 'combat_defense')).toBe('defender')
    expect(resolveOpposedRoll(13, 12, 'combat_defense')).toBe('attacker')
    expect(resolveOpposedRoll(12, 13, 'combat_defense')).toBe('defender')
  })

  it('gives save ties to the saver', () => {
    expect(resolveOpposedRoll(12, 12, 'save')).toBe('defender')
    expect(resolveOpposedRoll(12, 11, 'save')).toBe('attacker')
    expect(resolveOpposedRoll(12, 13, 'save')).toBe('defender')
  })
})

describe('saveRollSucceeds', () => {
  it('succeeds when d20 + bonus meets or beats the target', () => {
    expect(saveRollSucceeds(8, 4, 12)).toBe(true)
    expect(saveRollSucceeds(7, 4, 12)).toBe(false)
    expect(saveRollSucceeds(8, 3, 12)).toBe(false)
  })

  it('awards ties to the saver', () => {
    expect(saveRollSucceeds(7, 5, 12)).toBe(true)
    expect(saveRollSucceeds(6, 5, 12)).toBe(false)
  })
})

describe('combatDefenseBeatsStrike', () => {
  it('awards ties to the defender', () => {
    expect(combatDefenseBeatsStrike(12, 12)).toBe(true)
    expect(combatDefenseBeatsStrike(13, 12)).toBe(false)
    expect(combatDefenseBeatsStrike(12, 13)).toBe(true)
  })
})
