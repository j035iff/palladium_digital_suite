import type { PhysicalStrengthStat } from '../types'

/**
 * Carry capacity by P.S. tier (combat_logic.md §2; Facade baseline P.S.×10 in attribute_and_stat.md §4).
 */
export function computeCarryCapacityLbs(ps: PhysicalStrengthStat): number {
  const mult =
    ps.tier === 'supernatural'
      ? 50
      : ps.tier === 'robotic'
        ? 25
        : ps.tier === 'augmented'
          ? 20
          : 10
  return Math.max(0, ps.score * mult)
}
