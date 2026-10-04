import { describe, expect, it } from 'vitest'
import { EMPTY_CHARACTER_IDENTITY_PROFILE } from './characterIdentity'

/**
 * Live-sheet editable identity inventory (Joe scope): every field on
 * CharacterIdentityProfile + name + alignment — not Race/O.C.C.
 */
describe('live identity field inventory', () => {
  it('lists all profile keys that Identity Expand persists', () => {
    expect(Object.keys(EMPTY_CHARACTER_IDENTITY_PROFILE).sort()).toEqual([
      'age',
      'eyes',
      'hair',
      'heightFeet',
      'heightInches',
      'sex',
      'weightLbs',
    ])
  })
})
