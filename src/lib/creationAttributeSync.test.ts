import { describe, expect, it } from 'vitest'
import type { CharacterAttributes, PalladiumOcc } from '../types'
import {
  attrForPoolSlot,
  buildCreationAttributes,
  getEffectivePoolSlots,
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
  it('validates pool values against race notation bounds with exceptional cap', () => {
    expect(valueFitsRaceNotation(10, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(3, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(18, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(24, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(30, '3D6')).toBe(true)
    expect(valueFitsRaceNotation(31, '3D6')).toBe(false)
    expect(valueFitsRaceNotation(17, '2D6')).toBe(true)
    expect(valueFitsRaceNotation(18, '2D6')).toBe(true)
    expect(valueFitsRaceNotation(19, '2D6')).toBe(false)
    expect(valueFitsRaceNotation(1, '2D6')).toBe(false)
    expect(valueFitsRaceNotation(25, '4D6')).toBe(false)
    expect(valueFitsRaceNotation(21, '3D6+2')).toBe(false)
  })

  it('tracks duplicate pool values by slot index', () => {
    const pool = [14, 10, 12, 14, 11, 9, 15, 13]
    const assignments = { iq: 14, me: 14, ma: 10 }
    const slots = { iq: 0, me: 3, ma: 1 }
    expect(attrForPoolSlot(slots, 0)).toBe('iq')
    expect(attrForPoolSlot(slots, 3)).toBe('me')
    expect(attrForPoolSlot(slots, 1)).toBe('ma')
    expect(getEffectivePoolSlots(pool, assignments, slots)).toEqual(slots)
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
