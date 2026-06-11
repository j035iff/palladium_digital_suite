import { describe, expect, it } from 'vitest'
import type { Race } from '../types'
import {
  formatMorphusPercentileBand,
  isMorphusForgeCrossroadsComplete,
  isMorphusForgeTraitTabComplete,
  morphusForgeStateAfterPathChange,
} from './morphusForgeNavigation'
import { traitForgeTabApplicable } from './creationSubForge'

describe('morphusForgeNavigation', () => {
  it('formats percentile bands with 00 for 100', () => {
    expect(formatMorphusPercentileBand(1, 2)).toBe('01–02')
    expect(formatMorphusPercentileBand(96, 100)).toBe('96–00')
  })

  it('requires appearance archetype for path 1 crossroads', () => {
    expect(
      isMorphusForgeCrossroadsComplete({ path: 'appearance' }),
    ).toBe(false)
    expect(
      isMorphusForgeCrossroadsComplete({
        path: 'appearance',
        appearanceEntryId: 'amalgam',
      }),
    ).toBe(true)
    expect(
      isMorphusForgeCrossroadsComplete({ path: 'characteristics' }),
    ).toBe(true)
  })

  it('requires 1D4+2 count for path 2 trait tab', () => {
    expect(
      isMorphusForgeTraitTabComplete({ path: 'characteristics' }),
    ).toBe(false)
    expect(
      isMorphusForgeTraitTabComplete({
        path: 'characteristics',
        characteristicsPickCount: 5,
      }),
    ).toBe(true)
  })

  it('clears downstream state when path changes', () => {
    const next = morphusForgeStateAfterPathChange(
      {
        path: 'appearance',
        appearanceEntryId: 'bizarre',
        subTabCompleted: { crossroads: true, trait_forge: true },
      },
      { path: 'characteristics' },
    )
    expect(next.path).toBe('characteristics')
    expect(next.appearanceEntryId).toBeUndefined()
    expect(next.subTabCompleted).toEqual({})
  })
})

describe('creationSubForge', () => {
  it('applies morphus forge from nightbane lineage or race id', () => {
    expect(
      traitForgeTabApplicable(
        { id: 'nightbane', lineage: 'nightbane' } as Race,
        undefined,
      ),
    ).toBe(true)
    expect(
      traitForgeTabApplicable(
        { id: 'race_human', creationSubForgeId: 'morphus_forge_manifest' } as Race,
        undefined,
      ),
    ).toBe(true)
    expect(traitForgeTabApplicable({ id: 'race_human' } as Race, undefined)).toBe(
      false,
    )
  })
})
