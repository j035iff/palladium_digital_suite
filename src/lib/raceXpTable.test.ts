import { describe, expect, it } from 'vitest'
import { getPalladiumOccById } from '../data/library/occCatalogLoader'
import { getPalladiumRaceById } from '../data/library/raceCatalogLoader'
import { resolveOccXpTable } from '../data/library/registry'
import { occXpTableId } from './occCatalogEngine'
import { raceXpTableId } from './raceXpTable'

describe('raceXpTableId', () => {
  it('uses race metadata when present', () => {
    const nightbane = getPalladiumRaceById('race_nightbane', 'nightbane')
    expect(nightbane).toBeDefined()
    expect(raceXpTableId(nightbane)).toBe('nightbane_core_nightbane_guardian')
  })

  it('uses Doppleganger table for Human', () => {
    const human = getPalladiumRaceById('race_human', 'nightbane')
    expect(human).toBeDefined()
    expect(raceXpTableId(human)).toBe('nightbane_core_doppleganger')
  })
})

describe('occ_general_citizen XP source', () => {
  it('resolves XP from race, not a fixed O.C.C. table', () => {
    const occ = getPalladiumOccById('occ_general_citizen')
    expect(occ).toBeDefined()
    expect(occ!.progression?.xpTableSource).toBe('race')
    expect(occ!.progression?.xpTableId).toBeUndefined()

    const nightbane = getPalladiumRaceById('race_nightbane', 'nightbane')!
    const human = getPalladiumRaceById('race_human', 'nightbane')!

    expect(occXpTableId(occ!, nightbane)).toBe('nightbane_core_nightbane_guardian')
    expect(occXpTableId(occ!, human)).toBe('nightbane_core_doppleganger')

    expect(resolveOccXpTable(occ!, nightbane).floors[1]).toBe(2401)
    expect(resolveOccXpTable(occ!, human).floors[1]).toBe(1901)
  })
})
