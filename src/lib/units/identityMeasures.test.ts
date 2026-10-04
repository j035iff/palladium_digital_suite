import { describe, expect, it } from 'vitest'
import {
  identityHeightFromMetricDisplay,
  identityHeightMetricDisplayError,
  identityHeightMetricUnitLabel,
  identityHeightToDisplay,
  identityWeightDisplayError,
  identityWeightFromDisplay,
  identityWeightToDisplay,
  identityWeightUnitLabel,
} from './identityMeasures'

describe('identityMeasures', () => {
  it('displays and parses weight through preference (lbs persist)', () => {
    expect(identityWeightToDisplay('185', 'standard')).toBe('185')
    expect(identityWeightToDisplay('185', 'metric')).toBe('84.1')
    expect(identityWeightUnitLabel('metric')).toBe('kg')
    expect(identityWeightUnitLabel('standard')).toBe('lbs')

    expect(identityWeightFromDisplay('185', 'standard')).toBe('185')
    expect(identityWeightFromDisplay('84.1', 'metric')).toBe('185')
    expect(identityWeightFromDisplay('', 'metric')).toBe('')
    expect(identityWeightFromDisplay('abc', 'metric')).toBeNull()

    expect(identityWeightDisplayError('185.5', 'standard')).toMatch(/whole/i)
    expect(identityWeightDisplayError('84.1', 'metric')).toBeNull()
    expect(identityWeightDisplayError('x', 'metric')).toMatch(/number/i)
  })

  it('displays and parses character height as whole centimeters (ft/in persist)', () => {
    expect(identityHeightMetricUnitLabel()).toBe('cm')
    expect(identityHeightToDisplay('5', '10', 'standard')).toEqual({
      system: 'standard',
      feet: '5',
      inches: '10',
    })
    expect(identityHeightToDisplay('5', '10', 'metric')).toEqual({
      system: 'metric',
      centimeters: '178',
    })
    expect(identityHeightToDisplay('', '', 'metric')).toEqual({
      system: 'metric',
      centimeters: '',
    })

    expect(identityHeightFromMetricDisplay('178')).toEqual({
      heightFeet: '5',
      heightInches: '10',
    })
    expect(identityHeightFromMetricDisplay('')).toEqual({
      heightFeet: '',
      heightInches: '',
    })
    expect(identityHeightFromMetricDisplay('1.8')).toBeNull()
    expect(identityHeightFromMetricDisplay('nope')).toBeNull()
    expect(identityHeightMetricDisplayError('178')).toBeNull()
    expect(identityHeightMetricDisplayError('1.8')).toMatch(/whole/i)
  })
})
