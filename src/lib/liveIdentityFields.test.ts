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
      'sex',
      'weightLbs',
    ])
  })

  it('normalizes missing description/personality to empty strings', () => {
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

    const filled = normalizeIdentityProfile({
      ...legacy,
      description: 'Tall scout',
      personality: 'Dry wit',
    })
    expect(filled.description).toBe('Tall scout')
    expect(filled.personality).toBe('Dry wit')
  })
})
