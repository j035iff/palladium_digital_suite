import { describe, expect, it } from 'vitest'
import { FACADE_LABEL, liveLedgerDescription } from './creationFormLabels'

describe('creationFormLabels', () => {
  it('never mentions Facade in Live Ledger copy for single-form builds', () => {
    for (const variant of ['card', 'sidebar'] as const) {
      const text = liveLedgerDescription({
        supportsDualForm: false,
        morphus: false,
        variant,
      })
      expect(text).not.toContain(FACADE_LABEL)
      expect(text.toLowerCase()).toContain('build mirror')
    }
  })

  it('uses Facade only for Nightbane dual-form primary ledger copy', () => {
    expect(
      liveLedgerDescription({
        supportsDualForm: true,
        morphus: false,
        variant: 'sidebar',
      }),
    ).toContain(FACADE_LABEL)
    expect(
      liveLedgerDescription({
        supportsDualForm: true,
        morphus: true,
        variant: 'sidebar',
      }),
    ).not.toContain(FACADE_LABEL)
  })
})
