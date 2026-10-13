import { describe, expect, it } from 'vitest'
import { aggregatePhysicalSkillCombatBonuses } from './skillPhysicalBonuses'
import {
  abilityProficiencyAtLevel,
  bundledGrantProvidedByNote,
  duplicateAbilityOverlapNote,
  resolveDuplicateAbilityCopies,
  resolveDuplicateAbilitySeeOther,
  similarSkillGroupPlayerNote,
} from './skillGlobalRules'

describe('Acrobatics and Gymnastics global rules', () => {
  const both = ['skill_acrobatics', 'skill_gymnastics']

  it('adds combat pluses from both skills', () => {
    const agg = aggregatePhysicalSkillCombatBonuses(both)
    expect(agg.combat.rollWithImpact).toBe(4)
  })

  it('keeps the best shared ability and does not sum the copies', () => {
    const backFlip = resolveDuplicateAbilityCopies('Back flip', both, 1)
    expect(backFlip?.copies).toHaveLength(2)
    expect(backFlip?.best.map((copy) => copy.skillId)).toEqual(['skill_gymnastics'])
    expect(backFlip?.best[0]?.proficiency).toBe(70)

    const climbRope = resolveDuplicateAbilityCopies('climb rope', both, 1)
    expect(climbRope?.best.map((copy) => copy.skillId)).toEqual(['skill_acrobatics'])
    expect(climbRope?.best[0]?.proficiency).toBe(80)

    const balance = resolveDuplicateAbilityCopies('Sense of Balance', both, 4)
    expect(balance?.best[0]?.skillId).toBe('skill_acrobatics')
    expect(balance?.best[0]?.proficiency).toBe(abilityProficiencyAtLevel(60, 5, 4))
    const summed =
      (balance?.copies ?? []).reduce((total, copy) => total + copy.proficiency, 0)
    expect(balance?.best[0]?.proficiency).toBeLessThan(summed)
  })

  it('leaves a unique ability and a skill outside the group alone', () => {
    expect(
      resolveDuplicateAbilityCopies('Walk tightrope or high wire', both, 1),
    ).toBeNull()
    expect(
      resolveDuplicateAbilityCopies('Sense of balance', [
        'skill_acrobatics',
        'skill_aerobic_athletics',
      ], 1),
    ).toBeNull()
  })

  it('states that the educational bonus applies once on the best proficiency', () => {
    const note = duplicateAbilityOverlapNote(
      'skill_acrobatics',
      'Back flip',
      both,
      1,
    )
    expect(note).toMatch(/Not added/)
    expect(note).toMatch(/Gymnastics Back flip/)
    expect(note).toMatch(/Educational bonus applies on that one only/)

    const best = duplicateAbilityOverlapNote(
      'skill_gymnastics',
      'Back flip',
      both,
      1,
    )
    expect(best).toMatch(/Educational bonus applies once/)
    expect(similarSkillGroupPlayerNote('skill_acrobatics', ['skill_acrobatics'])).toBeNull()
    expect(similarSkillGroupPlayerNote('skill_gymnastics', both)).toMatch(
      /do not increase with level/,
    )
  })

  it('points losers at See Other parent (mockup)', () => {
    expect(
      resolveDuplicateAbilitySeeOther(
        'skill_acrobatics',
        'Back flip',
        both,
        1,
      ),
    ).toEqual({
      winnerSkillId: 'skill_gymnastics',
      winnerSkillName: 'Gymnastics',
    })
    expect(
      resolveDuplicateAbilitySeeOther(
        'skill_gymnastics',
        'Back flip',
        both,
        1,
      ),
    ).toBeNull()
    expect(
      resolveDuplicateAbilitySeeOther(
        'skill_gymnastics',
        'Climb rope',
        both,
        1,
      ),
    ).toEqual({
      winnerSkillId: 'skill_acrobatics',
      winnerSkillName: 'Acrobatics',
    })
  })

  it('formats provided-by note for bundled Climb/Prowl grants', () => {
    expect(
      bundledGrantProvidedByNote('skill_acrobatics', 'skill_climbing'),
    ).toBe('Provided by Acrobatics: does not increase per level')
    expect(
      bundledGrantProvidedByNote('skill_literacy', 'skill_climbing'),
    ).toBeNull()
  })
})
