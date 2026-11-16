import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { isCharacterNameFilled, isIdentitySpawnPrepComplete } from '../characterIdentity'
import {
  DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
  DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE,
  withDevSpawnIdentity,
} from './devSpawnIdentity'

describe('withDevSpawnIdentity', () => {
  it('fills missing name, identity profile, and alignment', () => {
    const prev = createBlankCharacterForGenre('nightbane')
    const next = withDevSpawnIdentity(prev)

    expect(next.name).toBe(DEV_SKIP_TO_REVIEW_CHARACTER_NAME)
    expect(isCharacterNameFilled(next.name)).toBe(true)
    expect(next.identityProfile).toMatchObject(DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE)
    expect(next.primary.alignment?.trim()).toBeTruthy()
    expect(
      isIdentitySpawnPrepComplete(next.name, next.identityProfile),
    ).toBe(true)
  })

  it('preserves already-filled name and identity fields', () => {
    const prev = {
      ...createBlankCharacterForGenre('nightbane'),
      name: 'Rook',
      identityProfile: {
        sex: 'F',
        age: '22',
        heightFeet: '5',
        heightInches: '6',
        weightLbs: '140',
        eyes: 'Green',
        hair: 'Red',
      },
      primary: {
        ...createBlankCharacterForGenre('nightbane').primary,
        alignment: 'Principled',
      },
    }
    const next = withDevSpawnIdentity(prev)

    expect(next.name).toBe('Rook')
    expect(next.identityProfile?.sex).toBe('F')
    expect(next.identityProfile?.eyes).toBe('Green')
    expect(next.primary.alignment).toBe('Principled')
  })
})
