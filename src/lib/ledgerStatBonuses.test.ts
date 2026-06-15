import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import {
  aggregateDiceNotations,
  buildForgeAttributeStatBonuses,
  buildSdcStatBonuses,
  ledgerDiceGroupRowLabel,
} from './ledgerStatBonuses'

describe('ledgerStatBonuses', () => {
  it('aggregates skill dice by face count', () => {
    expect(aggregateDiceNotations(['1D8', '1D6', '4D6'])).toBe('1D8 + 5D6')
  })

  it('includes flat race S.D.C. base in the value column', () => {
    const nightbane = getRaceById('nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const bundle = buildSdcStatBonuses(nightbane, occ, undefined, ['skill_running'], {})

    expect(bundle.flatBreakdown.some((b) => b.label === 'Base' && b.amount === 30)).toBe(
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

    const occGroup = bundle.diceGroups.find((g) => g.kind === 'occ')
    expect(occGroup?.display).toBe('1D4x10+2D6')
    expect(occGroup?.tooltip).toContain('Base OCC: 1D4x10')
    expect(occGroup?.tooltip).toContain('OCC bonus: 2D6')

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
