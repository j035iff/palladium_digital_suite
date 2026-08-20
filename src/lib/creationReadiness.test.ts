import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from './characterRoot'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { assessCreationSpawnBlockers } from './creationReadiness'
import { buildDevSkipToReviewFromMorphusState } from './dev/devSkipToReviewFromMorphus'
import { buildDevSkipToMorphusCreationState } from './dev/devSkipToMorphusCreation'

describe('assessCreationSpawnBlockers', () => {
  it('does not block Nightbane when dice are entered but commit flags are stale', () => {
    const base = buildDevSkipToReviewFromMorphusState(
      buildDevSkipToMorphusCreationState(createBlankCharacterForGenre('nightbane')),
    )
    const staleFlags = {
      ...base,
      creationPrimaryDiceFinalized: false,
      creationMorphusDiceFinalized: false,
    }

    const blockers = assessCreationSpawnBlockers(staleFlags, {
      supportsDualForm: true,
      psychicTier: 'none',
    })

    expect(
      blockers.some((b) => b.includes('Roll Pending') || b.includes('Morphus dice')),
    ).toBe(false)
  })

  it('blocks Nightbane when Morphus vitality dice are missing', () => {
    const base = buildDevSkipToReviewFromMorphusState(
      buildDevSkipToMorphusCreationState(createBlankCharacterForGenre('nightbane')),
    )
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const resolutions = { ...(base.creationPendingDiceResolutions ?? {}) }
    for (const key of Object.keys(resolutions)) {
      if (key.includes('morphus')) delete resolutions[key]
    }

    const blockers = assessCreationSpawnBlockers(
      {
        ...base,
        creationPendingDiceResolutions: resolutions,
        creationMorphusDiceFinalized: false,
      },
      {
        supportsDualForm: true,
        psychicTier: 'none',
      },
    )

    expect(blockers.some((b) => b.includes('Morphus physical die'))).toBe(true)
    void race
    void occ
  })

  it('blocks Nightbane when Morphus is not finalized', () => {
    const base = buildDevSkipToReviewFromMorphusState(
      buildDevSkipToMorphusCreationState(createBlankCharacterForGenre('nightbane')),
    )

    const blockers = assessCreationSpawnBlockers(
      {
        ...base,
        creationTraitForgeStubComplete: false,
      },
      {
        supportsDualForm: true,
        psychicTier: 'none',
      },
    )

    expect(blockers.some((b) => b.includes('Finalize Morphus'))).toBe(true)
  })
})
