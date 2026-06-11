import { describe, expect, it } from 'vitest'
import { getMorphusCharacteristicById } from '../data/library/morphusTableCatalogLoader'
import {
  isMorphusCustomTraitSlotComplete,
  listMorphusCustomTraitCatalogEntries,
  resolveEffectiveMorphusTrait,
  resolveEffectiveMorphusTraitFromSlot,
  sanitizeMorphusCustomTraitInstance,
} from './morphusCustomTrait'

describe('morphusCustomTrait', () => {
  it('lists catalog entries with customTraitResolution', () => {
    const entries = listMorphusCustomTraitCatalogEntries()
    expect(entries.some((e) => e.id === 'mythical_creature_other')).toBe(true)
  })

  it('merges custom instance over catalog shell', () => {
    const catalog = getMorphusCharacteristicById('mythical_creature_other')
    expect(catalog).toBeDefined()
    const effective = resolveEffectiveMorphusTrait(catalog!, {
      displayName: 'Manticore',
      description: 'Lion body with scorpion tail.',
      gmApproved: true,
      statModifiers: { sdc: { dice: '2D6' }, hf: { flat: 2 } },
    }, 'slot-1')

    expect(effective.name).toBe('Manticore')
    expect(effective.entryRole).toBeUndefined()
    expect(effective.statModifiers?.sdc?.dice).toBe('2D6')
    expect(effective.id).toBe('mythical_creature_other::slot::slot-1')
    expect(effective.customOneOffs?.some((n) => n.includes('Custom trait'))).toBe(true)
  })

  it('requires gm approval when configured', () => {
    const slot = {
      slotId: 'a',
      catalogEntryId: 'mythical_creature_other',
      customInstance: {
        displayName: 'Chimera',
        description: 'Three-headed beast.',
        gmApproved: false,
      },
    }
    expect(isMorphusCustomTraitSlotComplete(slot)).toBe(false)
    expect(
      isMorphusCustomTraitSlotComplete({
        ...slot,
        customInstance: { ...slot.customInstance!, gmApproved: true },
      }),
    ).toBe(true)
  })

  it('resolves slot into effective trait for aggregation', () => {
    const trait = resolveEffectiveMorphusTraitFromSlot({
      slotId: 'b',
      catalogEntryId: 'mythical_creature_other',
      customInstance: {
        displayName: 'Griffin',
        description: 'Eagle and lion.',
        gmApproved: true,
        statModifiers: { strike: { flat: 1 } },
      },
    })
    expect(trait?.name).toBe('Griffin')
    expect(trait?.statModifiers?.strike?.flat).toBe(1)
  })

  it('strips empty polymorphic modifiers on sanitize', () => {
    const cleaned = sanitizeMorphusCustomTraitInstance({
      displayName: ' Test ',
      description: ' Notes ',
      gmApproved: true,
      statModifiers: {
        sdc: { flat: 10 },
        hp: { flat: undefined, dice: '', percent: undefined },
      },
    })
    expect(cleaned.displayName).toBe('Test')
    expect(cleaned.statModifiers?.sdc?.flat).toBe(10)
    expect(cleaned.statModifiers?.hp).toBeUndefined()
  })
})
