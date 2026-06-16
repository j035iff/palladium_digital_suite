/**
 * Nightbane R.C.C. — The Becoming form-shift save (Nightbane RPG).
 * M.E. save 12+; +1 at 1st level and +1 per two levels thereafter.
 * Success: shift in one melee action (~3 seconds). Failure: one full melee round.
 */

export const BECOMING_SAVE_BASE_TARGET = 12

/** Progression bonus from level only (excludes M.E. attribute bonus). */
export function nightbaneBecomingLevelBonus(characterLevel: number): number {
  const level = Math.max(1, Math.floor(characterLevel))
  return 1 + Math.floor((level - 1) / 2)
}
