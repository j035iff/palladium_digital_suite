import { describe, expect, it } from 'vitest'
import {
  isVitalityPendingBlockId,
  projectFacadeAttributeLine,
  resolvedVitalityRowFromBlock,
  rowHasPendingDice,
  sumResolvedRowTotal,
  type LedgerContribution,
  type ResolvedLedgerRow,
} from './ledgerRowResolution'
import type { PendingDiceBlock } from './spawnDiceBlocks'

describe('ledgerRowResolution', () => {
  it('sumResolvedRowTotal excludes unresolved dice_pending amounts', () => {
    const row: ResolvedLedgerRow = {
      id: 'morphus_attr_ps',
      label: 'P.S.',
      formScope: 'morphus',
      section: 'attribute',
      contributions: [
        { kind: 'facade_base', scope: 'morphus', label: 'Facade', amount: 11 },
        { kind: 'flat', scope: 'morphus', label: 'Race', amount: 10 },
        {
          kind: 'dice_pending',
          scope: 'morphus',
          label: 'Musclebound',
          notation: '1D6+4',
          bucket: 'traits',
          rollId: 'spawn.morphus_attr_ps.traits.0',
        },
      ],
      total: 21,
    }
    expect(sumResolvedRowTotal(row, ['facade', 'morphus'])).toBe(21)
  })

  it('rowHasPendingDice is false when all morphus rolls are entered', () => {
    const row: ResolvedLedgerRow = {
      id: 'morphus_attr_ps',
      label: 'P.S.',
      formScope: 'morphus',
      section: 'attribute',
      contributions: [
        {
          kind: 'dice_entered',
          scope: 'morphus',
          label: 'Musclebound',
          notation: '1D6',
          bucket: 'traits',
          rollId: 'spawn.morphus_attr_ps.traits.0',
          resolvedAmount: 3,
        },
      ],
      total: 3,
    }
    expect(rowHasPendingDice(row, { 'spawn.morphus_attr_ps.traits.0': 3 })).toBe(false)
  })

  it('resolvedVitalityRowFromBlock maps block metadata and running total', () => {
    const block: PendingDiceBlock = {
      id: 'sdc',
      label: 'S.D.C.',
      flatBaseline: 20,
      flatTooltip: '(RaceFlat +20)',
      flatTerms: [{ kind: 'flat', source: 'race', label: 'RaceFlat', amount: 20 }],
      groups: [
        {
          kind: 'skills',
          display: '1D6',
          tooltip: '(Skills: 1D6)',
          rolls: [
            {
              id: 'spawn.sdc.skills.0',
              notation: '1D6',
              min: 1,
              max: 6,
              source: 'Body Building',
            },
          ],
        },
      ],
    }
    const row = resolvedVitalityRowFromBlock(block, { 'spawn.sdc.skills.0': 4 })
    expect(isVitalityPendingBlockId('sdc')).toBe(true)
    expect(row.formScope).toBe('facade')
    expect(row.total).toBe(24)
    expect(row.precomputedFlatTooltip).toBe('(RaceFlat +20)')
    expect(row.contributions.some((c) => c.kind === 'dice_entered')).toBe(true)
  })

  it('projectFacadeAttributeLine does not duplicate entered dice in tooltip', () => {
    const contributions: LedgerContribution[] = [
      { kind: 'pool_roll', scope: 'facade', label: 'Roll', amount: 14 },
      {
        kind: 'dice_entered',
        scope: 'facade',
        label: 'Athletics (general)',
        resolvedAmount: 4,
        amount: 4,
      },
    ]
    const row: ResolvedLedgerRow = {
      id: 'attr_spd',
      label: 'Spd',
      formScope: 'facade',
      section: 'attribute',
      contributions,
      total: 18,
      valueModified: true,
    }
    const line = projectFacadeAttributeLine(row, { hasPendingRolls: false })
    expect(line.value).toBe('18')
    expect(line.valueTooltip).toBe('(Roll 14, Athletics (general) +4)')
  })
})
