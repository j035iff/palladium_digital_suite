import { describe, expect, it } from 'vitest'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { resolveSkillPercent } from './skillPercentResolution'

describe('resolveSkillPercent', () => {
  it('does not apply Facade P.P. trait penalties without Morphus characteristic modifiers', () => {
    const resolved = resolveSkillPercent(
      {
        id: 'skill_pick_locks',
        basePercent: 30,
        perLevel: 5,
        acquisitionLevel: 1,
        occBonus: 0,
      },
      {
        characterLevel: 1,
        iqBonus: 0,
        activeForm: 'morphus',
        primaryPp: 2,
        activeMorphusCharacteristics: [],
      },
      {
        id: 'skill_pick_locks',
        name: 'Pick Locks',
        gameSystems: ['nightbane'],
        categories: ['Espionage'],
        skillTraits: ['requires_light_touch'],
        synergies: [],
        prerequisites: [],
        description: '',
      } as unknown as PalladiumSkillCatalogEntry,
    )

    expect(
      resolved.lines.some((l) => l.label.startsWith('Facade P.P.')),
    ).toBe(false)
  })

  it('applies Morphus characteristic skill_trait modifiers in Morphus form', () => {
    const resolved = resolveSkillPercent(
      {
        id: 'skill_test_light_touch_only',
        basePercent: 30,
        perLevel: 5,
        acquisitionLevel: 1,
        occBonus: 0,
      },
      {
        characterLevel: 1,
        iqBonus: 0,
        activeForm: 'morphus',
        primaryPp: 2,
        activeMorphusCharacteristics: [
          {
            id: 'test_bear',
            name: 'Bear',
            tableCategory: 'characteristics',
            skillModifiers: {
              specificSkillOverrides: [
                {
                  targetType: 'skill_trait',
                  targetValue: 'requires_light_touch',
                  modifierPercent: -15,
                },
              ],
            },
          },
        ],
      },
      {
        id: 'skill_test_light_touch_only',
        name: 'Test Light Touch',
        gameSystems: ['nightbane'],
        categories: ['Espionage'],
        skillTraits: ['requires_light_touch'],
        synergies: [],
        prerequisites: [],
        description: '',
      } as unknown as PalladiumSkillCatalogEntry,
    )

    expect(resolved.lines).toContainEqual({
      label: 'Morphus (this skill)',
      value: -15,
    })
    expect(
      resolved.lines.some((l) => l.label.startsWith('Facade P.P.')),
    ).toBe(false)
  })
})
