import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { buildCreationAttributeBlock, buildCreationLiveLedgerSnapshot, buildCreationVitalsBlock, LEDGER_HTH_NONE } from './creationLiveLedger'
import type { HorrorFactorProfile } from './saveProfile'

const EMPTY_HORROR_FACTOR_PROFILE: HorrorFactorProfile = {
  total: null,
  contributions: [],
  tooltipEquation: '',
}
import {
  buildMorphusCreationAttributeBlock,
  buildMorphusTraitSdcBonusDetails,
  formatMorphusVsPrimaryTooltip,
} from './morphusCreationLedger'

describe('buildMorphusTraitSdcBonusDetails', () => {
  it('collects trait S.D.C. dice for pending spawn rolls', () => {
    const details = buildMorphusTraitSdcBonusDetails({
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'animal_arachnid_full' },
      ],
    })
    expect(details.diceContributions).toEqual([
      { notation: '3D6x10', label: 'Full Arachnid' },
    ])
  })
})

describe('buildMorphusCreationAttributeBlock', () => {
  it('shows R.C.C. base bumps in green with Facade-relative tooltips', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: {
        ps: 12,
        pe: 14,
        pp: 11,
        spd: 10,
        iq: 10,
      },
    }

    const primaryLines = buildCreationAttributeBlock(
      character.primary.attributes,
      character.creationAttributeAssignments,
    )
    const morphusLines = buildMorphusCreationAttributeBlock(primaryLines, character)

    const ps = morphusLines.find((line) => line.label === 'P.S.')!
    const pe = morphusLines.find((line) => line.label === 'P.E.')!
    const pp = morphusLines.find((line) => line.label === 'P.P.')!
    const spd = morphusLines.find((line) => line.label === 'Spd')!
    const iq = morphusLines.find((line) => line.label === 'I.Q.')!

    expect(ps.value).toBe('22')
    expect(ps.valueModified).toBe(true)
    expect(ps.valueTooltip).toBe('Facade 12, Race +10')

    expect(pe.value).toBe('24')
    expect(pe.valueModified).toBe(true)
    expect(pe.valueTooltip).toBe('Facade 14, Race +10')

    expect(pp.value).toBe('17')
    expect(pp.valueModified).toBe(true)
    expect(pp.valueTooltip).toBe('Facade 11, Race +6')

    expect(spd.value).toBe('20')
    expect(spd.valueModified).toBe(true)
    expect(spd.valueTooltip).toBe('Facade 10, Race +10')

    expect(iq.value).toBe('10')
    expect(iq.valueModified).toBeFalsy()
  })

  it('defers Animal Magnetism minimum until Finalize Morphus', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: {
        ma: 11,
        pb: 11,
      },
      morphusTraitSlotResolutions: [
        {
          slotId: 'plan:0',
          catalogEntryId: 'unearthly_beauty_animal_magnetism',
        },
      ],
      creationTraitForgeStubComplete: false,
    }

    const primaryLines = buildCreationAttributeBlock(
      character.primary.attributes,
      character.creationAttributeAssignments,
    )
    const previewLines = buildMorphusCreationAttributeBlock(primaryLines, character)
    const maPreview = previewLines.find((line) => line.label === 'M.A.')!
    const pbPreview = previewLines.find((line) => line.label === 'P.B.')!

    expect(maPreview.value).toBe('19')
    expect(maPreview.labelSuffix).toBe('(min 20)')
    expect(pbPreview.value).toBe('19')
    expect(pbPreview.labelSuffix).toBe('(min 20)')

    const finalizedLines = buildMorphusCreationAttributeBlock(primaryLines, {
      ...character,
      creationTraitForgeStubComplete: true,
    })
    const maFinal = finalizedLines.find((line) => line.label === 'M.A.')!
    const pbFinal = finalizedLines.find((line) => line.label === 'P.B.')!

    expect(maFinal.value).toBe('20')
    expect(maFinal.labelSuffix).toBeUndefined()
    expect(pbFinal.value).toBe('20')
    expect(pbFinal.labelSuffix).toBeUndefined()
  })
})

describe('formatMorphusVsPrimaryTooltip', () => {
  it('lists Facade total then each Morphus delta', () => {
    expect(
      formatMorphusVsPrimaryTooltip(12, [{ label: 'Race', amount: 10 }]),
    ).toBe('Facade 12, Race +10')
  })
})

describe('buildCreationVitalsBlock dual-form toggle', () => {
  it('shows one H.P. and S.D.C. row per active form', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { pe: 14, ps: 12 },
    }
    const race = getRaceById('race_nightbane')
    const attrs = character.primary.attributes
    const morphusAttrScores = { pe: 24, ps: 22 }

    const primaryVitals = buildCreationVitalsBlock({
      character,
      attrs,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'primary',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    })

    const morphusVitals = buildCreationVitalsBlock({
      character,
      attrs,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
      attrScores: morphusAttrScores,
    })

    const primaryHpLabels = primaryVitals.filter((l) => l.label.includes('H.P.'))
    const primarySdcLabels = primaryVitals.filter((l) => l.label.includes('S.D.C.'))
    expect(primaryHpLabels).toHaveLength(1)
    expect(primarySdcLabels).toHaveLength(1)
    expect(primaryHpLabels[0]?.label).toBe('H.P.')

    const morphusHpLabels = morphusVitals.filter((l) => l.label.includes('H.P.'))
    const morphusSdcLabels = morphusVitals.filter((l) => l.label.includes('S.D.C.'))
    expect(morphusHpLabels).toHaveLength(1)
    expect(morphusSdcLabels).toHaveLength(1)
    expect(morphusHpLabels[0]?.label).toBe('H.P.')
    expect(morphusHpLabels[0]?.hint).toContain('P.E. ×2')
    expect(morphusHpLabels[0]?.hint).toContain('2D6/level')
    expect(morphusSdcLabels[0]?.hint).toBe('Facade + 2D6x10 + traits')
  })

  it('shows Mind Control immunity on Facade and Morphus ledgers', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_nightbane',
      creationAttributeAssignments: { pe: 14 },
    }
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const baseOpts = {
      character,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'primary' as const,
    }

    for (const activeForm of ['primary', 'morphus'] as const) {
      expect(
        buildCreationLiveLedgerSnapshot({
          ...baseOpts,
          activeForm,
        }).saves.find((line) => line.label === 'Mind Control'),
      ).toEqual({
        label: 'Mind Control',
        value: 'Immune',
        valueModified: true,
        hint: 'Nightbane R.C.C.',
      })
    }
  })

  it('derives P.P.E. from Facade P.E. on both ledger toggles', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { pe: 14, ps: 12 },
    }
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const attrs = character.primary.attributes
    const baseOpts = {
      character,
      attrs,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      passive: {},
      horrorFactorProfile: EMPTY_HORROR_FACTOR_PROFILE,
      skillIds: [],
    }

    const primaryPpe = buildCreationVitalsBlock({
      ...baseOpts,
      activeForm: 'primary',
    }).find((line) => line.label === 'P.P.E.')
    const morphusPpe = buildCreationVitalsBlock({
      ...baseOpts,
      activeForm: 'morphus',
      attrScores: { pe: 24, ps: 22 },
    }).find((line) => line.label === 'P.P.E.')

    expect(primaryPpe?.value).toBe('34')
    expect(primaryPpe?.hint).toBe('PE (Facade) + 3D6x10 + 20 (+3D6/level)')
    expect(morphusPpe?.value).toBe('34')
    expect(morphusPpe?.hint).toBe('PE (Facade) + 3D6x10 + 20 (+3D6/level)')
  })
})

describe('buildCreationLiveLedgerSnapshot morphus diff', () => {
  it('highlights Hand to Hand, combat, and H.F. that differ from Facade', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_nightbane',
      creationAttributeAssignments: {
        ps: 12,
        pe: 14,
        pp: 11,
        spd: 10,
      },
      creationHandToHandTier: 'basic' as const,
    }
    const race = getRaceById('race_nightbane')

    const morphusSnapshot = buildCreationLiveLedgerSnapshot({
      character,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
    })

    const hth = morphusSnapshot.combat.find((line) => line.label === 'Hand to Hand')
    expect(hth?.valueModified).toBe(true)
    expect(hth?.value).toContain('Martial Arts')
    expect(hth?.valueTooltip ?? '').not.toContain('Facade')

    const strike = morphusSnapshot.combat.find((line) => line.label === 'Strike')
    expect(strike?.valueModified).toBe(true)

    const magic = morphusSnapshot.saves.find((line) => line.label === 'Magic')
    expect(magic?.value).toBe('+9')
    expect(magic?.valueTooltip).toContain('P.E. +5')
    expect(magic?.valueTooltip).toContain('Race +4')
    expect(magic?.valueTooltip ?? '').not.toContain('Facade')

    const mindControl = morphusSnapshot.saves.find((line) => line.label === 'Mind Control')
    expect(mindControl).toEqual({
      label: 'Mind Control',
      value: 'Immune',
      valueModified: true,
      hint: 'Nightbane R.C.C.',
    })

    const hf = morphusSnapshot.vitals.find((line) => line.label === 'H.F.')
    expect(hf?.valueModified).toBe(true)
    expect(hf?.value).toBe('6')

    const ppExceptional = morphusSnapshot.exceptional.find(
      (line) => line.label === 'P.P. strike / parry / dodge',
    )
    expect(ppExceptional?.valueModified).toBe(true)
    expect(ppExceptional?.valueTooltip).toBeUndefined()

    const noneSnapshot = buildCreationLiveLedgerSnapshot({
      character: createBlankCharacterForGenre('nightbane'),
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'primary',
    })
    expect(
      noneSnapshot.combat.find((line) => line.label === 'Hand to Hand')?.value,
    ).toBe(LEDGER_HTH_NONE)
  })
})
