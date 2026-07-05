import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import {
  buildLiveCombatContext,
  displayPeMeToAttributes,
  resolveLiveAttributeSaveBonus,
  resolveLiveCharacterMaxApm,
  resolveLiveCombatStatDetails,
} from './liveStatEngine'
import { resolveExceptionalDisplayValue } from './creationStatEngine'
import { createEmptyAccumulatedHandToHandBonuses } from '../utils/combatCalculator'

describe('resolveLiveCharacterMaxApm', () => {
  it('starts at 2 with no modifiers', () => {
    expect(
      resolveLiveCharacterMaxApm(
        characterFixture,
        'primary',
        false,
        createEmptyAccumulatedHandToHandBonuses(),
        {},
      ),
    ).toBe(2)
  })
})

describe('resolveLiveCombatStatDetails', () => {
  it('uses P.P. exceptional table via stat engine for strike', () => {
    const ctx = buildLiveCombatContext(characterFixture, 'primary')
    const strike = resolveLiveCombatStatDetails(ctx, 'strike')
    expect(strike.total).toBeGreaterThanOrEqual(0)
    const hasPpLine = strike.lines.some(
      (line) => line.label === 'P.P. natural' || line.label === 'P.P.',
    )
    expect(hasPpLine || strike.total === 0).toBe(true)
  })
})

describe('resolveLiveAttributeSaveBonus', () => {
  it('matches resolveExceptionalDisplayValue for P.E. save', () => {
    const attrs = displayPeMeToAttributes(18, 12)
    expect(resolveLiveAttributeSaveBonus('pe_save', attrs)).toBe(
      resolveExceptionalDisplayValue('pe_save', attrs),
    )
  })
})

describe('initiative uses spec stack not Spd/P.E. divide', () => {
  it('omits Spd and P.E. divide-by-10 terms', () => {
    const ctx = buildLiveCombatContext(characterFixture, 'primary')
    const initiative = resolveLiveCombatStatDetails(ctx, 'initiative')
    expect(initiative.lines.some((line) => line.label.includes('Spd'))).toBe(
      false,
    )
    expect(initiative.lines.some((line) => line.label.includes('P.E.'))).toBe(
      false,
    )
  })
})
