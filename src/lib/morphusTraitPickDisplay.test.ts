import { describe, expect, it } from 'vitest'
import { MORPHUS_APPEARANCE_ROUTING_TABLE, MORPHUS_CHARACTERISTICS_ROUTING_TABLE } from '../data/library/morphusForgeRoutingLoader'
import {
  enrichMorphusTraitPickOption,
  formatMorphusSlotPlanRoute,
  morphusTraitPickBonusesPenalties,
  MORPHUS_STAT_MODIFIERS_BY_TYPE_NOTE,
  stripMorphusDescriptionModifierTail,
} from './morphusTraitPickDisplay'

describe('morphusTraitPickDisplay', () => {
  it('formats characteristics routing table routes', () => {
    const alien = MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries.find(
      (e) => e.id === 'alien_creature',
    )!
    expect(formatMorphusSlotPlanRoute(alien.slotPlan)).toBe('Alien Shape OR Extraterrestrial')

    const horror = MORPHUS_CHARACTERISTICS_ROUTING_TABLE.entries.find(
      (e) => e.id === 'horror_show',
    )!
    expect(formatMorphusSlotPlanRoute(horror.slotPlan)).toBe('Nightmare OR Stigmata')

    const inhuman = MORPHUS_APPEARANCE_ROUTING_TABLE.entries.find(
      (e) => e.id === 'inhuman_shape',
    )!
    expect(formatMorphusSlotPlanRoute(inhuman.slotPlan)).toBe(
      '(Stigmata OR Nightmare) + Characteristics',
    )
  })

  it('lists bonuses and penalties for trait rows', () => {
    const demon = morphusTraitPickBonusesPenalties('infernal_demon_claw')
    expect(demon.bonuses.some((line) => line.includes('S.D.C.'))).toBe(true)
    expect(demon.bonuses.some((line) => line.includes('Initiative'))).toBe(true)
    expect(demon.penalties.some((line) => line.includes('P.B.'))).toBe(true)
  })

  it('omits undefined skill penalties for grant-only overrides', () => {
    const bat = morphusTraitPickBonusesPenalties('animal_bat_wings')
    expect(bat.penalties).toEqual([])
    expect(bat.penalties.some((line) => line.includes('undefined'))).toBe(false)
    expect(bat.bonuses.some((line) => line.includes('S.D.C.'))).toBe(true)
    expect(bat.bonuses.some((line) => line.includes('Horror Factor'))).toBe(true)
  })

  it('shows stat modifiers by type note on parent traits with variants', () => {
    const parent = morphusTraitPickBonusesPenalties('animal_arachnid_full')
    expect(parent.bonuses).toEqual([])
    expect(parent.penalties).toEqual([])

    const spider = morphusTraitPickBonusesPenalties('animal_arachnid_full::variant:Spider')
    expect(spider.bonuses.some((line) => line.includes('Bite'))).toBe(true)

    const scorpion = morphusTraitPickBonusesPenalties('animal_arachnid_full::variant:Scorpion')
    expect(scorpion.bonuses.some((line) => line.includes('Pincers'))).toBe(true)
  })

  it('attaches modifier note when enriching variant-parent traits', () => {
    const parent = enrichMorphusTraitPickOption('animal_arachnid_full', {
      id: 'animal_arachnid_full',
      name: 'Full Arachnid',
    })
    expect(parent.modifierNote).toBe(MORPHUS_STAT_MODIFIERS_BY_TYPE_NOTE)
    expect(parent.bonuses).toEqual([])
    expect(parent.penalties).toEqual([])
  })

  it('strips embedded bonus text from descriptions and prefixes bonus values with +', () => {
    const entry = enrichMorphusTraitPickOption('stigmata_body_faces', {
      id: 'stigmata_body_faces',
      name: 'Body Faces',
    })
    expect(entry.description).not.toMatch(/Bonuses:/i)
    expect(entry.description).toMatch(/grappling distance/)
    expect(entry.bonuses).toContain('S.D.C. +4D6')
    expect(entry.bonuses).toContain('Horror Factor +1D6')
    expect(entry.bonuses).toContain('Bite: +1D4')
    expect(entry.penalties).toContain('disguise -20%')

    expect(stripMorphusDescriptionModifierTail('Foo. Bonuses: +1 to P.E.')).toBe('Foo.')
  })
})
