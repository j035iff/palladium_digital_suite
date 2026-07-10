import { describe, expect, it } from 'vitest'
import {
  assessIdentitySpawnBlockers,
  hasValidIdentityHeight,
  IDENTITY_WHOLE_NUMBER_ERROR,
  identityHeightFeetError,
  identityHeightInchesError,
  identityWeightLbsError,
  isCharacterNameFilled,
  isIdentitySpawnPrepComplete,
  listIdentitySpawnPrepRequirements,
  EMPTY_CHARACTER_IDENTITY_PROFILE,
  parseIdentityHeightInches,
  parseIdentityWeightLbs,
  resolveIdentityHeightInches,
  sanitizeIdentityHeightInchesInput,
} from './characterIdentity'

describe('characterIdentity', () => {
  it('parses feet and inches into total height', () => {
    expect(
      parseIdentityHeightInches({ heightFeet: '6', heightInches: '2' } as never),
    ).toBe(74)
  })

  it('parses weight in pounds', () => {
    expect(parseIdentityWeightLbs({ weightLbs: '185' } as never)).toBe(185)
  })

  it('applies morphus height modifiers on top of identity height', () => {
    const resolved = resolveIdentityHeightInches(
      { heightFeet: '6', heightInches: '0' } as never,
      [{ flat: 6 }],
    )
    expect(resolved).toBe(78)
  })

  it('flags invalid height inches with a range message', () => {
    expect(identityHeightInchesError('')).toBeNull()
    expect(identityHeightInchesError('5')).toBeNull()
    expect(identityHeightInchesError('12')).toBe('must be a value from 0–11')
    expect(identityHeightInchesError('abc')).toBe(IDENTITY_WHOLE_NUMBER_ERROR)
  })

  it('sanitizes height inches input to digits clamped 0–11', () => {
    expect(sanitizeIdentityHeightInchesInput('')).toBe('')
    expect(sanitizeIdentityHeightInchesInput('5')).toBe('5')
    expect(sanitizeIdentityHeightInchesInput('11')).toBe('11')
    expect(sanitizeIdentityHeightInchesInput('12')).toBe('11')
    expect(sanitizeIdentityHeightInchesInput('99')).toBe('11')
    expect(sanitizeIdentityHeightInchesInput('a3b')).toBe('3')
  })

  it('flags invalid height feet and weight as whole numbers', () => {
    expect(identityHeightFeetError('6')).toBeNull()
    expect(identityHeightFeetError('6.5')).toBe(IDENTITY_WHOLE_NUMBER_ERROR)
    expect(identityWeightLbsError('185')).toBeNull()
    expect(identityWeightLbsError('185.5')).toBe(IDENTITY_WHOLE_NUMBER_ERROR)
    expect(parseIdentityWeightLbs({ weightLbs: '185.5' } as never)).toBeUndefined()
  })

  it('requires numeric height, weight, and text identity fields to spawn', () => {
    expect(isCharacterNameFilled('')).toBe(false)
    expect(isCharacterNameFilled('New Character')).toBe(false)
    expect(isCharacterNameFilled('Rook')).toBe(true)
    expect(hasValidIdentityHeight({ heightFeet: '6', heightInches: '2' } as never)).toBe(
      true,
    )
    expect(hasValidIdentityHeight({ heightFeet: '', heightInches: '2' } as never)).toBe(
      false,
    )
    const blockers = assessIdentitySpawnBlockers('Rook', {
      sex: 'M',
      age: '28',
      heightFeet: '6',
      heightInches: '0',
      weightLbs: '185',
      eyes: 'Brown',
      hair: 'Black',
    })
    expect(blockers).toEqual([])
  })

  it('lists spawn-prep checklist items separately from Continue gates', () => {
    const incomplete = listIdentitySpawnPrepRequirements(
      'New Character',
      EMPTY_CHARACTER_IDENTITY_PROFILE,
    )
    expect(incomplete.map((item) => item.id)).toEqual([
      'spawn-name',
      'spawn-sex',
      'spawn-age',
      'spawn-height',
      'spawn-weight',
      'spawn-eyes',
      'spawn-hair',
    ])
    expect(incomplete.every((item) => !item.satisfied)).toBe(true)
    expect(isIdentitySpawnPrepComplete('New Character', undefined)).toBe(false)

    const complete = listIdentitySpawnPrepRequirements('Rook', {
      sex: 'M',
      age: '28',
      heightFeet: '6',
      heightInches: '0',
      weightLbs: '185',
      eyes: 'Brown',
      hair: 'Black',
    })
    expect(complete.every((item) => item.satisfied)).toBe(true)
    expect(
      isIdentitySpawnPrepComplete('Rook', {
        sex: 'M',
        age: '28',
        heightFeet: '6',
        heightInches: '0',
        weightLbs: '185',
        eyes: 'Brown',
        hair: 'Black',
      }),
    ).toBe(true)
  })
})
