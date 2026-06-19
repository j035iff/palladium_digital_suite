import { describe, expect, it } from 'vitest'
import { getPalladiumRaceById } from '../data/library/raceCatalogLoader'
import {
  TRUE_VAMPIRE_POWERS_MODULE,
  applyTrueVampirePowerModule,
  raceUsesTrueVampirePowersModule,
  trueVampirePsionicGrantIds,
} from './trueVampirePowers'

describe('true vampire powers module', () => {
  it('merges shared powers onto master vampire catalog row', () => {
    const master = getPalladiumRaceById('race_master_vampire', 'nightbane')
    expect(master?.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(
      true,
    )
    expect(master?.classAbilities?.some((a) => a.name === 'Metamorphosis')).toBe(true)
    expect(master?.classAbilities?.some((a) => a.name === 'To Kill the Vampire')).toBe(
      true,
    )
  })

  it('does not merge onto wampyr', () => {
    const wampyr = getPalladiumRaceById('race_wampyr', 'nightbane')
    expect(wampyr).toBeDefined()
    expect(raceUsesTrueVampirePowersModule(wampyr!)).toBe(false)
    const merged = applyTrueVampirePowerModule(wampyr!)
    expect(merged.classAbilities?.some((a) => a.name === 'A Lust for Blood')).toBe(
      false,
    )
  })

  it('lists psionic grant ids that match module document', () => {
    expect(trueVampirePsionicGrantIds()).toEqual(TRUE_VAMPIRE_POWERS_MODULE.psionicGrantIds)
    expect(trueVampirePsionicGrantIds().length).toBe(9)
  })
})
