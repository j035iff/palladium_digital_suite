import { describe, expect, it } from 'vitest'
import {
  appendCreationSkillPickWithConditionalGrants,
  removeCreationSkillPickFromTiers,
  removeCreationSkillPickWithConditionalCascade,
  replaceConditionalGrantWithPaidPick,
  resolveConditionalRelatedSynergyLines,
  resolveGrantPerLevel,
  resolvePickBasePercentAtLevel,
} from './conditionalRelatedSkills'
import {
  buildCreationSkillPick,
  creationSkillPickSlotWeight,
  isCreationSkillFullySelected,
  isCreationSkillIdentityTaken,
} from './creationSkillPicks'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import { resolveActiveSynergyBonusLines } from './skillCreationDisplay'

describe('appendCreationSkillPickWithConditionalGrants', () => {
  it('grants missing climbing when acrobatics is added to related', () => {
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const prowl = buildCreationSkillPick('skill_prowl', {})
    const before = new Set(['skill_prowl'])

    const next = appendCreationSkillPickWithConditionalGrants(
      acrobatics,
      'related',
      before,
      [prowl],
      [],
    )

    expect(next.related.map((p) => p.skillId)).toEqual([
      'skill_prowl',
      'skill_acrobatics',
      'skill_climbing',
    ])
    const climbing = next.related.find((p) => p.skillId === 'skill_climbing')
    expect(climbing?.grantedBySkillId).toBe('skill_acrobatics')
    expect(climbing?.conditionalGrantStartingPercent).toBe(40)
    expect(creationSkillPickSlotWeight(climbing!)).toBe(0)
  })

  it('does not grant prowl when already selected', () => {
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const prowl = buildCreationSkillPick('skill_prowl', {})
    const before = new Set(['skill_prowl'])

    const next = appendCreationSkillPickWithConditionalGrants(
      acrobatics,
      'related',
      before,
      [prowl],
      [],
    )

    expect(next.related.some((p) => p.skillId === 'skill_prowl' && p.grantedBySkillId)).toBe(
      false,
    )
    expect(next.related.filter((p) => p.skillId === 'skill_prowl')).toHaveLength(1)
  })
})

describe('resolveConditionalRelatedSynergyLines', () => {
  it('adds acrobatics bonus to existing prowl', () => {
    const prowl = buildCreationSkillPick('skill_prowl', {})
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const selected = new Set(['skill_prowl', 'skill_acrobatics'])
    const lines = resolveConditionalRelatedSynergyLines(
      'skill_prowl',
      selected,
      [prowl, acrobatics],
      prowl,
    )
    expect(lines).toEqual([{ label: 'Acrobatics', value: 5 }])
  })

  it('skips bonus on granted climbing', () => {
    const climbing = {
      ...buildCreationSkillPick('skill_climbing', {}),
      grantedBySkillId: 'skill_acrobatics',
      conditionalGrantStartingPercent: 40,
    }
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const selected = new Set(['skill_climbing', 'skill_acrobatics'])
    const lines = resolveConditionalRelatedSynergyLines(
      'skill_climbing',
      selected,
      [climbing, acrobatics],
      climbing,
    )
    expect(lines).toEqual([])
  })
})

describe('resolvePickBasePercentAtLevel', () => {
  it('uses grant starting percent instead of book base', () => {
    const def = getEngineSkillDefFromCatalog('skill_climbing')!
    const pick = {
      ...buildCreationSkillPick('skill_climbing', {}),
      grantedBySkillId: 'skill_acrobatics',
      conditionalGrantStartingPercent: 40,
    }
    expect(resolvePickBasePercentAtLevel(def, pick, 1)).toBe(40)
    expect(resolvePickBasePercentAtLevel(def, pick, 4)).toBe(40)
    expect(resolveGrantPerLevel('skill_acrobatics', 'skill_climbing', def.perLevel)).toBe(0)
    expect(resolvePickBasePercentAtLevel(def, undefined, 1)).toBe(def.basePercent)
  })
})

describe('Acrobatics and Gymnastics bundled Prowl and Climb', () => {
  it('keeps the higher Climb grant and does not add the two starting percents', () => {
    const gymnastics = buildCreationSkillPick('skill_gymnastics', {})
    const afterGym = appendCreationSkillPickWithConditionalGrants(
      gymnastics,
      'related',
      new Set(),
      [],
      [],
    )
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const selected = new Set(afterGym.related.map((pick) => pick.skillId))
    const afterBoth = appendCreationSkillPickWithConditionalGrants(
      acrobatics,
      'related',
      selected,
      afterGym.related,
      [],
    )
    const climbs = afterBoth.related.filter((pick) => pick.skillId === 'skill_climbing')
    expect(climbs).toHaveLength(1)
    expect(climbs[0]?.conditionalGrantStartingPercent).toBe(40)
    expect(climbs[0]?.grantedBySkillId).toBe('skill_acrobatics')
    const prowls = afterBoth.related.filter((pick) => pick.skillId === 'skill_prowl')
    expect(prowls).toHaveLength(1)
    expect(prowls[0]?.conditionalGrantStartingPercent).toBe(30)
  })

  it('restores the remaining skill grant when the better source is removed', () => {
    const gymnastics = buildCreationSkillPick('skill_gymnastics', {})
    const afterGym = appendCreationSkillPickWithConditionalGrants(
      gymnastics,
      'secondary',
      new Set(),
      [],
      [],
    )
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const afterBoth = appendCreationSkillPickWithConditionalGrants(
      acrobatics,
      'related',
      new Set(afterGym.secondary.map((pick) => pick.skillId)),
      [],
      afterGym.secondary,
    )
    const next = removeCreationSkillPickFromTiers(
      afterBoth.related,
      afterBoth.secondary,
      acrobatics.instanceId,
    )
    const climb = [...next.related, ...next.secondary].find(
      (pick) => pick.skillId === 'skill_climbing',
    )
    expect(climb?.grantedBySkillId).toBe('skill_gymnastics')
    expect(climb?.conditionalGrantStartingPercent).toBe(25)
  })

  it('adds both skill bonuses once Climbing is selected, without a second educational bonus', () => {
    const climbing = buildCreationSkillPick('skill_climbing', {})
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const gymnastics = buildCreationSkillPick('skill_gymnastics', {})
    const lines = resolveConditionalRelatedSynergyLines(
      'skill_climbing',
      new Set(['skill_climbing', 'skill_acrobatics', 'skill_gymnastics']),
      [climbing, acrobatics, gymnastics],
      climbing,
    )
    expect(lines.map((line) => line.value).sort((a, b) => a - b)).toEqual([7, 15])
  })
})

describe('replaceConditionalGrantWithPaidPick', () => {
  it('replaces a grant with a paid pick on the chosen tier', () => {
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const grantProwl = {
      ...buildCreationSkillPick('skill_prowl', {}),
      grantedBySkillId: 'skill_acrobatics',
      conditionalGrantStartingPercent: 30,
    }
    const paidProwl = buildCreationSkillPick('skill_prowl', {})

    const next = replaceConditionalGrantWithPaidPick(
      paidProwl,
      'secondary',
      [acrobatics, grantProwl],
      [],
    )

    expect(next.related.map((p) => p.skillId)).toEqual(['skill_acrobatics'])
    expect(next.secondary).toEqual([paidProwl])
    expect(next.secondary[0].grantedBySkillId).toBeUndefined()
  })

  it('applies synergy after replacing grant with paid pick', () => {
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const grantProwl = {
      ...buildCreationSkillPick('skill_prowl', {}),
      grantedBySkillId: 'skill_acrobatics',
      conditionalGrantStartingPercent: 30,
    }
    const paidProwl = buildCreationSkillPick('skill_prowl', {})
    const next = replaceConditionalGrantWithPaidPick(
      paidProwl,
      'related',
      [acrobatics, grantProwl],
      [],
    )
    const def = getEngineSkillDefFromCatalog('skill_prowl')!
    const lines = resolveActiveSynergyBonusLines(
      def,
      new Set(['skill_prowl', 'skill_acrobatics']),
      next.related,
      paidProwl,
    )
    expect(lines.some((l) => l.label === 'Acrobatics' && l.value === 5)).toBe(true)
  })
})

describe('isCreationSkillIdentityTaken with grants', () => {
  it('treats grant-only picks as not blocking a real selection', () => {
    const grant = {
      ...buildCreationSkillPick('skill_prowl', {}),
      grantedBySkillId: 'skill_acrobatics',
    }
    expect(isCreationSkillIdentityTaken([grant], 'skill_prowl')).toBe(false)
  })

  it('treats grant-only picks as not fully selected in the library', () => {
    const grant = {
      ...buildCreationSkillPick('skill_prowl', {}),
      grantedBySkillId: 'skill_acrobatics',
    }
    expect(isCreationSkillFullySelected('skill_prowl', [], [grant], [])).toBe(false)
  })
})

describe('removeCreationSkillPickWithConditionalCascade', () => {
  it('removes grants when source skill is removed', () => {
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const climbing = {
      ...buildCreationSkillPick('skill_climbing', {}),
      grantedBySkillId: 'skill_acrobatics',
    }
    const next = removeCreationSkillPickWithConditionalCascade(
      [acrobatics, climbing],
      acrobatics.instanceId,
    )
    expect(next).toEqual([])
  })
})

describe('resolveActiveSynergyBonusLines integration', () => {
  it('includes conditional related synergy in active lines', () => {
    const def = getEngineSkillDefFromCatalog('skill_prowl')!
    const prowl = buildCreationSkillPick('skill_prowl', {})
    const acrobatics = buildCreationSkillPick('skill_acrobatics', {})
    const lines = resolveActiveSynergyBonusLines(
      def,
      new Set(['skill_prowl', 'skill_acrobatics']),
      [prowl, acrobatics],
      prowl,
    )
    expect(lines.some((l) => l.label === 'Acrobatics' && l.value === 5)).toBe(true)
  })
})
