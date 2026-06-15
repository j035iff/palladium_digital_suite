import { describe, expect, it } from 'vitest'
import {
  buildCreationAttributeBlock,
  buildCreationCombatBlock,
  buildCreationCombatLedger,
  buildCreationExceptionalStandardBlock,
  buildCreationExceptionalSuperGroups,
  buildCreationPhysicalStaging,
  buildCreationSavesBlock,
  LEDGER_NA,
  LEDGER_UNASSIGNED,
  resolveLedgerEffectiveAttributes,
} from './creationLiveLedger'
import { characterFixture } from '../data/characterFixture'
import { getRaceById } from '../data/library/registry'
import { getLibraryOccById } from '../data/library/registry'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import { getHandToHandSkillById } from '../data/library/handToHandCatalogLoader'

describe('creationLiveLedger', () => {
  it('aggregates boxing combat and staging bonuses', () => {
    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(attrs, ['skill_boxing'], 1)
    expect(combat.parry).toBeGreaterThanOrEqual(2)
    expect(combat.dodge).toBeGreaterThanOrEqual(2)
    expect(combat.attacksPerMelee).toBeGreaterThanOrEqual(3)

    const physical = buildCreationPhysicalStaging(['skill_boxing'])
    expect(physical.lines.some((l) => l.label === 'PS')).toBe(true)
    expect(physical.pendingDiceLines.some((l) => l.value === '3D6')).toBe(true)
  })

  it('keeps pull punch separate from roll w/ punch, fall, impact', () => {
    const attrs = characterFixture.facade.attributes
    const hth = createEmptyAccumulatedHandToHandBonuses()
    hth.pullPunch = 2
    hth.rollWithPunch = 3
    const combat = buildCreationCombatLedger(attrs, [], 1, hth)
    expect(combat.pullPunch).toBe(2)
    expect(combat.rollWithPunchFallImpact).toBe(3)

    const character = {
      ...characterFixture,
      creationHandToHandTier: 'basic' as const,
    }
    const block = buildCreationCombatBlock(
      character,
      'facade',
      attrs,
      combat,
      [],
      1,
      {},
      false,
      {},
      hth,
    )
    const rollLine = block.find((l) => l.label === 'Roll w/ punch, fall, impact')
    expect(rollLine).toBeDefined()
    expect(block.find((l) => l.label === 'Pull punch')?.value).toBe('+2')
    expect(block.find((l) => l.label === 'Attacks / melee')?.hint).toContain('Base: 2')
    expect(block.find((l) => l.label === 'Initiative')?.value).toBe(LEDGER_NA)
    expect(rollLine?.value).toBe('+3')
    expect(rollLine?.hint).toContain('HtH Basic')
  })

  it('starts attacks per melee at 2 with no bonuses', () => {
    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(attrs, [], 1)
    const block = buildCreationCombatBlock(
      characterFixture,
      'facade',
      attrs,
      combat,
      [],
      1,
      {},
      false,
      {},
    )
    expect(block.find((l) => l.label === 'Attacks / melee')?.value).toBe('2')
    expect(block.find((l) => l.label === 'Hand to Hand')?.value).toBe('None')
    expect(block.find((l) => l.label === 'Initiative')?.value).toBe(LEDGER_NA)
    expect(block.find((l) => l.label === 'Roll w/ punch, fall, impact')?.value).toBe(
      LEDGER_NA,
    )
  })

  it('shows N/A for inactive save bonuses', () => {
    const attrs = { ...characterFixture.facade.attributes, pe: 10, me: 10, iq: 10 }
    const saves = buildCreationSavesBlock(attrs, {}, characterFixture, 'facade')
    expect(saves.find((s) => s.label === 'Magic')?.value).toBe(LEDGER_NA)
    expect(saves.find((s) => s.label === 'Mind Control')?.value).toBe(LEDGER_NA)
  })

  it('shows dashes for unassigned attributes instead of placeholder tens', () => {
    const attrs = characterFixture.facade.attributes
    const unassigned = buildCreationAttributeBlock(attrs, {})
    expect(unassigned.every((line) => line.value === LEDGER_UNASSIGNED)).toBe(true)
    expect(unassigned.every((line) => line.inlineRaceRoll == null)).toBe(true)

    const human = getRaceById('race_human')
    const withRace = buildCreationAttributeBlock(attrs, {}, human)
    expect(withRace.every((line) => line.inlineRaceRoll === '3D6')).toBe(true)
    expect(withRace.every((line) => line.value === LEDGER_UNASSIGNED)).toBe(true)

    const partial = buildCreationAttributeBlock(
      { ...attrs, iq: 17, pe: 14 },
      { iq: 17, pe: 14 },
      human,
      undefined,
      undefined,
      [],
      {},
    )
    expect(partial.find((l) => l.label === 'I.Q.')?.value).toBe('17')
    expect(partial.find((l) => l.label === 'I.Q.')?.inlineRaceRoll).toBe('3D6')
    expect(partial.find((l) => l.label === 'P.E.')?.value).toBe('14')
    expect(partial.find((l) => l.label === 'M.E.')?.value).toBe(LEDGER_UNASSIGNED)
  })

  it('shows full attribute breakdown on hover when bonuses apply', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const block = buildCreationAttributeBlock(
      characterFixture.facade.attributes,
      { ps: 10 },
      human,
      occ,
      undefined,
      [],
      {},
    )
    const ps = block.find((line) => line.label === 'P.S.')
    expect(ps?.value).toBe('11')
    expect(ps?.valueModified).toBe(true)
    expect(ps?.valueTooltip).toBe('(Roll 10, O.C.C. +1)')
  })

  it('exceptional P.E. bonuses use effective attribute total', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const effective = resolveLedgerEffectiveAttributes(
      characterFixture.facade.attributes,
      { pe: 18 },
      human,
      occ,
      undefined,
      ['skill_running'],
      {},
    )
    expect(effective.pe).toBe(19)
    const exceptional = buildCreationExceptionalStandardBlock(effective)
    const coma = exceptional.find((line) => line.label === 'P.E. save vs coma / death')
    expect(coma?.value).toBe('+8%')
  })

  it('shows O.C.C. flat bonuses in the value and dice under grouped rows', () => {
    const attrs = characterFixture.facade.attributes
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_ex_government_agent')
    const block = buildCreationAttributeBlock(attrs, {}, human, occ)
    const ps = block.find((l) => l.label === 'P.S.')
    expect(ps?.inlineRaceRoll).toBe('3D6')
    expect(ps?.value).toBe('1')
    expect(ps?.valueModified).toBe(true)
    expect(block.find((l) => l.label === 'I.Q.')?.inlineRaceRoll).toBe('3D6')
  })

  it('shows O.C.C. bonuses without a race and attribute minimums in red suffixes', () => {
    const attrs = characterFixture.facade.attributes
    const occ = getLibraryOccById('occ_ex_government_agent')
    const block = buildCreationAttributeBlock(attrs, {}, undefined, occ)
    const ps = block.find((l) => l.label === 'P.S.')
    expect(ps?.inlineRaceRoll).toBeUndefined()
    expect(ps?.value).toBe('1')
    expect(block.find((l) => l.label === 'I.Q.')?.inlineRaceRoll).toBeUndefined()
    expect(block.find((l) => l.label === 'I.Q.')?.labelSuffix).toBe('12+')
  })

  it('lists standard exceptional rows starting at 17', () => {
    const low = buildCreationExceptionalStandardBlock({
      ...characterFixture.facade.attributes,
      iq: 16,
      me: 16,
      pp: 16,
    })
    expect(low.find((l) => l.label === 'I.Q. skill bonus')?.value).toBe(LEDGER_NA)

    const high = buildCreationExceptionalStandardBlock({
      ...characterFixture.facade.attributes,
      iq: 17,
    })
    expect(high.find((l) => l.label === 'I.Q. skill bonus')?.value).toBe('+3%')
    expect(high.find((l) => l.label === 'I.Q. perception bonus')?.value).toBe('+1')
  })

  it('HtH basic roll w/ punch does not double-count pull punch', () => {
    const basic = getHandToHandSkillById('hth_basic')
    expect(basic).toBeDefined()
    const hth = accumulateHandToHandBonuses(basic!, 1)
    expect(hth.rollWithPunch).toBe(2)
    expect(hth.pullPunch).toBe(2)

    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(attrs, [], 1, hth)
    expect(combat.rollWithPunchFallImpact).toBe(2)
    expect(combat.pullPunch).toBe(2)

    const block = buildCreationCombatBlock(
      { ...characterFixture, creationHandToHandTier: 'basic' as const },
      'facade',
      attrs,
      combat,
      [],
      1,
      {},
      false,
      {},
      hth,
    )
    expect(
      block.find((l) => l.label === 'Roll w/ punch, fall, impact')?.value,
    ).toBe('+2')
    expect(block.find((l) => l.label === 'Pull punch')?.value).toBe('+2')
  })

  it('shows boxing parry in combat breakdown with catalog attribution', () => {
    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(attrs, ['skill_boxing'], 1)
    const block = buildCreationCombatBlock(
      characterFixture,
      'facade',
      attrs,
      combat,
      ['skill_boxing'],
      1,
      {},
      false,
      {},
    )
    const parry = block.find((l) => l.label === 'Parry')
    expect(parry?.value).toBe('+2')
    expect(parry?.hint).toBe('Skills: +2')
    expect(parry?.skillDetailTooltip).toBe('Boxing: +2')
    expect(parry?.valueTooltip).toBe('(Boxing +2)')
  })

  it('aggregates multiple skill sources into one Skills line with hover detail', () => {
    const attrs = characterFixture.facade.attributes
    const combat = buildCreationCombatLedger(
      attrs,
      ['skill_boxing', 'skill_athletics_general'],
      1,
    )
    const block = buildCreationCombatBlock(
      characterFixture,
      'facade',
      attrs,
      combat,
      ['skill_boxing', 'skill_athletics_general'],
      1,
      {},
      false,
      {},
    )
    const parry = block.find((l) => l.label === 'Parry')
    expect(parry?.value).toBe('+3')
    expect(parry?.hint).toBe('Skills: +3')
    expect(parry?.skillDetailTooltip).toBe(
      'Boxing: +2 · Athletics (general): +1',
    )
    expect(parry?.valueTooltip).toBe('(Boxing +2, Athletics (general) +1)')
  })

  it('includes effective P.S. in hand-to-hand damage', () => {
    const attrs = characterFixture.facade.attributes
    const belowThreshold = buildCreationCombatLedger(
      attrs,
      [],
      1,
      undefined,
      undefined,
      { effectivePs: 16 },
    )
    const atThreshold = buildCreationCombatLedger(
      attrs,
      [],
      1,
      undefined,
      undefined,
      { effectivePs: 17 },
    )
    const withSkillBoost = buildCreationCombatLedger(
      attrs,
      ['skill_body_building_weight_lifting'],
      1,
      undefined,
      undefined,
      { effectivePs: 19 },
    )
    expect(belowThreshold.handToHandDamage).toBe(0)
    expect(atThreshold.handToHandDamage).toBe(2)
    expect(withSkillBoost.handToHandDamage).toBe(4)

    const block = buildCreationCombatBlock(
      {
        ...characterFixture,
        creationAttributeAssignments: { ps: 17 },
      },
      'facade',
      attrs,
      withSkillBoost,
      ['skill_body_building_weight_lifting'],
      1,
      {},
      false,
      {},
      undefined,
      undefined,
      undefined,
      19,
    )
    const damageLine = block.find((l) => l.label === 'Hand-to-hand damage (P.S.)')
    expect(damageLine?.value).toBe('+4')
    expect(damageLine?.hint).toContain('P.S.')
  })

  it('includes hand-to-hand damage bonuses in the combat ledger total', () => {
    const attrs = characterFixture.facade.attributes
    const hth = createEmptyAccumulatedHandToHandBonuses()
    hth.damage = 2
    const combat = buildCreationCombatLedger(
      attrs,
      [],
      7,
      hth,
      undefined,
      { effectivePs: 18 },
    )
    expect(combat.handToHandDamage).toBe(5)

    const block = buildCreationCombatBlock(
      characterFixture,
      'facade',
      attrs,
      combat,
      [],
      7,
      {},
      false,
      {},
      hth,
      undefined,
      undefined,
      18,
    )
    const damageLine = block.find((l) => l.label === 'Hand-to-hand damage (P.S.)')
    expect(damageLine?.value).toBe('+5')
    expect(damageLine?.hint).toContain('Hand-to-hand')
  })

  it('only shows 31+ exceptional groups for attributes above 30', () => {
    const groups = buildCreationExceptionalSuperGroups({
      ...characterFixture.facade.attributes,
      iq: 32,
      me: 20,
      pe: 30,
    })
    expect(groups.some((g) => g.title === 'I.Q. (31+)')).toBe(true)
    expect(groups.some((g) => g.title === 'M.E. (31+)')).toBe(false)
    expect(groups.some((g) => g.title === 'P.E. (31+)')).toBe(false)
  })
})
