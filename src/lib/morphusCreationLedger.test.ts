import { describe, expect, it } from 'vitest'
import { getRaceById, getLibraryOccById } from '../data/library/registry'
import { createBlankCharacterForGenre } from './characterRoot'
import { buildCreationAttributeBlock, buildCreationLiveLedgerSnapshot, buildCreationVitalsBlock, LEDGER_HTH_NONE } from './creationLiveLedger'
import { buildPendingDiceBlocks, pendingDiceBlockRunningTotal } from './spawnDiceBlocks'
import type { HorrorFactorProfile } from './saveProfile'
import { computeHorrorFactorAura } from './saveProfile'

const EMPTY_HORROR_FACTOR_PROFILE: HorrorFactorProfile = {
  total: null,
  contributions: [],
  tooltipEquation: '',
}
import {
  buildMorphusCreationAttributeBlock,
  buildMorphusTraitHorrorFactorDetails,
  buildMorphusTraitSdcBonusDetails,
  collectMorphusTraitStatDiceContributions,
  creationLedgerSavePassiveModifiers,
  formatMorphusVsPrimaryTooltip,
} from './morphusCreationLedger'
import { morphusCreationPreviewResolveOptions, polymorphicDeltaFromBase } from './morphusPolymorphicResolver'
import { normalizeDiceDisplay } from './ledgerStatBonuses'
import { applyNightbaneMorphusBaseAttributes } from './morphusNightbaneBase'

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

describe('morphus trait ledger preview', () => {
  it('defers attribute dice until Finalize Morphus', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { spd: 10 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'animal_arachnid_full' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const primaryLines = buildCreationAttributeBlock(
      character.primary.attributes,
      character.creationAttributeAssignments,
    )
    const morphusLines = buildMorphusCreationAttributeBlock(primaryLines, character)
    const spd = morphusLines.find((line) => line.label === 'Spd')!

    expect(spd.value).toBe('20')
    const contrib = collectMorphusTraitStatDiceContributions(character, 'spd')
    expect(contrib).toEqual([{ notation: '1D4x10', label: 'Full Arachnid' }])
    expect(
      spd.diceGroups?.some(
        (group) =>
          group.kind === 'traits' &&
          group.display === normalizeDiceDisplay('1D4x10'),
      ),
    ).toBe(true)
  })

  it('defers Horror Factor dice to Traits row on vitals', () => {
    const details = buildMorphusTraitHorrorFactorDetails({
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'stigmata_body_faces' },
      ],
      creationTraitForgeStubComplete: false,
    })
    expect(details.flatTotal).toBe(0)
    expect(details.diceContributions).toEqual([
      { notation: '1D6', label: 'Body Faces' },
    ])
  })

  it('uses preview resolve options that skip dice rolls', () => {
    const delta = polymorphicDeltaFromBase(
      10,
      [{ dice: '1D6' }],
      morphusCreationPreviewResolveOptions(false),
    )
    expect(delta).toBe(0)
  })

  it('aggregates trait Horror Factor flats on the morphus vitals ledger', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { pe: 14 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'animal_arachnid_full' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const race = getRaceById('race_nightbane')
    const vitals = buildCreationVitalsBlock({
      character,
      attrs: character.primary.attributes,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
      passive: creationLedgerSavePassiveModifiers(character, 'morphus', undefined, true),
      horrorFactorProfile: computeHorrorFactorAura(
        character,
        'morphus',
        creationLedgerSavePassiveModifiers(character, 'morphus', undefined, true),
        true,
        race,
      ),
      skillIds: [],
      attrScores: { pe: 24 },
    })
    const hf = vitals.find((line) => line.label === 'H.F.')!
    expect(hf.value).toBe('12')
    expect(hf.valueModified).toBe(true)
    expect(hf.valueTooltip).toContain('Race +6')
    expect(hf.valueTooltip).toContain('Arachnid')
  })

  it('shows pending trait Horror Factor dice on the morphus vitals ledger', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'stigmata_body_faces' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const race = getRaceById('race_nightbane')
    const savePassive = creationLedgerSavePassiveModifiers(character, 'morphus', undefined, true)
    const vitals = buildCreationVitalsBlock({
      character,
      attrs: character.primary.attributes,
      race,
      occ: undefined,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
      passive: savePassive,
      horrorFactorProfile: computeHorrorFactorAura(
        character,
        'morphus',
        savePassive,
        true,
        race,
      ),
      skillIds: [],
    })
    const hf = vitals.find((line) => line.label === 'H.F.')!
    expect(hf.value).toBe('6')
    expect(hf.hasPendingRolls).toBe(true)
    expect(hf.diceGroups?.[0]?.kind).toBe('traits')
    expect(hf.diceGroups?.[0]?.display).toBe(normalizeDiceDisplay('1D6'))
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

  it('appends pending rolls when trait dice are unresolved', () => {
    expect(
      formatMorphusVsPrimaryTooltip(
        11,
        [
          { label: 'Race', amount: 10 },
          { label: 'Super-Strong', amount: 10 },
          { label: 'Musclebound', amount: 4 },
        ],
        true,
      ),
    ).toBe('Facade 11, Race +10, Super-Strong +10, Musclebound +4, +pending rolls')
  })
})

describe('morphus trait attribute flats and pending PS', () => {
  it('includes dice-string flats in tooltip without double-counting explicit flats', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { ps: 11 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'athlete_musclebound' },
        { slotId: 'plan:1', catalogEntryId: 'super_being_super_strong' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const blocks = buildPendingDiceBlocks(character, race, occ, {
      psychicTier: 'none',
      supportsDualForm: true,
    })
    const psBlock = blocks.find((block) => block.id === 'morphus_attr_ps')!
    expect(psBlock.flatBaseline).toBe(35)
    expect(
      psBlock.groups[0]?.rolls.map((roll) => roll.notation).sort(),
    ).toEqual(['1D4', '1D6'])

    const snapshot = buildCreationLiveLedgerSnapshot({
      character,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
    })
    const ps = snapshot.attributes.find((line) => line.label === 'P.S.')!
    expect(ps.value).toBe('35')
    expect(ps.hasPendingRolls).toBe(true)
    expect(ps.valueTooltip).toBe(
      'Facade 11, Race +10, Musclebound +4, Super-Strong +10, +pending rolls',
    )
    expect(ps.diceGroups?.find((group) => group.kind === 'traits')?.display).toBe(
      '1D6 + 1D4',
    )
  })

  it('adds entered trait dice to PS total and tooltip', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { ps: 11 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'athlete_musclebound' },
        { slotId: 'plan:1', catalogEntryId: 'super_being_super_strong' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const blocks = buildPendingDiceBlocks(character, race, occ, {
      psychicTier: 'none',
      supportsDualForm: true,
    })
    const psBlock = blocks.find((block) => block.id === 'morphus_attr_ps')!
    const rolls = psBlock.groups[0]!.rolls
    const muscleRoll = rolls.find((roll) => roll.notation === '1D6')!
    const strongRoll = rolls.find((roll) => roll.notation === '1D4')!
    const resolutions = {
      [muscleRoll.id]: 3,
      [strongRoll.id]: 2,
    }
    const snapshot = buildCreationLiveLedgerSnapshot({
      character: { ...character, creationPendingDiceResolutions: resolutions },
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
    })
    const ps = snapshot.attributes.find((line) => line.label === 'P.S.')!
    expect(ps.value).toBe('40')
    expect(ps.valueTooltip).toBe(
      'Facade 11, Race +10, Musclebound +4, Super-Strong +10, Musclebound +3, Super-Strong +2',
    )
  })
})

describe('morphus ledger attribute dice groups', () => {
  it('hides Facade skill dice rolls while keeping Morphus trait rolls', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { spd: 14 },
      creationSecondarySkillPicks: [
        { instanceId: 'ath', skillId: 'skill_athletics_general' },
      ],
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'athlete_musclebound' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const primaryLines = buildCreationAttributeBlock(
      character.primary.attributes,
      character.creationAttributeAssignments,
      race,
      occ,
      undefined,
      [
        ...(character.creationOccSkillIds ?? []),
        'skill_athletics_general',
      ],
    )
    const facadeSpd = primaryLines.find((line) => line.label === 'Spd')!
    expect(facadeSpd.diceGroups?.some((group) => group.kind === 'skills')).toBe(true)

    const snapshot = buildCreationLiveLedgerSnapshot({
      character,
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'major',
      activeForm: 'morphus',
    })
    const morphusSpd = snapshot.attributes.find((line) => line.label === 'Spd')!
    expect(morphusSpd.diceGroups?.some((group) => group.kind === 'skills')).toBe(false)
    expect(morphusSpd.diceGroups?.find((group) => group.kind === 'traits')?.display).toBe(
      '-1D6',
    )
  })

  it('includes Facade skill flats in morphus P.P. and P.E. totals after base stats are applied', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { pp: 10, pe: 12 },
      creationSecondarySkillPicks: [
        { instanceId: 'acro', skillId: 'skill_acrobatics' },
      ],
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'athlete_musclebound' },
        { slotId: 'plan:1', catalogEntryId: 'super_being_super_strong' },
      ],
      creationTraitForgeStubComplete: false,
      morphusForgeState: {
        ...createBlankCharacterForGenre('nightbane').morphusForgeState,
        baseStatsApplied: true,
      },
    }
    const withBase = applyNightbaneMorphusBaseAttributes(character, occ)
    const snapshot = buildCreationLiveLedgerSnapshot({
      character: {
        ...withBase,
        morphusForgeState: {
          ...withBase.morphusForgeState,
          baseStatsApplied: true,
        },
      },
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
    })
    const pp = snapshot.attributes.find((line) => line.label === 'P.P.')!
    const pe = snapshot.attributes.find((line) => line.label === 'P.E.')!
    expect(pp.value).toBe('15')
    expect(pe.value).toBe('25')
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
    expect(morphusHpLabels[0]?.diceGroups?.[0]?.display).toContain('2D6/level')
    expect(morphusHpLabels[0]?.hint ?? '').not.toContain('P.E.')
    const morphusSdc = morphusSdcLabels[0]
    expect(morphusSdc?.diceGroups?.some((group) => group.kind === 'race')).toBe(true)
    expect(morphusSdc?.diceGroups?.find((group) => group.kind === 'race')?.display).toBe(
      '2D6x10',
    )
    expect(morphusSdc?.hint ?? '').not.toContain('Facade')
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
      ).toEqual(
        expect.objectContaining({
          label: 'Mind Control',
          value: 'Immune',
          valueModified: true,
          valueTooltip: 'Race: Immune',
          labelTooltip: expect.stringContaining('mind control'),
        }),
      )
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
    expect(
      primaryPpe?.diceGroups?.find((group) => group.kind === 'occ')?.display,
    ).toContain('3D6x10')
    expect(morphusPpe?.value).toBe('34')
    expect(
      morphusPpe?.diceGroups?.find((group) => group.kind === 'occ')?.display,
    ).toContain('3D6x10')
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
    expect(mindControl).toEqual(
      expect.objectContaining({
        label: 'Mind Control',
        value: 'Immune',
        valueModified: true,
        valueTooltip: 'Race: Immune',
        labelTooltip: expect.stringContaining('mind control'),
      }),
    )

    const hf = morphusSnapshot.vitals.find((line) => line.label === 'H.F.')
    expect(hf?.valueModified).toBe(true)
    expect(hf?.value).toBe('6')

    const ppExceptional = morphusSnapshot.exceptional.find(
      (line) => line.label === 'P.P. strike / parry / dodge',
    )
    expect(ppExceptional?.valueModified).toBe(true)
    expect(ppExceptional?.valueTooltip).toContain('P.P. +1')

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

  it('matches Live Ledger morphus attribute totals from the same pending block', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      creationAttributeAssignments: { spd: 10 },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'animal_arachnid_full' },
      ],
      creationTraitForgeStubComplete: false,
    }
    const blocks = buildPendingDiceBlocks(character, race, occ, {
      psychicTier: 'none',
      supportsDualForm: true,
    })
    const spdBlock = blocks.find((b) => b.id === 'morphus_attr_spd')!
    const rollId = spdBlock.groups[0]!.rolls[0]!.id
    const resolutions = { [rollId]: 25 }
    const pendingTotal = pendingDiceBlockRunningTotal(spdBlock, resolutions)
    const snapshot = buildCreationLiveLedgerSnapshot({
      character: { ...character, creationPendingDiceResolutions: resolutions },
      race,
      occ,
      supportsDualForm: true,
      psychicTier: 'none',
      activeForm: 'morphus',
    })
    const spd = snapshot.attributes.find((line) => line.label === 'Spd')
    expect(spd?.value).toBe(String(pendingTotal))
  })
})
