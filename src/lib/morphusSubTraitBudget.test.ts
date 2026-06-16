import { describe, expect, it } from 'vitest'
import { getMorphusCharacteristicById } from '../data/library/morphusTableCatalogLoader'
import {
  morphusSubTraitBudgetDiceSpec,
  morphusSubTraitPoolMode,
} from './morphusSubTraitBudget'

describe('morphusSubTraitBudget', () => {
  it('detects gimmick pools on Gadgeteer and Clown Gags', () => {
    const gadgeteer = getMorphusCharacteristicById('super_being_gadgeteer')
    const clownGags = getMorphusCharacteristicById('clown_gags')
    expect(gadgeteer?.subTraitChoicesBudget).toBeDefined()
    expect(clownGags?.subTraitChoicesBudget).toBeDefined()
    expect(morphusSubTraitPoolMode(gadgeteer!, gadgeteer!.subTraitChoicesBudget!)).toBe(
      'gimmick',
    )
    expect(morphusSubTraitPoolMode(clownGags!, clownGags!.subTraitChoicesBudget!)).toBe(
      'gimmick',
    )
  })

  it('derives dice bounds from slotsFormula', () => {
    const spec = morphusSubTraitBudgetDiceSpec({
      slotsFormula: '1D4+2',
      allowedChoicesPool: ['gadget_lock_pick'],
    })
    expect(spec).toEqual({
      notation: '1D4+2',
      min: 3,
      max: 6,
    })
  })
})
