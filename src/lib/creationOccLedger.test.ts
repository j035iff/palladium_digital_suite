import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import {
  buildCreationAttributeBlock,
  buildCreationCombatBlock,
  buildCreationCombatLedger,
  buildCreationSavesBlock,
  buildCreationVitalsBlock,
} from './creationLiveLedger'
import { buildPendingDiceBlocks } from './spawnDiceBlocks'
import type { HorrorFactorProfile } from './saveProfile'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import { getHandToHandSkillById } from '../data/library/handToHandCatalogLoader'

const EMPTY_HORROR_FACTOR_PROFILE: HorrorFactorProfile = {
  total: null,
  contributions: [],
  tooltipEquation: '',
}

describe('creation OCC live ledger integration', () => {
  const human = getRaceById('race_human')
  const pab = getLibraryOccById('occ_pab_psychic_agent')
  const hthBasic = getHandToHandSkillById('hth_basic')

  it('surfaces P.A.B. Psychic Agent bonuses when O.C.C. and race are selected', () => {
    const character = {
      ...characterFixture,
      creationHandToHandTier: 'basic' as const,
    }
    const attrs = character.primary.attributes
    const hth = hthBasic
      ? accumulateHandToHandBonuses(hthBasic, 1)
      : createEmptyAccumulatedHandToHandBonuses()

    const attributes = buildCreationAttributeBlock(attrs, {}, human, pab, undefined, [])
    expect(attributes.find((l) => l.label === 'M.E.')?.labelSuffix).toBe('11+')
    expect(attributes.find((l) => l.label === 'P.S.')?.inlineRaceRoll).toBe('3D6')
    expect(attributes.find((l) => l.label === 'P.S.')?.value).toBe('1')
    expect(
      buildCreationAttributeBlock(
        { ...attrs, ps: { ...attrs.ps, score: 11 } },
        { ps: 10 },
        human,
        pab,
        undefined,
        [],
      ).find((l) => l.label === 'P.S.')?.value,
    ).toBe('11')
    expect(attributes.find((l) => l.label === 'Spd')?.diceGroups?.[0]?.display).toBe('1D6')

    const vitals = buildCreationVitalsBlock({
      character,
      attrs,
      race: human,
      occ: pab,
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    expect(vitals.find((l) => l.label === 'H.P.')?.value).toBe('—')

    const vitalsWithPe = buildCreationVitalsBlock({
      character: {
        ...character,
        creationAttributeAssignments: { pe: 11 },
      },
      attrs: { ...attrs, pe: 11 },
      race: human,
      occ: pab,
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    const hp = vitalsWithPe.find((l) => l.label === 'H.P.')
    expect(hp?.value).toBe('11')
    expect(hp?.valueModified).toBe(true)
    expect(hp?.valueTooltip).toBe('(PE 11)')

    const hpRollId = buildPendingDiceBlocks(
      {
        ...character,
        creationAttributeAssignments: { pe: 11 },
      },
      human,
      pab,
      { psychicTier: 'major' },
    )
      .find((block) => block.id === 'hp')
      ?.groups.flatMap((group) => group.rolls)
      .find((roll) => roll.id.includes('.per_level.'))?.id

    const vitalsWithHpRoll = buildCreationVitalsBlock({
      character: {
        ...character,
        creationAttributeAssignments: { pe: 11 },
        creationPendingDiceResolutions: { [hpRollId!]: 5 },
      },
      attrs: { ...attrs, pe: 11 },
      race: human,
      occ: pab,
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    expect(vitalsWithHpRoll.find((l) => l.label === 'H.P.')?.valueTooltip).toBe(
      '(PE 11, perLevel(1D6) 5)',
    )
    expect(hp?.hint).toBe('P.E. + 1D6/level')

    const ppeMagic = buildCreationVitalsBlock({
      character: {
        ...character,
        creationAttributeAssignments: { pe: 12 },
      },
      attrs: { ...attrs, pe: 12 },
      race: human,
      occ: {
        ...pab!,
        ppeEngine: {
          baseFormula: 'PEx10 + 2D6',
          perLevelFormula: '1D6',
          progressionRoadmap: [],
        },
      },
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    const ppe = ppeMagic.find((l) => l.label === 'P.P.E.')
    expect(ppe?.value).toBe('120')
    expect(ppe?.valueModified).toBe(true)
    expect(ppe?.valueTooltip).toBe('(PE(12) × 10)')
    expect(ppe?.hint).toBe('2D6 + PEx10 + 2D6 (+1D6/level)')

    const sdcDiceGroups = vitals.find((l) => l.label === 'S.D.C.')?.diceGroups ?? []
    expect(sdcDiceGroups.find((g) => g.kind === 'race')?.display).toBe('1D4x10')
    expect(sdcDiceGroups.find((g) => g.kind === 'occ')?.display).toBe('2D6')
    const isp = vitals.find((l) => l.label === 'I.S.P.')
    expect(isp?.hint).toBe('M.E. + 5D6 (+2D4/level)')
    expect(isp?.value).toBe('—')

    const vitalsWithMe = buildCreationVitalsBlock({
      character: {
        ...character,
        creationAttributeAssignments: { me: 10 },
      },
      attrs: { ...attrs, me: 10 },
      race: human,
      occ: pab,
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    const ispAssigned = vitalsWithMe.find((l) => l.label === 'I.S.P.')
    expect(ispAssigned?.value).toBe('10')
    expect(ispAssigned?.valueModified).toBe(true)
    expect(ispAssigned?.valueTooltip).toBe('(ME 10)')

    const vitalsMex3 = buildCreationVitalsBlock({
      character: {
        ...character,
        creationAttributeAssignments: { me: 10 },
      },
      attrs: { ...attrs, me: 10 },
      race: human,
      occ: {
        ...pab!,
        ispEngine: {
          ...pab!.ispEngine!,
          baseFormula: 'MEx3 + 5D6',
        },
      },
      supportsDualForm: false,
      psychicTier: 'major',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })
    const ispScaled = vitalsMex3.find((l) => l.label === 'I.S.P.')
    expect(ispScaled?.value).toBe('30')
    expect(ispScaled?.valueTooltip).toBe('(ME(10) × 3)')
    expect(ispScaled?.hint).toBe('MEx3 + 5D6 (+2D4/level)')

    const saves = buildCreationSavesBlock(attrs, {}, character, 'primary', pab, false, undefined, 'major')
    expect(saves.find((l) => l.label === 'Psionics')?.value).toBe('+1')
    expect(saves.find((l) => l.label === 'Psionics')?.valueTooltip).toContain('O.C.C.')
    expect(saves.find((l) => l.label === 'Mind Control')?.value).toBe('+1')
    expect(saves.find((l) => l.label === 'Horror Factor')?.value).toBe('+3')

    const combatLedger = buildCreationCombatLedger(attrs, [], 1, hth)
    const combat = buildCreationCombatBlock(
      character,
      'primary',
      attrs,
      combatLedger,
      [],
      1,
      {},
      false,
      {},
      hth,
      undefined,
      pab,
    )
    expect(combat.find((l) => l.label === 'Hand to Hand')?.value).toBe(
      'Hand to Hand: Basic',
    )
    expect(combat.find((l) => l.label === 'Attacks / melee')?.value).toBe('4')
    expect(combat.find((l) => l.label === 'Attacks / melee')?.hint).toContain(
      'HtH Basic: +2',
    )
    expect(combat.find((l) => l.label === 'Initiative')?.value).toBe('+1')
    expect(combat.find((l) => l.label === 'Parry')?.value).toBe('+1')
    expect(combat.find((l) => l.label === 'Dodge')?.value).toBe('+1')
    expect(combat.find((l) => l.label === 'Roll w/ punch, fall, impact')?.value).toBe(
      '+2',
    )
    expect(combat.find((l) => l.label === 'Roll w/ punch, fall, impact')?.hint).toBe(
      'HtH Basic: +2',
    )
    expect(combat.find((l) => l.label === 'Pull punch')?.value).toBe('+2')
  })

  it('shows granted physical skill dice on attributes for Team Epsilon Trooper', () => {
    const trooper = getLibraryOccById('occ_team_epsilon_trooper')
    const attrs = characterFixture.primary.attributes
    const block = buildCreationAttributeBlock(
      attrs,
      {},
      human,
      trooper,
      undefined,
      ['skill_running'],
    )
    expect(block.find((l) => l.label === 'Spd')?.diceGroups?.[0]?.display).toBe('4D4')
    expect(block.find((l) => l.label === 'P.E.')?.value).toBe('1')
    expect(block.find((l) => l.label === 'P.E.')?.valueModified).toBe(true)
  })
})
