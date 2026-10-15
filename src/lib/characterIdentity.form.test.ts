import { describe, expect, it } from 'vitest'
import {
  listMorphusIdentityFillInCallouts,
  patchIdentityProfileForForm,
  resolveFormIdentityHeight,
  resolveFormIdentityWeight,
  resolveIdentityDisplayProfile,
  resolveIdentityFormFields,
} from './characterIdentity'
import type { MorphusCharacteristic } from '../types'

const facade = {
  sex: 'M',
  age: '28',
  heightFeet: '6',
  heightInches: '0',
  weightLbs: '180',
  eyes: 'Brown',
  hair: 'Black',
  description: 'Facade look',
  personality: 'Quiet',
}

describe('dual-form identity pipeline', () => {
  it('falls back unset Morphus anthropometrics to Facade', () => {
    const profile = { ...facade, morphus: { eyes: 'Gold' } }
    const morphus = resolveIdentityFormFields(profile, 'morphus')
    expect(morphus.eyes).toBe('Gold')
    expect(morphus.hair).toBe('Black')
    expect(morphus.heightFeet).toBe('6')
    expect(resolveIdentityFormFields(profile, 'primary').eyes).toBe('Brown')
  })

  it('keeps Morphus description and personality independent of Facade', () => {
    const profile = {
      ...facade,
      description: 'Facade look',
      personality: 'Quiet',
    }
    const morphusUnset = resolveIdentityFormFields(profile, 'morphus')
    expect(morphusUnset.description).toBe('')
    expect(morphusUnset.personality).toBe('')
    expect(resolveIdentityFormFields(profile, 'primary').description).toBe(
      'Facade look',
    )

    const withMorphusProse = patchIdentityProfileForForm(profile, 'morphus', {
      description: 'Beast form',
      personality: 'Feral',
    })
    expect(withMorphusProse.description).toBe('Facade look')
    expect(withMorphusProse.personality).toBe('Quiet')
    expect(withMorphusProse.morphus?.description).toBe('Beast form')
    expect(withMorphusProse.morphus?.personality).toBe('Feral')
    const morphusView = resolveIdentityFormFields(withMorphusProse, 'morphus')
    expect(morphusView.description).toBe('Beast form')
    expect(morphusView.personality).toBe('Feral')
  })

  it('patches Morphus overlay without touching Facade', () => {
    const next = patchIdentityProfileForForm(facade, 'morphus', {
      hair: 'None',
      heightFeet: '8',
      heightInches: '0',
    })
    expect(next.hair).toBe('Black')
    expect(next.heightFeet).toBe('6')
    expect(next.morphus?.hair).toBe('None')
    expect(next.morphus?.heightFeet).toBe('8')
  })

  it('auto-applies deterministic Morphus height/weight trait mods', () => {
    const traits = [
      {
        id: 't1',
        name: 'Tall One',
        tableCategory: 'fantasy',
        heightModifier: { percent: 10 },
        weightModifier: { flat: 40 },
      },
    ] as MorphusCharacteristic[]
    const height = resolveFormIdentityHeight(facade, 'morphus', traits)
    expect(height.totalInches).toBe(79) // 72 * 1.10 rounded
    expect(height.traitAltered).toBe(true)
    expect(height.needsFillIn).toBe(false)
    const weight = resolveFormIdentityWeight(facade, 'morphus', traits)
    expect(weight.totalLbs).toBe(220)
    expect(resolveFormIdentityHeight(facade, 'primary', traits).totalInches).toBe(
      72,
    )
  })

  it('flags dice height mods as fill-in without blocking / auto-rolling', () => {
    const traits = [
      {
        id: 'dino',
        name: 'Dinosaur',
        tableCategory: 'dinosaur',
        heightModifier: { dice: '1D4 feet' },
      },
    ] as MorphusCharacteristic[]
    const height = resolveFormIdentityHeight(facade, 'morphus', traits)
    expect(height.needsFillIn).toBe(true)
    expect(height.totalInches).toBe(72)
    expect(listMorphusIdentityFillInCallouts(facade, traits)[0]?.axis).toBe(
      'height',
    )
    const filled = patchIdentityProfileForForm(facade, 'morphus', {
      heightFeet: '10',
      heightInches: '0',
    })
    expect(
      resolveFormIdentityHeight(filled, 'morphus', traits).needsFillIn,
    ).toBe(false)
    expect(resolveFormIdentityHeight(filled, 'morphus', traits).totalInches).toBe(
      120,
    )
  })

  it('builds Morphus display profile with trait source metadata', () => {
    const traits = [
      {
        id: 't1',
        name: 'Stone Skin',
        tableCategory: 'mineral',
        weightModifier: { percent: 100 },
      },
    ] as MorphusCharacteristic[]
    const display = resolveIdentityDisplayProfile(facade, 'morphus', traits)
    expect(display.weightLbs).toBe('360')
    expect(display.weightTraitAltered).toBe(true)
    expect(display.weightTraitSources[0]?.traitName).toBe('Stone Skin')
  })
})
