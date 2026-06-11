import { describe, expect, it } from 'vitest'
import {
  MORPHUS_APPEARANCE_ROUTING_TABLE,
  MORPHUS_CHARACTERISTICS_ROUTING_TABLE,
  MORPHUS_FORGE_MANIFEST,
  resolveMorphusForgeRoutingEntry,
  validateMorphusForgeRoutingTableRefs,
} from '../data/library/morphusForgeRoutingLoader'

describe('morphusForgeRouting', () => {
  it('manifest points at appearance and characteristics routing tables', () => {
    expect(MORPHUS_FORGE_MANIFEST.path1.routingTableId).toBe('appearance')
    expect(MORPHUS_FORGE_MANIFEST.path2.routingTableId).toBe('characteristics')
    expect(MORPHUS_FORGE_MANIFEST.path2.countRoll.notation).toBe('1D4+2')
  })

  it('appearance table has 29 archetype rows covering 01–00%', () => {
    expect(MORPHUS_APPEARANCE_ROUTING_TABLE.entries).toHaveLength(29)
    const amalgam = resolveMorphusForgeRoutingEntry(
      MORPHUS_APPEARANCE_ROUTING_TABLE,
      4,
    )
    expect(amalgam?.name).toBe('Amalgam')
    expect(amalgam?.slotPlan).toHaveLength(3)
  })

  it('characteristics table resolves multiplier rows', () => {
    expect(MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries).toHaveLength(23)
    const four = resolveMorphusForgeRoutingEntry(
      MORPHUS_CHARACTERISTICS_ROUTING_TABLE,
      99,
    )
    expect(four?.slotPlan[0]).toMatchObject({
      kind: 'characteristics_multiplier',
      count: 4,
      rerollAbovePercentile: 90,
    })
  })

  it('all trait table references resolve in the catalog', () => {
    expect(
      validateMorphusForgeRoutingTableRefs(MORPHUS_APPEARANCE_ROUTING_TABLE),
    ).toEqual([])
    expect(
      validateMorphusForgeRoutingTableRefs(MORPHUS_CHARACTERISTICS_ROUTING_TABLE),
    ).toEqual([])
  })
})
