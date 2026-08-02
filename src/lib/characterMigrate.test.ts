import { describe, expect, it } from 'vitest'
import {
  CHARACTER_SAVE_SCHEMA_VERSION,
  migrateCharacterFromLegacyFacade,
  migrateCharacterSave,
} from './characterMigrate'
import { characterFixture } from '../data/characterFixture'
import { ensureCharacterRoot } from './characterRoot'

describe('migrateCharacterFromLegacyFacade', () => {
  it('moves legacy facade branch to primary', () => {
    const legacy = {
      ...ensureCharacterRoot(characterFixture, {
        creationGenreId: 'nightbane',
        hostGenreId: 'nightbane',
      }),
      facade: characterFixture.primary,
      creationFacadeDiceFinalized: true,
    } as Record<string, unknown>
    delete legacy.primary

    const migrated = migrateCharacterFromLegacyFacade(legacy as never)
    expect(migrated.primary.attributes.iq).toBe(characterFixture.primary.attributes.iq)
    expect((migrated as Record<string, unknown>).facade).toBeUndefined()
    expect(migrated.creationPrimaryDiceFinalized).toBe(true)
  })
})

describe('migrateCharacterSave', () => {
  it('stamps schemaVersion and remaps legacy forge tab keys', () => {
    const legacy = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    const { character, report } = migrateCharacterSave({
      ...legacy,
      schemaVersion: 0,
      creationForgeTab: 'tab7_review' as never,
      creationForgeCompleted: { tab7_review: true } as never,
      creationForgeSnapshots: { tab7_review: 'snap' } as never,
    })

    expect(character.schemaVersion).toBe(CHARACTER_SAVE_SCHEMA_VERSION)
    expect(character.creationForgeTab).toBe('tab8_review')
    expect(character.creationForgeCompleted?.tab8_review).toBe(true)
    expect(character.creationForgeSnapshots?.tab8_review).toBe('snap')
    expect(report.fieldRenames.some((r) => r.includes('tab7_review→tab8_review'))).toBe(
      true,
    )
  })

  it('remaps retired Morphus trait catalog ids', () => {
    const base = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    const { character, report } = migrateCharacterSave({
      ...base,
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'mythical_creature_cyclops_giant' },
      ],
      activeMorphusCharacteristicIds: ['mythical_creature_cyclops_giant'],
    })

    expect(character.morphusTraitSlotResolutions?.[0]?.catalogEntryId).toBe(
      'mythical_creature_cyclops',
    )
    expect(character.activeMorphusCharacteristicIds).toEqual([
      'mythical_creature_cyclops',
    ])
    expect(report.catalogRemaps).toEqual(
      expect.arrayContaining([
        {
          kind: 'morphusTrait',
          from: 'mythical_creature_cyclops_giant',
          to: 'mythical_creature_cyclops',
        },
      ]),
    )
    expect(
      report.orphanedCatalogIds.some((o) => o.id === 'mythical_creature_cyclops'),
    ).toBe(false)
  })

  it('reports orphaned catalog ids that cannot be remapped', () => {
    const base = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    const { report } = migrateCharacterSave({
      ...base,
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'totally_missing_trait_zzz' },
      ],
    })
    expect(report.orphanedCatalogIds).toEqual(
      expect.arrayContaining([
        { kind: 'morphusTrait', id: 'totally_missing_trait_zzz' },
      ]),
    )
  })

  it('is idempotent for already-current saves', () => {
    const base = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    const first = migrateCharacterSave(base)
    const second = migrateCharacterSave(first.character)
    expect(second.character.schemaVersion).toBe(CHARACTER_SAVE_SCHEMA_VERSION)
    expect(second.report.fieldRenames).toEqual([])
    expect(second.report.catalogRemaps).toEqual([])
  })
})
