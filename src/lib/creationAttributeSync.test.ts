import { describe, expect, it } from 'vitest'
import type { CharacterAttributes, PalladiumOcc } from '../types'
import {
  buildCreationAttributes,
  valueFitsRaceNotation,
} from './creationAttributeSync'

const baseAttrs: CharacterAttributes = {
  iq: 10,
  me: 10,
  ma: 10,
  pp: 10,
  pe: 10,
  pb: 10,
  spd: 10,
  ps: { score: 10, tier: 'standard' },
}

const occ = {
  id: 'occ_test',
  staticBonuses: {
    attributes: { ps: 1, pe: '1D4' },
  },
  occSkillsCore: [],
  occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
} as unknown as PalladiumOcc

describe('creationAttributeSync', () => {
  it('validates pool values against race notation bounds', () => {
    expect(valueFitsRaceNotation(10, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(3, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(18, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(19, '3D6')).toBe(false)
    expect(valueFitsRaceNotation(1, '2D6')).toBe(false)
  })

  it('applies flat O.C.C. bonuses and variable dice resolutions', () => {
    const attrs = buildCreationAttributes(
      baseAttrs,
      { ps: 12, pe: 10 },
      occ,
      null,
      { 'attributes.pe': 4 },
    )
    expect(attrs.ps.score).toBe(13)
    expect(attrs.pe).toBe(14)
  })
})
