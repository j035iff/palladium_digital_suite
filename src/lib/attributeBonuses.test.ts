import { describe, expect, it } from 'vitest'
import {
  EXCEPTIONAL_ATTRIBUTE_MIN,
  getIqBonuses,
  getMeBonuses,
  getPsBonuses,
  meStyleStepBonus,
} from './attributeBonuses'

describe('attributeBonuses exceptional threshold', () => {
  it('starts exceptional bonuses at 17', () => {
    expect(EXCEPTIONAL_ATTRIBUTE_MIN).toBe(17)
    expect(getIqBonuses(16).skillBonus).toBe(0)
    expect(getIqBonuses(17).skillBonus).toBe(3)
    expect(getPsBonuses(16).damageBonus).toBe(0)
    expect(getPsBonuses(17).damageBonus).toBe(2)
  })

  it('derives I.Q. perception from the M.E. step table on I.Q.', () => {
    expect(meStyleStepBonus(17)).toBe(1)
    expect(meStyleStepBonus(18)).toBe(2)
    expect(meStyleStepBonus(19)).toBe(2)
    expect(meStyleStepBonus(20)).toBe(3)
    expect(getIqBonuses(17).perceptionStandard).toBe(1)
    expect(getIqBonuses(18).perceptionStandard).toBe(2)
  })

  it('splits 31+ I.Q. skill bonus into standard and super portions', () => {
    const iq35 = getIqBonuses(35)
    expect(iq35.skillBonusStandard).toBe(16)
    expect(iq35.skillBonusSuper).toBe(2)
    expect(iq35.skillBonus).toBe(18)
  })

  it('applies M.E. save steps from 17', () => {
    expect(getMeBonuses(16).saveStandard).toBe(0)
    expect(getMeBonuses(17).saveStandard).toBe(1)
    expect(getMeBonuses(18).saveStandard).toBe(2)
  })
})
