import { describe, expect, it } from 'vitest'
import { getPalladiumTalentById } from '../data/library/registry'
import {
  formatTalentFormRules,
  listTalentFormUsageLines,
} from './talentDisplay'

describe('talentDisplay form rules', () => {
  it('lists by-target form scopes for Leave No Trace', () => {
    const talent = getPalladiumTalentById('talent_leave_no_trace')
    expect(talent).toBeDefined()
    const lines = listTalentFormUsageLines(talent!.limitations)
    expect(lines).toEqual([
      {
        label: 'On self',
        value:
          'Facade or Morphus · full effect (base + enhancements) · Basic or boosted on self in Facade or Morphus.',
      },
      {
        label: 'On others',
        value:
          'Morphus only · base effect only (no P.P.E. enhancement) · Basic benefits only; boosted Leave No Trace cannot be used on another individual.',
      },
    ])
  })

  it('lists phase form scopes for Seedling', () => {
    const talent = getPalladiumTalentById('talent_seedling')
    expect(talent).toBeDefined()
    const lines = listTalentFormUsageLines(talent!.limitations)
    expect(lines).toEqual([
      {
        label: 'Activation',
        value: 'Morphus only · Plant the seedling',
      },
      { label: 'After activation', value: 'Facade or Morphus' },
    ])
  })

  it('falls back to a simple form label when formUsage is absent', () => {
    const talent = getPalladiumTalentById('talent_blast_wave')
    expect(talent).toBeDefined()
    expect(formatTalentFormRules(talent!.limitations)).toEqual([
      { label: 'Form', value: 'Facade or Morphus' },
    ])
  })
})
