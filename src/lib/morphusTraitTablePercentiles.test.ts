import { describe, expect, it } from 'vitest'
import {
  listMorphusTraitEntriesWithPercentiles,
  resolveMorphusTraitEntryByPercentile,
} from '../data/library/morphusTableCatalogLoader'

describe('morphusTraitTablePercentiles', () => {
  it('alien_shape resolves percentile bands from the book table', () => {
    const rows = listMorphusTraitEntriesWithPercentiles('alien_shape')
    expect(rows).toHaveLength(21)
    expect(rows[0]?.name).toBe('Abnormally Large Sensory Organs')
    expect(rows[0]?.percentile).toEqual({ min: 1, max: 5 })

    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 4)?.id).toBe(
      'alien_shape_abnormally_large_sensory_organs',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 10)?.id).toBe(
      'alien_shape_plant_life',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 10)?.crossTableRoll?.targetTableId).toBe(
      'plant_life',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 20)?.name).toBe(
      'Baggy Flaps of Skin',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 33)?.name).toBe(
      'Cone Head',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 35)?.name).toBe(
      'Crystalline',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 84)?.name).toBe(
      'Slimy, Slug-Like Skin',
    )
    expect(resolveMorphusTraitEntryByPercentile('alien_shape', 98)?.name).toBe(
      'Combination of 2',
    )
    expect(
      resolveMorphusTraitEntryByPercentile('alien_shape', 100)?.id,
    ).toBe('alien_shape_combination_of_two')
  })

  it('multi-roll hub and router tables resolve percentile bands', () => {
    expect(resolveMorphusTraitEntryByPercentile('animal', 5)?.crossTableRoll?.targetTableId).toBe(
      'animal_amphibian',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal', 98)?.name).toBe('Combo of Two')
    expect(resolveMorphusTraitEntryByPercentile('animal', 100)?.name).toBe('Combo of Three')

    expect(resolveMorphusTraitEntryByPercentile('disproportion', 15)?.name).toBe('Head')
    expect(
      resolveMorphusTraitEntryByPercentile('disproportion', 100)?.tableWorkflow?.stepOneRollCount,
    ).toBe(2)

    expect(resolveMorphusTraitEntryByPercentile('stigmata', 5)?.crossTableRoll?.targetTableId).toBe(
      'biomechanical',
    )
    expect(resolveMorphusTraitEntryByPercentile('stigmata', 100)?.name).toBe('Combination of 2')

    expect(
      resolveMorphusTraitEntryByPercentile('unearthly_beauty', 93)?.subTraitChoicesBudget?.slotsAvailable,
    ).toBe(2)
    expect(resolveMorphusTraitEntryByPercentile('unearthly_beauty', 100)?.name).toBe(
      'Combination of Three or Other',
    )

    expect(
      resolveMorphusTraitEntryByPercentile('unusual_facial_features', 10)?.crossTableRoll?.targetTableId,
    ).toBe('biomechanical')
    expect(resolveMorphusTraitEntryByPercentile('unusual_facial_features', 97)?.name).toBe(
      'Combination of 2',
    )
    expect(resolveMorphusTraitEntryByPercentile('unusual_facial_features', 100)?.name).toBe(
      'Combination of 3',
    )
  })

  it('ancient_warrior resolves percentile bands from the book table', () => {
    const rows = listMorphusTraitEntriesWithPercentiles('ancient_warrior')
    expect(rows).toHaveLength(8)
    expect(rows[0]?.name).toBe('Archer')
    expect(rows[0]?.percentile).toEqual({ min: 1, max: 15 })

    expect(resolveMorphusTraitEntryByPercentile('ancient_warrior', 1)?.id).toBe(
      'ancient_warrior_archer',
    )
    expect(resolveMorphusTraitEntryByPercentile('ancient_warrior', 28)?.name).toBe(
      'Assassin',
    )
    expect(resolveMorphusTraitEntryByPercentile('ancient_warrior', 72)?.name).toBe(
      'Ancient Infantry/Foot Soldier',
    )
    expect(
      resolveMorphusTraitEntryByPercentile('ancient_warrior', 100)?.name,
    ).toBe('War-Chief/Warlord')
  })

  it('angelic resolves percentile bands from the book table', () => {
    const rows = listMorphusTraitEntriesWithPercentiles('angelic')
    expect(rows).toHaveLength(11)
    expect(rows[0]?.name).toBe('Angelic Wings')
    expect(rows[0]?.percentile).toEqual({ min: 1, max: 10 })

    expect(resolveMorphusTraitEntryByPercentile('angelic', 5)?.id).toBe(
      'angelic_angelic_wings',
    )
    expect(resolveMorphusTraitEntryByPercentile('angelic', 15)?.name).toBe(
      'Halo of Power',
    )
    expect(resolveMorphusTraitEntryByPercentile('angelic', 35)?.name).toBe(
      'Icon of the Faith',
    )
    expect(resolveMorphusTraitEntryByPercentile('angelic', 95)?.name).toBe(
      'Noble Bearing',
    )
  })

  it('animal sub-tables resolve percentile bands', () => {
    expect(resolveMorphusTraitEntryByPercentile('animal_canine', 5)?.name).toBe(
      'Canine Centauroid',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_bat', 50)?.name).toBe(
      'Full Bat',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_avian', 100)?.name).toBe(
      'Winged Human',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_amphibian', 40)?.id).toBe(
      'animal_amphibian_humanoid',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_amphibian', 60)?.id).toBe(
      'animal_amphibian_full',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_crustacean', 75)?.name).toBe(
      'Lobster Claws',
    )
    expect(listMorphusTraitEntriesWithPercentiles('animal_arachnid')).toHaveLength(5)
    expect(resolveMorphusTraitEntryByPercentile('dinosaur', 5)?.name).toBe(
      'Ankylosaur Humanoid',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_feline', 100)?.name).toBe(
      'Were-Cat',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_fish', 45)?.name).toBe(
      'Full Fish Form',
    )
    expect(listMorphusTraitEntriesWithPercentiles('animal_octopus_squid')).toHaveLength(5)
    expect(resolveMorphusTraitEntryByPercentile('animal_primate', 99)?.name).toBe(
      'Sharp Teeth',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_snake', 90)?.name).toBe(
      "Snake's Head",
    )
    expect(listMorphusTraitEntriesWithPercentiles('animal_reptilian')).toHaveLength(5)
    expect(resolveMorphusTraitEntryByPercentile('animal_insectoid', 3)?.name).toBe(
      'Bioluminescence',
    )
    expect(resolveMorphusTraitEntryByPercentile('animal_insectoid', 100)?.name).toBe(
      'Were-Insect',
    )
    expect(listMorphusTraitEntriesWithPercentiles('animal_insectoid')).toHaveLength(17)
    expect(resolveMorphusTraitEntryByPercentile('fantasy', 25)?.name).toBe(
      'Dragon Lord',
    )
    expect(resolveMorphusTraitEntryByPercentile('biomechanical', 100)?.name).toBe(
      'Wheels or Treads',
    )
    expect(resolveMorphusTraitEntryByPercentile('extraterrestrial', 30)?.name).toBe(
      'B-Movie Alien',
    )
    expect(listMorphusTraitEntriesWithPercentiles('clown_jester')).toHaveLength(10)
    expect(resolveMorphusTraitEntryByPercentile('infernal', 5)?.name).toBe(
      'Burning Soul of Hell',
    )
    expect(resolveMorphusTraitEntryByPercentile('mineral', 96)?.name).toBe('Uraninite')
    expect(resolveMorphusTraitEntryByPercentile('super_being', 100)?.name).toBe(
      'Theme Music',
    )
    expect(listMorphusTraitEntriesWithPercentiles('plant_life')).toHaveLength(17)
    expect(resolveMorphusTraitEntryByPercentile('sci-fi', 3)?.name).toBe(
      'Bug-Eyed Monster',
    )
    expect(listMorphusTraitEntriesWithPercentiles('sci-fi')).toHaveLength(11)
    expect(resolveMorphusTraitEntryByPercentile('undead', 15)?.name).toBe(
      'Nosferatu Vampire',
    )
    expect(resolveMorphusTraitEntryByPercentile('unnatural_limbs', 94)?.name).toBe(
      'Tentacles',
    )
    expect(resolveMorphusTraitEntryByPercentile('victim', 100)?.name).toBe(
      'Horribly Burned',
    )
    expect(resolveMorphusTraitEntryByPercentile('disproportion_head', 5)?.name).toBe(
      'Huge Ears',
    )
    expect(resolveMorphusTraitEntryByPercentile('disproportion_torso', 50)?.name).toBe(
      'Muscular',
    )
    expect(listMorphusTraitEntriesWithPercentiles('disproportion_legs_feet')).toHaveLength(5)
  })

  it('artisan, gear head, hobbyist, modern soldier, nightmare, and occupation resolve percentile bands', () => {
    expect(resolveMorphusTraitEntryByPercentile('artisan', 3)?.name).toBe('Bellows Lungs')
    expect(resolveMorphusTraitEntryByPercentile('artisan', 100)?.customTraitResolution?.kind).toBe(
      'player_gm_authored',
    )

    expect(resolveMorphusTraitEntryByPercentile('gear_head', 50)?.name).toBe('Hydraulics')
    expect(listMorphusTraitEntriesWithPercentiles('gear_head')).toHaveLength(11)

    expect(resolveMorphusTraitEntryByPercentile('hobbyist', 90)?.name).toBe('Other')
    expect(resolveMorphusTraitEntryByPercentile('hobbyist', 90)?.crossTableRoll).toBeDefined()

    expect(resolveMorphusTraitEntryByPercentile('modern_soldier', 95)?.crossTableRoll?.targetTableId).toBe(
      'biomechanical',
    )
    expect(resolveMorphusTraitEntryByPercentile('modern_soldier', 5)?.name).toBe('Body Armor')

    expect(resolveMorphusTraitEntryByPercentile('nightmare', 75)?.name).toBe('Straight-Jacket')
    expect(resolveMorphusTraitEntryByPercentile('occupation', 93)?.id).toBe(
      'morphus_occupation_other',
    )
    expect(listMorphusTraitEntriesWithPercentiles('occupation')).toHaveLength(11)

    expect(resolveMorphusTraitEntryByPercentile('mythical_creature', 5)?.name).toBe(
      'Bigfoot/Wendigo/Yeti',
    )
    expect(resolveMorphusTraitEntryByPercentile('mythical_creature', 15)?.name).toBe(
      'Cyclops/Giant',
    )
    expect(listMorphusTraitEntriesWithPercentiles('mythical_creature')).toHaveLength(10)
    expect(resolveMorphusTraitEntryByPercentile('mythical_creature', 100)?.id).toBe(
      'mythical_creature_other',
    )
  })
})
