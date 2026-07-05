import { describe, expect, it } from 'vitest'
import { LEDGER_LABEL_TOOLTIPS, resolveLedgerLabelTooltip } from './ledgerStatDescriptions'

describe('resolveLedgerLabelTooltip', () => {
  it('returns explicit override when provided', () => {
    expect(
      resolveLedgerLabelTooltip('I.Q.', 'Custom description from attribute save row.'),
    ).toBe('Custom description from attribute save row.')
  })

  it('resolves known attribute labels', () => {
    expect(resolveLedgerLabelTooltip('I.Q.')).toBe(LEDGER_LABEL_TOOLTIPS['I.Q.'])
    expect(resolveLedgerLabelTooltip('Base P.E. Save Bonus')).toBe(
      LEDGER_LABEL_TOOLTIPS['Base P.E. Save Bonus'],
    )
  })

  it('resolves dynamic M.A. / P.B. skill rows by prefix', () => {
    expect(resolveLedgerLabelTooltip('M.A. Acrobatics')).toContain('specific skill')
    expect(resolveLedgerLabelTooltip('P.B. Seduction')).toContain('specific skill')
  })

  it('returns undefined for unknown labels', () => {
    expect(resolveLedgerLabelTooltip('Unknown stat')).toBeUndefined()
  })
})
