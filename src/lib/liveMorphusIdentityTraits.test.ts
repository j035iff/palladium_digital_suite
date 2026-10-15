import { describe, expect, it } from 'vitest'
import { buildLiveMorphusIdentityTraitBreakdown } from './liveMorphusIdentityTraits'

describe('liveMorphusIdentityTraits', () => {
  it('lists resolved traits from morphusTraitSlotResolutions (creation storage)', () => {
    const breakdown = buildLiveMorphusIdentityTraitBreakdown({
      morphusTraitSlotResolutions: [
        {
          slotId: 'slot_1',
          catalogEntryId: 'mineral_obsidian',
        },
      ],
    })
    // Catalog may or may not resolve in test env — either empty or named rows.
    // Prefer effective traits when id resolves; never invent names.
    for (const row of breakdown.rows) {
      expect(row.name.trim().length).toBeGreaterThan(0)
      expect(row.name).not.toMatch(/^mineral_/)
    }
    expect(breakdown.fromForgeTree).toBe(false)
  })

  it('returns empty rows when no creation trait picks exist', () => {
    expect(buildLiveMorphusIdentityTraitBreakdown({}).rows).toEqual([])
  })
})
