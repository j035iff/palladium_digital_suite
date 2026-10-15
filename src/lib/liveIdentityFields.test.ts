import { describe, expect, it } from 'vitest'
import {
  EMPTY_CHARACTER_IDENTITY_PROFILE,
  normalizeIdentityProfile,
} from './characterIdentity'

/**
 * Live-sheet editable identity inventory (Joe scope): every field on
 * CharacterIdentityProfile + name + alignment — not Race/O.C.C.
 */
describe('live identity field inventory', () => {
  it('lists all profile keys that Identity Expand persists', () => {
    expect(Object.keys(EMPTY_CHARACTER_IDENTITY_PROFILE).sort()).toEqual([
      'age',
      'description',
      'eyes',
      'hair',
      'heightFeet',
      'heightInches',
      'personality',
      'portraits',
      'sex',
      'weightLbs',
    ])
  })

  it('normalizes missing description/personality and Morphus overlay', () => {
    const legacy = normalizeIdentityProfile({
      sex: 'M',
      age: '28',
      heightFeet: '6',
      heightInches: '0',
      weightLbs: '185',
      eyes: 'Brown',
      hair: 'Black',
    })
    expect(legacy.description).toBe('')
    expect(legacy.personality).toBe('')
    expect(legacy.portraits).toEqual({})
    expect(legacy.morphus).toBeUndefined()

    const filled = normalizeIdentityProfile({
      ...legacy,
      description: 'Tall scout',
      personality: 'Dry wit',
      portraits: {
        primary: 'data:image/jpeg;base64,facade',
        morphus: 'data:image/jpeg;base64,morphus',
      },
      morphus: { eyes: 'Gold', hair: 'None' },
    })
    expect(filled.description).toBe('Tall scout')
    expect(filled.personality).toBe('Dry wit')
    expect(filled.portraits).toEqual({
      primary: 'data:image/jpeg;base64,facade',
      morphus: 'data:image/jpeg;base64,morphus',
    })
    expect(filled.morphus).toEqual({ eyes: 'Gold', hair: 'None' })
  })
})
