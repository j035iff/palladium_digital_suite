import { describe, expect, it } from 'vitest'
import { resolveMorphusCharacteristicsByIds } from './morphusTableCatalogLoader'

describe('resolveMorphusCharacteristicsByIds variant aliases', () => {
  it('resolves amphibian frog variant and merges mobility overrides', () => {
    const rows = resolveMorphusCharacteristicsByIds([
      'animal_amphibian_full::variant:frog',
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.mobility?.swimSpeedBaseSource).toBe('land_spd')
    expect(rows[0]?.mobility?.swimSpeedBonus?.percent).toBe(100)
  })

  it('resolves variant by label alias', () => {
    const rows = resolveMorphusCharacteristicsByIds([
      'animal_amphibian_full::variant:Toad',
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name.includes('(Toad)')).toBe(true)
    expect(rows[0]?.mobility?.swimSpeedBaseSource).toBe('land_spd')
  })
})
