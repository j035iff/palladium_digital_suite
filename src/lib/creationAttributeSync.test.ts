import { describe, expect, it } from 'vitest'
import type { CharacterAttributes, PalladiumOcc, Race } from '../types'
import {
  attrForPoolSlot,
  buildCreationAttributes,
  creationAttributeRollHint,
  occAttributeRequirementSuffix,
  getEffectivePoolSlots,
  poolValueMatchesAssignment,
  validatePoolRollAssignment,
  valueFitsRaceNotation,
} from './creationAttributeSync'
import {
  assignmentToPoolRoll,
  poolRollToAssignmentValue,
} from './attributePoolGroups'

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

const humanRace = {
  id: 'race_human',
  attributes: {
    iq: '3D6',
    me: '3D6',
    ma: '3D6',
    ps: '3D6',
    pp: '3D6',
    pe: '3D6',
    pb: '3D6',
    spd: '3D6',
  },
} as unknown as Race

describe('creationAttributeSync', () => {
  it('formats attribute roll hints with O.C.C. bonuses', () => {
    expect(creationAttributeRollHint(humanRace, 'ps', occ)).toBe('3D6 +1(OCC)')
    expect(creationAttributeRollHint(humanRace, 'pe', occ)).toBe('3D6 +1D4(OCC)')
    expect(creationAttributeRollHint(humanRace, 'iq', occ)).toBe('3D6')
    expect(creationAttributeRollHint(undefined, 'ps', occ)).toBe('+1(OCC)')
    expect(creationAttributeRollHint(humanRace, 'iq')).toBe('3D6')
  })

  it('formats O.C.C. attribute minimum suffixes', () => {
    const occWithReq = {
      ...occ,
      attributeRequirements: { iq: 12 },
    } as unknown as PalladiumOcc
    expect(occAttributeRequirementSuffix(occWithReq, 'iq')).toBe('12+')
    expect(occAttributeRequirementSuffix(occWithReq, 'me')).toBeUndefined()
  })

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

  it('maps dice-only pool rolls to assignment totals for races with flats', () => {
    const guardianFormulas = {
      iq: '2D4+16',
      me: '2D6+16',
      ma: '2D6+12',
      ps: '2D4+14',
      pp: '2D4+16',
      pe: '2D6+14',
      pb: '1D6+14',
      spd: '2D6+20',
    } as const
    const pool = [5, null, null, null, null, null, null, null]
    const assignments = { iq: 21 }
    const slots = { iq: 0 }
    expect(poolRollToAssignmentValue(guardianFormulas, 'iq', 5)).toBe(21)
    expect(
      poolValueMatchesAssignment(5, 'iq', 21, guardianFormulas),
    ).toBe(true)
    expect(
      getEffectivePoolSlots(pool, assignments, slots, guardianFormulas),
    ).toEqual(slots)
    expect(
      validatePoolRollAssignment('ps', 0, pool, guardianFormulas, () => undefined),
    ).toBeNull()
    expect(assignmentToPoolRoll(guardianFormulas, 'iq', 21)).toBe(5)
    const strictPool = [null, null, null, 15, null, null, null, null]
    expect(
      validatePoolRollAssignment('me', 3, strictPool, guardianFormulas, () => undefined),
    ).toMatch(/Outside 2D6/)
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
