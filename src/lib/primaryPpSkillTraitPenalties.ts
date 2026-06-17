/**
 * Optional low-P.P. penalties on dexterity / light-touch skill groups (v0 attributePenalties.ts).
 * Trait ids match `skill_trait_registry.json` (`requires_dexterity`, `requires_light_touch`).
 */

export const SKILL_TRAIT_REQUIRES_DEXTERITY = 'requires_dexterity' as const
export const SKILL_TRAIT_REQUIRES_LIGHT_TOUCH = 'requires_light_touch' as const

export type PpTraitPenaltyTable = Readonly<
  Record<
    typeof SKILL_TRAIT_REQUIRES_DEXTERITY | typeof SKILL_TRAIT_REQUIRES_LIGHT_TOUCH,
    number
  >
>

/** Signed % modifiers by trait when P.P. is below 8 (optional ruleset). */
export function getLowPpTraitPenaltyTable(pp: number): PpTraitPenaltyTable | null {
  if (pp >= 8) return null
  if (pp >= 5) {
    return {
      [SKILL_TRAIT_REQUIRES_DEXTERITY]: -15,
      [SKILL_TRAIT_REQUIRES_LIGHT_TOUCH]: -5,
    }
  }
  if (pp >= 3) {
    return {
      [SKILL_TRAIT_REQUIRES_DEXTERITY]: -25,
      [SKILL_TRAIT_REQUIRES_LIGHT_TOUCH]: -10,
    }
  }
  return {
    [SKILL_TRAIT_REQUIRES_DEXTERITY]: -100,
    [SKILL_TRAIT_REQUIRES_LIGHT_TOUCH]: -20,
  }
}

/** Sum trait penalties for a catalog skill from facade P.P. (stacks both traits when present). */
export function sumPrimaryPpTraitPenaltiesForSkill(
  skillTraits: readonly string[] | undefined,
  primaryPp: number,
): number {
  const table = getLowPpTraitPenaltyTable(primaryPp)
  if (!table || !skillTraits?.length) return 0
  let total = 0
  for (const trait of skillTraits) {
    if (trait in table) {
      total += table[trait as keyof PpTraitPenaltyTable]
    }
  }
  return total
}
