import type { PhysicalStrengthStat } from '../types'
import { calculateWeightCapacities, resolveStrengthCategory } from '../utils/strengthCalculator'

/**
 * Carry capacity (lbs) — Nightbane RPG pp. 34–35 via {@link calculateWeightCapacities}.
 * @deprecated Prefer {@link evaluateStrengthFromPhysicalStat} for full P.S. mechanics.
 */
export function computeCarryCapacityLbs(ps: PhysicalStrengthStat): number {
  const category = resolveStrengthCategory(ps.score, ps.tier)
  return calculateWeightCapacities(ps.score, category).carryingCapacityLbs
}
