import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import {
  buildCreationStatStack,
  buildFacadeAggregatedAttributeInput,
  buildFacadeAttributeStatStack,
  formatFacadeAttributeStackTooltip,
  formatMorphusRelativeStatTooltip,
  pendingBlockHasUnresolvedRolls,
  resolveAggregatedAttribute,
  resolveCombatDerivedStat,
  resolveDerivedStat,
  resolveFacadeAggregatedAttribute,
  resolveFacadeAttributeSnapshot,
  resolveHitPointsDerivedStat,
  resolveMorphusAggregatedAttribute,
  statStackTotal,
} from './creationStatEngine'
import { buildPendingDiceBlocks } from './spawnDiceBlocks'
import { getPpBonuses } from './attributeBonuses'

describe('resolveAggregatedAttribute (Tier 1)', () => {
  it('sums modifier terms then applies constant', () => {
    const result = resolveAggregatedAttribute({
      terms: [
        { kind: 'race_dice', label: 'Race roll', amount: 12 },
        { kind: 'occ_flat', label: 'O.C.C.', amount: 1 },
      ],
      constant: 1,
    })
    expect(result.preConstant).toBe(13)
    expect(result.total).toBe(13)
  })

  it('applies post-sum constant multiplier', () => {
    const result = resolveAggregatedAttribute({
      terms: [{ kind: 'race_dice', label: 'Race roll', amount: 14 }],
      constant: 0.5,
    })
    expect(result.preConstant).toBe(14)
    expect(result.total).toBe(7)
  })

  it('builds facade terms from pool + OCC + skills', () => {
    const input = buildFacadeAggregatedAttributeInput({
      poolRoll: 10,
      flatBreakdown: [{ label: 'O.C.C.', amount: 1 }],
      occVariableBonus: 0,
      enteredSkillDice: [],
    })
    expect(resolveAggregatedAttribute(input).total).toBe(11)
  })
})

describe('resolveDerivedStat (Tier 2)', () => {
  it('combines attr portion, exceptional, and modifiers', () => {
    const result = resolveDerivedStat({
      aggregatedAttribute: 18,
      attrConstant1: 0,
      exceptionalModifier: 3,
      terms: [{ kind: 'skill_flat', label: 'Skills', amount: 2 }],
    })
    expect(result.total).toBe(5)
  })

  it('applies attrConstant1 before exceptional (e.g. PE × 2 vitals)', () => {
    const result = resolveDerivedStat({
      aggregatedAttribute: 14,
      attrConstant1: 2,
      exceptionalModifier: 0,
      terms: [{ kind: 'skill_dice', label: 'H.P. dice', amount: 6 }],
    })
    expect(result.attrPortion).toBe(28)
    expect(result.total).toBe(34)
  })

  it('applies constant2 on the final sum', () => {
    const result = resolveDerivedStat({
      aggregatedAttribute: 20,
      attrConstant1: 0,
      exceptionalModifier: 4,
      terms: [],
      constant2: 0.5,
    })
    expect(result.total).toBe(2)
  })
})

describe('resolveHitPointsDerivedStat', () => {
  it('Facade H.P. = aggregated P.E. × 1 + level dice', () => {
    const result = resolveHitPointsDerivedStat({
      aggregatedPe: 12,
      form: 'primary',
      levelDiceTotal: 4,
    })
    expect(result.attrPortion).toBe(12)
    expect(result.total).toBe(16)
  })

  it('Morphus H.P. = morphus aggregated P.E. × 2 + level dice', () => {
    const result = resolveHitPointsDerivedStat({
      aggregatedPe: 22,
      form: 'morphus',
      levelDiceTotal: 8,
    })
    expect(result.attrPortion).toBe(44)
    expect(result.total).toBe(52)
  })

  it('uses schema-compiled attrConstant1 when provided (e.g. PE*3 race)', () => {
    const result = resolveHitPointsDerivedStat({
      aggregatedPe: 10,
      attrConstant1: 3,
      levelDiceTotal: 4,
    })
    expect(result.attrPortion).toBe(30)
    expect(result.total).toBe(34)
  })
})

describe('resolveMorphusAggregatedAttribute', () => {
  it('uses Facade aggregated total as baseline plus Race bump', () => {
    const result = resolveMorphusAggregatedAttribute({
      facadeAggregated: 12,
      raceBump: 10,
      traitDeltas: [],
    })
    expect(result.total).toBe(22)
  })
})

describe('resolveCombatDerivedStat', () => {
  it('uses P.P. exceptional table for strike', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const attrs = { ...character.primary.attributes, pp: 18 }
    const strike = resolveCombatDerivedStat({
      kind: 'combat',
      combatKey: 'strike',
      attrs,
      skillAmount: 2,
    })
    expect(strike.total).toBe(getPpBonuses(18).strike + 2)
  })
})

describe('buildFacadeAttributeStatStack', () => {
  it('omits exceptional bucket (Tier 2 only)', () => {
    const stack = buildFacadeAttributeStatStack({
      flatBreakdown: [{ label: 'O.C.C.', amount: 1 }],
      occVariableBonus: 0,
      enteredSkillDice: [],
      poolRoll: 12,
    })
    expect(stack.some((term) => term.bucket === 'exceptional')).toBe(false)
  })
})

describe('formatMorphusRelativeStatTooltip', () => {
  it('uses Race label for universal Nightbane bumps', () => {
    expect(
      formatMorphusRelativeStatTooltip(12, [{ label: 'Race', amount: 10 }]),
    ).toBe('Facade 12, Race +10')
  })
})

describe('resolveFacadeAttributeSnapshot', () => {
  it('flags unresolved attribute dice on Review', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { spd: 14 },
      creationSecondarySkillPicks: [
        { instanceId: 'ath', skillId: 'skill_athletics_general' },
      ],
    }
    const blocks = buildPendingDiceBlocks(character, race, occ, {
      psychicTier: 'major',
      supportsDualForm: false,
    })
    const pendingById = Object.fromEntries(blocks.map((block) => [block.id, block]))
    const spdBlock = pendingById.attr_spd
    expect(spdBlock).toBeDefined()
    expect(pendingBlockHasUnresolvedRolls(spdBlock, {})).toBe(true)

    const snapshot = resolveFacadeAttributeSnapshot(
      'spd',
      character.creationAttributeAssignments,
      race,
      occ,
      undefined,
      ['skill_athletics_general'],
      {},
      {},
      {},
      spdBlock,
      {},
    )
    expect(snapshot.hasPendingRolls).toBe(true)
    expect(snapshot.valueTooltip).toContain('+pending rolls')
  })
})

describe('resolveFacadeAggregatedAttribute', () => {
  it('returns null when nothing is assigned', () => {
    expect(
      resolveFacadeAggregatedAttribute({
        poolRoll: null,
        flatBreakdown: [],
        occVariableBonus: 0,
        enteredSkillDice: [],
      }),
    ).toBeNull()
  })
})
