import { describe, expect, it } from 'vitest'
import {
  listMorphusTraitEntriesWithPercentiles,
  resolveMorphusTraitEntryByPercentile,
} from '../data/library/morphusTableCatalogLoader'

describe('morphusTraitTablePercentiles', () => {
  it('alien_shape resolves percentile bands from the book table', () => {
    const rows = listMorphusTraitEntriesWithPercentiles('alien_shape')
    expect(rows).toHaveLength(22)
    expect(rows[0]?.name).toBe('Abnormally Large Sensory Organs')
    expect(rows[0]?.percentile).toEqual({ min: 1, max: 5 })

    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 4)?.id).toBe(
      'alien_shape_abnormally_large_sensory_organs',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 8)?.name).toBe(
      'Alien Plantlife',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 76)?.name).toBe(
      'Shaggy Hairy',
    )
    expect(
      resolveMorphusTraitEntryByPercentile('alien_shape', 100)?.name,
    ).toBe('Combination of 2')
  })
})
