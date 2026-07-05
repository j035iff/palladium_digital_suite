import { describe, expect, it } from 'vitest'
import { sumSkillPercentAttributeModifierPercent } from './skillPercentAttributeModifiers'
import { resolveSkillPercent } from './skillPercentResolution'

describe('sumSkillPercentAttributeModifierPercent', () => {
  const seductionBlock = {
    rules: [
      {
        kind: 'bonusPerPointAbove' as const,
        attribute: 'ma' as const,
        threshold: 20,
        percentPerPoint: 1,
      },
      {
        kind: 'bonusPerPointAbove' as const,
        attribute: 'pb' as const,
        threshold: 17,
        perNPoints: 2,
        perNPointsRounding: 'round_up' as const,
        percentPerPoint: 1,
      },
    ],
  }

  it('rounds P.B. steps up (book example: P.B. 23 + M.A. 24 = +7%)', () => {
    const result = sumSkillPercentAttributeModifierPercent(seductionBlock, {
      ma: 24,
      pb: 23,
    })
    expect(result.total).toBe(7)
  })

  it('rounds partial P.B. steps up (P.B. 18 → +1%, not 0)', () => {
    const result = sumSkillPercentAttributeModifierPercent(seductionBlock, {
      ma: 20,
      pb: 18,
    })
    expect(result.total).toBe(1)
  })

  it('uses floor when round_up is omitted', () => {
    const result = sumSkillPercentAttributeModifierPercent(
      {
        rules: [
          {
            kind: 'bonusPerPointAbove',
            attribute: 'pb',
            threshold: 17,
            perNPoints: 2,
            percentPerPoint: 1,
          },
        ],
      },
      { pb: 18 },
    )
    expect(result.total).toBe(0)
  })
})

describe('resolveSkillPercent attribute modifiers', () => {
  it('stacks seduction M.A./P.B. modifiers on top of generic maPb scaling', () => {
    const resolved = resolveSkillPercent(
      {
        id: 'skill_seduction',
        basePercent: 20,
        perLevel: 3,
        acquisitionLevel: 1,
        occBonus: 0,
        scaledAttBonuses: 0,
      },
      {
        characterLevel: 1,
        iqBonus: 0,
        maPbBonus: 6,
        activeForm: 'primary',
        primaryPp: 10,
        attributeScores: { ma: 24, pb: 23 },
      },
      {
        id: 'skill_seduction',
        name: 'Seduction',
        gameSystems: ['nightbane'],
        categories: ['Rogue'],
        synergies: [],
        prerequisites: [],
        description: 'test',
        skillPercentAttributeModifiers: {
          rules: [
            {
              kind: 'bonusPerPointAbove',
              attribute: 'ma',
              threshold: 20,
              percentPerPoint: 1,
            },
            {
              kind: 'bonusPerPointAbove',
              attribute: 'pb',
              threshold: 17,
              perNPoints: 2,
              perNPointsRounding: 'round_up',
              percentPerPoint: 1,
            },
          ],
        },
      } as unknown as import('../data/library/catalogTypes').PalladiumSkillCatalogEntry,
    )

    expect(resolved.equationPercent).toBe(26)
    expect(resolved.total).toBe(33)
    expect(resolved.lines).toContainEqual({
      label: 'M.A. bonus per M.A. over 20',
      value: 4,
    })
    expect(resolved.lines).toContainEqual({
      label: 'P.B. bonus per 2 P.B. over 17',
      value: 3,
    })
  })
})
