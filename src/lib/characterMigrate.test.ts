import { describe, expect, it } from 'vitest'
import { migrateCharacterFromLegacyFacade } from './characterMigrate'
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
