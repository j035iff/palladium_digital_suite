import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { refreshMorphusAttributeRowsInContext } from './resolveCreationLedgerContext'
import { buildCreationLedgerResolutionBundle } from './spawnDiceBlocks'

describe('resolveCreationLedgerBundle', () => {
  it('populates facade vitality rows alongside pending blocks', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...characterFixture,
      creationAttributeAssignments: { pe: 12, ps: 10 },
    }
    const bundle = buildCreationLedgerResolutionBundle(character, human, occ, {
      psychicTier: 'major',
    })
    expect(bundle.facade.vitals.sdc).toBeDefined()
    expect(bundle.facade.vitals.sdc?.section).toBe('vitality')
    expect(
      (bundle.facade.vitals.sdc?.pendingFlatBaseline ?? 0) > 0 ||
        (bundle.facade.vitals.sdc?.contributions.length ?? 0) > 0,
    ).toBe(true)
    expect(bundle.pendingBlocks.some((b) => b.id === 'sdc')).toBe(true)
    expect(bundle.facade.attributes.ps?.section).toBe('attribute')
  })

  it('projects vitality pending blocks from resolved rows', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const bundle = buildCreationLedgerResolutionBundle(
      { ...characterFixture, creationAttributeAssignments: { pe: 12 } },
      human,
      occ,
      { psychicTier: 'major' },
    )
    const sdcBlock = bundle.pendingBlocks.find((b) => b.id === 'sdc')!
    const sdcRow = bundle.facade.vitals.sdc!
    expect(sdcBlock.id).toBe(sdcRow.id)
    expect(sdcBlock.flatBaseline).toBe(sdcRow.pendingFlatBaseline)
  })
})

describe('refreshMorphusAttributeRowsInContext', () => {
  it('updates morphus PS without rebuilding facade vitals', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { ps: 11 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'athlete_musclebound' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const initial = buildCreationLedgerResolutionBundle(character, race, occ, {
      psychicTier: 'none',
      supportsDualForm: true,
    })
    const sdcBefore = initial.facade.vitals.sdc
    const psBlock = initial.pendingBlocks.find((b) => b.id === 'morphus_attr_ps')!
    const rollId = psBlock.groups[0]!.rolls[0]!.id

    const refreshed = refreshMorphusAttributeRowsInContext(
      initial,
      { ...character, creationPendingDiceResolutions: { [rollId]: 4 } },
      [],
      { ps: 35 },
    )

    expect(refreshed.facade.vitals.sdc).toEqual(sdcBefore)
    expect(refreshed.morphus.attributes.ps?.total).toBe(29)
  })
})
