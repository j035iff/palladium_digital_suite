import { describe, expect, it } from 'vitest'
import {
  buildDevExceptionalAttributeState,
  devExceptionalRollForAttribute,
} from './devMakeAttributeExceptional'
import type { RaceAttributeFormulas } from '../../types'
import { createBlankCharacterForGenre } from '../characterRoot'

describe('devMakeAttributeExceptional', () => {
  it('rolls between 17 and 30 for flat 3D6 attributes', () => {
    for (let i = 0; i < 20; i++) {
      const v = devExceptionalRollForAttribute('iq', { iq: '3D6' } as unknown as RaceAttributeFormulas)
      expect(v).toBeGreaterThanOrEqual(17)
      expect(v).toBeLessThanOrEqual(30)
    }
  })

  it('caps exceptional rolls at 18 for flat 2D6 attributes', () => {
    for (let i = 0; i < 20; i++) {
      const v = devExceptionalRollForAttribute('iq', { iq: '2D6' } as unknown as RaceAttributeFormulas)
      expect(v).toBeGreaterThanOrEqual(17)
      expect(v).toBeLessThanOrEqual(18)
    }
  })

  it('assigns an exceptional value to the requested attribute', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const next = buildDevExceptionalAttributeState(character, 'iq', {
      iq: '3D6',
    } as unknown as RaceAttributeFormulas)
    const iq = next.creationAttributeAssignments?.iq
    expect(iq).toBeGreaterThanOrEqual(17)
    expect(iq).toBeLessThanOrEqual(30)
    expect(next.creationAttributePool?.[next.creationAttributePoolSlots?.iq ?? -1]).toBe(
      iq,
    )
  })
})
