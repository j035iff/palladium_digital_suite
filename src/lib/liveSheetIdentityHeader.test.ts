import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  buildLiveSheetIdentityHeaderLines,
  buildLiveSheetIdentityRolloverBlocks,
  isLiveSheetSkillPackageOcc,
  liveSheetIdentityClassLine,
  shouldHideRaceOnIdentityHeader,
  shortenOccDisplayName,
} from './liveSheetIdentityHeader'

function race(partial: Partial<Race> & Pick<Race, 'id' | 'name'>): Race {
  return {
    description: partial.description ?? '',
    gameSystems: partial.gameSystems ?? ['nightbane'],
    sources: partial.sources ?? [
      { gameSystem: 'nightbane', reference: 'Nightbane Core', pageNumber: 87 },
    ],
    raceAudience: partial.raceAudience ?? 'player',
    canPickOcc: partial.canPickOcc,
    raceComposition: partial.raceComposition,
    forcedOccId: partial.forcedOccId,
    ...partial,
  } as Race
}

function occ(
  partial: Partial<PalladiumOcc> & Pick<PalladiumOcc, 'id' | 'name'>,
): PalladiumOcc {
  return {
    description: partial.description ?? 'OCC description',
    gameSystems: ['nightbane'],
    sources: [
      { gameSystem: 'nightbane', reference: 'Nightbane Core', pageNumber: 100 },
    ],
    occType: partial.occType ?? 'standard',
    tags: [],
    occSkillsCore: [],
    occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
    secondarySkills: { initialSlotsCount: 0, forbiddenCategories: [] },
    wpRules: { coreWps: [], forbiddenWps: [] },
    handToHandRules: { defaultSkillId: 'hth_basic', upgradePaths: [] },
    ...partial,
  } as PalladiumOcc
}

describe('liveSheetIdentityHeader', () => {
  it('hides race when Race ≡ R.C.C. (incl. Nightbane canPickOcc)', () => {
    expect(
      shouldHideRaceOnIdentityHeader(
        race({ id: 'race_nightbane', name: 'Nightbane', raceComposition: 'rcc', canPickOcc: true }),
      ),
    ).toBe(true)
    expect(
      shouldHideRaceOnIdentityHeader(
        race({ id: 'race_human', name: 'Human', raceComposition: 'character' }),
      ),
    ).toBe(false)
  })

  it('Line 2: Human OCC uses OCC name; Nightbane package uses race name; Sorcerer combines', () => {
    expect(
      liveSheetIdentityClassLine({
        occ: occ({ id: 'occ_pab', name: 'P.A.B. Field Agent' }),
        occDisplayName: 'P.A.B. Field Agent',
        race: race({ id: 'race_human', name: 'Human' }),
      }),
    ).toBe('P.A.B. Field Agent')

    expect(
      liveSheetIdentityClassLine({
        occ: occ({
          id: 'occ_nightbane_basic',
          name: 'Nightbane — Basic Skill Package',
          occType: 'nightbane_rcc',
        }),
        occDisplayName: 'Nightbane — Basic Skill Package',
        race: race({
          id: 'race_nightbane',
          name: 'Nightbane',
          raceComposition: 'rcc',
          canPickOcc: true,
        }),
      }),
    ).toBe('Nightbane')

    expect(
      liveSheetIdentityClassLine({
        occ: occ({ id: 'occ_sorcerer', name: 'Sorcerer O.C.C.', occType: 'magic_user' }),
        occDisplayName: 'Sorcerer O.C.C.',
        race: race({
          id: 'race_nightbane',
          name: 'Nightbane',
          raceComposition: 'rcc',
          canPickOcc: true,
        }),
      }),
    ).toBe('Nightbane Sorcerer')
  })

  it('builds alignment-only Line 3 when race hidden', () => {
    const lines = buildLiveSheetIdentityHeaderLines({
      name: 'Frank',
      alignmentLabel: 'Scrupulous',
      race: race({
        id: 'race_nightbane',
        name: 'Nightbane',
        raceComposition: 'rcc',
        canPickOcc: true,
      }),
      occ: occ({ id: 'occ_sorcerer', name: 'Sorcerer O.C.C.', occType: 'magic_user' }),
      occDisplayName: 'Sorcerer O.C.C.',
    })
    expect(lines.hideRace).toBe(true)
    expect(lines.raceAlignmentLine).toBe('SCRUPULOUS')
    expect(lines.classLine).toBe('Nightbane Sorcerer')
  })

  it('rollover unions skill package vs specialized OCC for Nightbane', () => {
    const packageBlocks = buildLiveSheetIdentityRolloverBlocks({
      name: 'Rock',
      alignmentLabel: 'Anarchist',
      race: race({
        id: 'race_nightbane',
        name: 'Nightbane',
        description: 'Nightbane RCC',
        raceComposition: 'rcc',
        canPickOcc: true,
      }),
      occ: occ({
        id: 'occ_nightbane_basic',
        name: 'Nightbane — Basic Skill Package',
        description: 'Basic package',
        occType: 'nightbane_rcc',
      }),
      occDisplayName: 'Nightbane — Basic Skill Package',
    })
    expect(packageBlocks.map((b) => b.kind)).toEqual(['rcc', 'skillPackage'])

    const sorcererBlocks = buildLiveSheetIdentityRolloverBlocks({
      name: 'Frank',
      alignmentLabel: 'Scrupulous',
      race: race({
        id: 'race_nightbane',
        name: 'Nightbane',
        description: 'Nightbane RCC',
        raceComposition: 'rcc',
        canPickOcc: true,
      }),
      occ: occ({
        id: 'occ_sorcerer',
        name: 'Sorcerer O.C.C.',
        description: 'Sorcerer OCC',
        occType: 'magic_user',
      }),
      occDisplayName: 'Sorcerer O.C.C.',
    })
    expect(sorcererBlocks.map((b) => b.kind)).toEqual(['rcc', 'occ'])
  })

  it('shortens OCC suffixes and detects skill packages', () => {
    expect(shortenOccDisplayName('Sorcerer O.C.C.')).toBe('Sorcerer')
    expect(
      isLiveSheetSkillPackageOcc(
        occ({
          id: 'occ_nightbane_basic',
          name: 'Nightbane — Basic Skill Package',
          occType: 'nightbane_rcc',
        }),
      ),
    ).toBe(true)
  })
})
