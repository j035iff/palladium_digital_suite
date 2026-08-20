import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { createBlankCharacterForGenre } from './characterRoot'
import {
  buildDisplayAttributesForLiveEngine,
  buildLiveCombatContext,
  displayPeMeToAttributes,
  resolveLiveAttributeSaveBonus,
  resolveLiveCharacterMaxApm,
  resolveLiveCombatStatDetails,
  resolveLiveRollWithImpactDetails,
  resolveLivePullPunchDetails,
} from './liveStatEngine'
import { aggregateAllPassiveModifiers } from './featureEngine'
import { computeDisplayScalars } from './sheetBonuses'
import { physicalSkillAttributeFlatsAlreadyBaked } from './skillModifiers'
import { resolveExceptionalDisplayValue } from './creationStatEngine'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import { getHandToHandSkillById } from '../data/library/handToHandCatalogLoader'

describe('buildDisplayAttributesForLiveEngine', () => {
  it('adds physical skill attribute flats via passive modifiers for legacy finalized primary saves', () => {
    let legacy = createBlankCharacterForGenre('nightbane')
    legacy = {
      ...legacy,
      isFinalized: true,
      physicalSkillModsApplied: false,
      creationSecondarySkillPicks: [
        { instanceId: 'acro', skillId: 'skill_acrobatics' },
      ],
    }
    const basePp = legacy.primary.attributes.pp
    const passive = aggregateAllPassiveModifiers(legacy, 'primary')
    const display = buildDisplayAttributesForLiveEngine(legacy, 'primary', passive)
    expect(display.pp).toBe(basePp + 1)
    expect(display.pe).toBe(legacy.primary.attributes.pe + 1)
    expect(display.ps.score).toBe(legacy.primary.attributes.ps.score + 1)
    expect(computeDisplayScalars(legacy, 'primary', passive).pp).toBe(basePp + 1)
  })

  it('does not double-count skill flats when spawn already baked primary attributes', () => {
    let baked = createBlankCharacterForGenre('nightbane')
    baked = {
      ...baked,
      isFinalized: true,
      physicalSkillModsApplied: true,
      primary: {
        ...baked.primary,
        attributes: {
          ...baked.primary.attributes,
          pp: baked.primary.attributes.pp + 1,
        },
      },
      creationSecondarySkillPicks: [
        { instanceId: 'acro', skillId: 'skill_acrobatics' },
      ],
    }
    const passive = aggregateAllPassiveModifiers(baked, 'primary')
    expect(passive.pp ?? 0).toBe(0)
    const display = buildDisplayAttributesForLiveEngine(baked, 'primary', passive)
    expect(display.pp).toBe(baked.primary.attributes.pp)
    expect(physicalSkillAttributeFlatsAlreadyBaked(baked, 'primary')).toBe(true)
  })
})

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

describe('resolveLiveRollWithImpactDetails', () => {
  it('keeps pull punch separate from roll w/ impact (no double HtH stack)', () => {
    const expert = getHandToHandSkillById('hth_expert')
    expect(expert).toBeDefined()
    const accumulated = accumulateHandToHandBonuses(expert!, 1)
    expect(accumulated.rollWithPunch).toBe(2)
    expect(accumulated.pullPunch).toBe(2)

    const ctx = buildLiveCombatContext(characterFixture, 'primary', {
      handToHand: {
        skillName: expert!.name,
        accumulated,
      },
    })

    const roll = resolveLiveRollWithImpactDetails(ctx)
    const pull = resolveLivePullPunchDetails(ctx)

    expect(roll.total).toBe(2)
    expect(pull.total).toBe(2)
    expect(roll.total).not.toBe(roll.total + pull.total)
    expect(roll.lines.some((line) => line.label.includes('HtH'))).toBe(true)
    expect(roll.lines.filter((line) => line.label.includes('HtH'))).toHaveLength(1)
  })
})
