import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import {
  aggregateDiceNotations,
  appendEnteredRollsToFlatTooltip,
  buildForgeAttributeStatBonuses,
  buildLedgerDiceGroup,
  buildSdcStatBonuses,
  ledgerDiceGroupRowLabel,
} from './ledgerStatBonuses'

describe('ledgerStatBonuses', () => {
  it('appends entered spawn dice to flat tooltips', () => {
    expect(
      appendEnteredRollsToFlatTooltip('(P.E. +14)', [
        { label: '1D6', amount: 5 },
      ]),
    ).toBe('(P.E. +14, 1D6 +5)')
    expect(
      appendEnteredRollsToFlatTooltip(undefined, [
        { label: 'Athletics (general)', amount: 4 },
      ]),
    ).toBe('(Athletics (general) +4)')
  })
  it('aggregates skill dice by face count', () => {
    expect(aggregateDiceNotations(['1D8', '1D6', '4D6'])).toBe('1D8 + 5D6')
  })

  it('omits dice group tooltip when sub-row already shows source and notation', () => {
    expect(
      buildLedgerDiceGroup('race', [{ notation: '2D6x10', label: '2D6x10' }])?.tooltip,
    ).toBe('')
    expect(
      buildLedgerDiceGroup('race', [{ notation: '1D4x10', label: 'Race' }])?.tooltip,
    ).toBe('')
    expect(
      buildLedgerDiceGroup('traits', [
        { notation: '1D6', label: 'Musclebound' },
        { notation: '2D6', label: 'Thick Hide' },
      ])?.tooltip,
    ).toContain('Musclebound: 1D6')
  })

  it('keeps tooltip for a single skill roll so the source skill is visible', () => {
    expect(
      buildLedgerDiceGroup('skills', [
        { notation: '1D6', label: 'Athletics (general)' },
      ])?.tooltip,
    ).toBe('(Athletics (general): 1D6)')
  })

  it('keeps tooltip for a single trait roll so the source trait is visible', () => {
    expect(
      buildLedgerDiceGroup('traits', [{ notation: '1D6', label: 'Musclebound' }])?.tooltip,
    ).toBe('(Musclebound: 1D6)')
  })

  it('includes flat race S.D.C. base in the value column', () => {
    const nightbane = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const bundle = buildSdcStatBonuses(nightbane, occ, undefined, ['skill_running'], {})

    expect(bundle.flatBreakdown.some((b) => b.label === 'RaceFlat' && b.amount === 30)).toBe(
      true,
    )
    expect(bundle.flatTotal).toBeGreaterThanOrEqual(30)
    expect(bundle.diceGroups.find((g) => g.kind === 'occ')).toBeUndefined()
  })

  it('builds SDC preview for human law-enforcement skills example', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const skills = [
      'skill_athletics_general',
      'skill_running',
      'skill_body_building_weight_lifting',
      'skill_wrestling',
    ]
    const bundle = buildSdcStatBonuses(human, occ, undefined, skills, {})

    expect(bundle.flatTotal).toBe(10)
    expect(bundle.flatBreakdown[0]?.label).toBe('Body Building & Weight Lifting')

    const raceGroup = bundle.diceGroups.find((g) => g.kind === 'race')
    expect(raceGroup?.display).toBe('1D4x10')
    expect(raceGroup?.tooltip).toBe('')

    const occGroup = bundle.diceGroups.find((g) => g.kind === 'occ')
    expect(occGroup?.display).toBe('2D6')
    expect(occGroup?.tooltip).toBe('')

    const skillGroup = bundle.diceGroups.find((g) => g.kind === 'skills')
    expect(skillGroup?.display).toBe('1D8 + 5D6')
    expect(skillGroup?.tooltip).toContain('Athletics (general): 1D8')
    expect(skillGroup?.tooltip).toContain('Running: 1D6')
    expect(skillGroup?.tooltip).toContain('Wrestling: 4D6')
  })

  it('puts race roll inline and groups OCC/skill dice for attributes', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const bundle = buildForgeAttributeStatBonuses(
      'ps',
      human,
      occ,
      undefined,
      [],
    )
    expect(bundle.inlineRaceRoll).toBe('3D6')
    expect(bundle.flatTotal).toBe(1)
    expect(bundle.diceGroups.find((g) => g.kind === 'occ')).toBeUndefined()
    expect(ledgerDiceGroupRowLabel('skills')).toBe('Skills')
  })
})
