import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { buildCreationAttributeBlock, buildCreationLiveLedgerSnapshot, buildCreationVitalsBlock, LEDGER_HTH_NONE } from './creationLiveLedger'
import {
  buildMorphusCreationAttributeBlock,
  formatMorphusVsFacadeTooltip,
} from './morphusCreationLedger'

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

    const facadeLines = buildCreationAttributeBlock(
      character.facade.attributes,
      character.creationAttributeAssignments,
    )
    const morphusLines = buildMorphusCreationAttributeBlock(facadeLines, character)

    const ps = morphusLines.find((line) => line.label === 'P.S.')!
    const pe = morphusLines.find((line) => line.label === 'P.E.')!
    const pp = morphusLines.find((line) => line.label === 'P.P.')!
    const spd = morphusLines.find((line) => line.label === 'Spd')!
    const iq = morphusLines.find((line) => line.label === 'I.Q.')!

    expect(ps.value).toBe('22')
    expect(ps.valueModified).toBe(true)
    expect(ps.valueTooltip).toBe('Facade 12, Base +10')

    expect(pe.value).toBe('24')
    expect(pe.valueModified).toBe(true)
    expect(pe.valueTooltip).toBe('Facade 14, Base +10')

    expect(pp.value).toBe('17')
    expect(pp.valueModified).toBe(true)
    expect(pp.valueTooltip).toBe('Facade 11, Base +6')

    expect(spd.value).toBe('20')
    expect(spd.valueModified).toBe(true)
    expect(spd.valueTooltip).toBe('Facade 10, Base +10')

    expect(iq.value).toBe('10')
    expect(iq.valueModified).toBeFalsy()
  })
})

describe('formatMorphusVsFacadeTooltip', () => {
  it('lists Facade total then each Morphus delta', () => {
    expect(
      formatMorphusVsFacadeTooltip(12, [{ label: 'Base', amount: 10 }]),
    ).toBe('Facade 12, Base +10')
  })
})

describe('buildCreationVitalsBlock dual-form toggle', () => {
  it('shows one H.P. and S.D.C. row per active form', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { pe: 14, ps: 12 },
    }
    const race = getRaceById('race_nightbane')
    const attrs = character.facade.attributes
    const morphusAttrScores = { pe: 24, ps: 22 }

    const facadeVitals = buildCreationVitalsBlock({
      character,
      attrs,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'facade',
      passive: {},
      horrorFactorTotal: null,
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
      horrorFactorTotal: null,
      skillIds: [],
      attrScores: morphusAttrScores,
    })

    const facadeHpLabels = facadeVitals.filter((l) => l.label.includes('H.P.'))
    const facadeSdcLabels = facadeVitals.filter((l) => l.label.includes('S.D.C.'))
    expect(facadeHpLabels).toHaveLength(1)
    expect(facadeSdcLabels).toHaveLength(1)
    expect(facadeHpLabels[0]?.label).toBe('H.P.')

    const morphusHpLabels = morphusVitals.filter((l) => l.label.includes('H.P.'))
    const morphusSdcLabels = morphusVitals.filter((l) => l.label.includes('S.D.C.'))
    expect(morphusHpLabels).toHaveLength(1)
    expect(morphusSdcLabels).toHaveLength(1)
    expect(morphusHpLabels[0]?.label).toBe('H.P.')
    expect(morphusHpLabels[0]?.hint).toContain('P.E. ×3')
    expect(morphusSdcLabels[0]?.hint).toBe('Facade S.D.C. + 2D6×10')
  })

  it('shows Mind Control immunity on Facade and Morphus ledgers', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'nightbane',
      creationAttributeAssignments: { pe: 14 },
    }
    const race = getRaceById('nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const baseOpts = {
      character,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'facade' as const,
    }

    for (const activeForm of ['facade', 'morphus'] as const) {
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
    const race = getRaceById('nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const attrs = character.facade.attributes
    const baseOpts = {
      character,
      attrs,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      passive: {},
      horrorFactorTotal: null,
      skillIds: [],
    }

    const facadePpe = buildCreationVitalsBlock({
      ...baseOpts,
      activeForm: 'facade',
    }).find((line) => line.label === 'P.P.E.')
    const morphusPpe = buildCreationVitalsBlock({
      ...baseOpts,
      activeForm: 'morphus',
      attrScores: { pe: 24, ps: 22 },
    }).find((line) => line.label === 'P.P.E.')

    expect(facadePpe?.value).toBe('14')
    expect(facadePpe?.hint).toBe('PE (facade) + 3D6x10 + 20 (+3D6/level)')
    expect(morphusPpe?.value).toBe('14')
    expect(morphusPpe?.hint).toBe('PE (facade) + 3D6x10 + 20 (+3D6/level)')
  })
})

describe('buildCreationLiveLedgerSnapshot morphus diff', () => {
  it('highlights Hand to Hand, combat, and H.F. that differ from Facade', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'nightbane',
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
    expect(magic?.hint).toContain('P.E.: +5')
    expect(magic?.hint).toContain('Other modifiers: +4')
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
      activeForm: 'facade',
    })
    expect(
      noneSnapshot.combat.find((line) => line.label === 'Hand to Hand')?.value,
    ).toBe(LEDGER_HTH_NONE)
  })
})
