import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { resolveAttacksPerMelee, resolveCharacterMaxApm } from './meleeCombat'
import { createEmptyAccumulatedHandToHandBonuses } from '../utils/combatCalculator'

describe('meleeCombat', () => {
  it('resolves full APM stack from parts', () => {
    const stack = resolveAttacksPerMelee(
      characterFixture.primary.attributes,
      1,
      2,
      1,
      1,
      2,
    )
    expect(stack).toEqual({
      core: 4,
      skillApm: 1,
      traitApm: 1,
      baseApm: 2,
      total: 8,
    })
  })

  it('resolves live max APM at PC base when no modifiers apply', () => {
    const total = resolveCharacterMaxApm(
      characterFixture,
      'primary',
      false,
      createEmptyAccumulatedHandToHandBonuses(),
      {},
    )
    expect(total).toBe(2)
  })
})
