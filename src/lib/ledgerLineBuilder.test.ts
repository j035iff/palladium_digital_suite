import { describe, expect, it } from 'vitest'
import {
  buildCreationLedgerLine,
  buildStackBonusLedgerLine,
  buildVitalityLedgerLineFromBlock,
  formatHorrorFactorLedgerTooltip,
  formatLedgerTooltip,
  resolveLedgerHasPendingRolls,
} from './ledgerLineBuilder'
import { buildSdcStatBonusDetails } from './ledgerStatBonuses'
import { getLibraryOccById, getRaceById } from '../data/library/registry'

describe('ledgerLineBuilder', () => {
  it('formats facade attribute tooltips with pending rolls', () => {
    expect(
      formatLedgerTooltip({
        kind: 'facade_attribute',
        poolRoll: 14,
        flatBreakdown: [{ label: 'Athletics (general)', amount: 4 }],
        occVariableBonus: 0,
        pendingRolls: true,
      }),
    ).toBe('(Roll 14, Athletics (general) +4, +pending rolls)')
  })

  it('formats morphus-relative tooltips through the same dispatcher', () => {
    expect(
      formatLedgerTooltip({
        kind: 'morphus_relative',
        facadeTotal: 12,
        deltas: [{ label: 'Race', amount: 10 }],
      }),
    ).toBe('Facade 12, Race +10')
  })

  it('assembles stack combat lines with per-trait expansion', () => {
    const line = buildStackBonusLedgerLine({
      label: 'Strike',
      stack: [
        { bucket: 'misc', label: 'Features', amount: 2 },
        { bucket: 'exceptional', label: 'P.P.', amount: 1 },
      ],
      value: '+3',
      valueModified: true,
      tooltip: {
        kind: 'stack_combat',
        traitEntries: [{ name: 'Arachnid', amount: 2 }],
      },
    })
    expect(line.hint).toBeUndefined()
    expect(line.valueTooltip).toBe('(Arachnid +2, P.P. +1)')
  })

  it('dedupes morphus H.F. trait flats in value tooltip', () => {
    expect(
      formatHorrorFactorLedgerTooltip({
        profile: {
          total: 9,
          contributions: [
            { label: 'Race', amount: 6 },
            { label: 'Musclebound', amount: 1 },
            { label: 'Super-Strong', amount: 1 },
          ],
          tooltipEquation: '',
        },
        traitFlatBreakdown: [
          { label: 'Musclebound', amount: 1 },
          { label: 'Super-Strong', amount: 1 },
        ],
      }),
    ).toBe('(Race +6, Musclebound +1, Super-Strong +1)')
  })

  it('strips breakdown hints from flat-only rows', () => {
    const line = buildCreationLedgerLine({
      label: 'Strike',
      value: '+3',
      hint: 'P.P.: +2 · HtH Basic: +1',
      tooltip: {
        kind: 'stack_combat',
        terms: [
          { bucket: 'exceptional', label: 'P.P.', amount: 2 },
          { bucket: 'hth', label: 'HtH Basic', amount: 1 },
        ],
      },
    })
    expect(line.hint).toBeUndefined()
    expect(line.valueTooltip).toBe('(P.P. +2, HtH Basic +1)')
  })

  it('formats apm tooltips from modifier stack', () => {
    expect(
      formatLedgerTooltip({
        kind: 'apm',
        terms: [
          { bucket: 'hth', label: 'HtH Expert', amount: 1 },
          { bucket: 'skills', label: 'Skills', amount: 2 },
        ],
      }),
    ).toBe('(Base: 2, HtH Expert: +1, Skills: +2)')
  })

  it('derives hasPendingRolls from pending dice blocks', () => {
    const block = {
      id: 'hp',
      label: 'H.P.',
      flatBaseline: 11,
      groups: [
        {
          kind: 'race' as const,
          display: '1D6',
          tooltip: '(1D6)',
          rolls: [
            {
              id: 'spawn.hp.race.0',
              notation: '1D6',
              min: 1,
              max: 6,
              source: 'Race',
            },
          ],
        },
      ],
    }
    expect(resolveLedgerHasPendingRolls(block, {})).toBe(true)
    const line = buildCreationLedgerLine({
      label: 'H.P.',
      value: '11',
      pendingBlock: block,
      resolutions: {},
      tooltip: {
        kind: 'vitality_block',
        flatTerms: [],
        block,
        resolutions: {},
        pendingRolls: true,
      },
    })
    expect(line.hasPendingRolls).toBe(true)
    expect(line.valueTooltip).toBe('(+pending rolls)')
  })

  it('attaches label tooltip from registry on buildCreationLedgerLine', () => {
    const line = buildCreationLedgerLine({
      label: 'I.Q.',
      value: '12',
    })
    expect(line.labelTooltip).toContain('Intelligence')
  })

  it('prefers explicit labelTooltip over registry', () => {
    const line = buildCreationLedgerLine({
      label: 'Base P.E. Save Bonus',
      labelTooltip: 'Add to d20 on saves that call for P.E. bonuses only.',
      value: '+2',
    })
    expect(line.labelTooltip).toBe('Add to d20 on saves that call for P.E. bonuses only.')
  })

  it('formats source attribution and supernatural damage through the dispatcher', () => {
    expect(
      formatLedgerTooltip({
        kind: 'source_attribution',
        sourceLabel: 'Race',
        text: 'Immune',
      }),
    ).toBe('Race: Immune')
    expect(
      formatLedgerTooltip({
        kind: 'supernatural_damage',
        restrained: '+2D6',
        power: '+4D6',
      }),
    ).toBe('Restrained +2D6 · Power +4D6')
    expect(
      formatLedgerTooltip({
        kind: 'morphus_text_fallback',
        facadeValue: '12',
        morphusValue: '22',
      }),
    ).toBe('Facade 12, Race 22')
  })

  it('lists S.D.C. skill flats once when block and fallback both carry them', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const skillIds = ['skill_body_building_weight_lifting']
    const sdcDetails = buildSdcStatBonusDetails(
      human,
      occ,
      null,
      skillIds,
      {},
    )
    const block = {
      id: 'sdc',
      label: 'S.D.C.',
      flatBaseline: sdcDetails.flatTotal,
      flatTerms: sdcDetails.flatVitalTerms,
      skillFlatTerms: sdcDetails.skillFlats,
      groups: sdcDetails.diceGroups.map((group) => ({
        kind: group.kind,
        display: group.display,
        tooltip: group.tooltip,
        rolls: group.contributions.map((contribution, index) => ({
          id: `spawn.sdc.${group.kind}.${index}`,
          notation: contribution.notation,
          min: 1,
          max: 6,
          source: contribution.label,
        })),
      })),
    }
    const line = buildVitalityLedgerLineFromBlock('S.D.C.', block, {}, {
      label: 'S.D.C.',
      value: String(sdcDetails.flatTotal),
      valueModified: true,
      skillFlatTerms: sdcDetails.skillFlats,
      flatTerms: sdcDetails.flatVitalTerms,
    })
    expect(line.value).toBe(String(sdcDetails.flatTotal))
    expect(
      line.valueTooltip?.match(/Body Building & Weight Lifting \+10/g)?.length,
    ).toBe(1)
  })
})
