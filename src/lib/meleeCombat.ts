import type { CharacterAttributes } from '../types'

/**
 * Attacks Per Melee ceiling (combat_logic.md §3).
 * `hthAttackBonus` — extra attacks from accumulated Hand-to-Hand progression.
 */
export function computeMaxApm(
  attrs: CharacterAttributes,
  level: number,
  hthAttackBonus = 0,
): number {
  const spd = attrs.spd
  const pp = attrs.pp
  const base = 2 + Math.floor((spd + pp) / 18)
  const levelBump = Math.min(3, Math.floor(level / 4))
  const hth = Math.max(0, Math.round(hthAttackBonus))
  return Math.min(12, Math.max(2, base + levelBump + hth))
}

export type ScaledDamageResult = {
  /** Positive number to subtract from the pool. */
  applied: number
  blocked: boolean
  note?: string
}

/**
 * combat_logic.md §1 — M.D. vs S.D.C. (×100 to H.P.), S.D.C. vs M.D.C. (blocked unless Anti-M.D.C.).
 */
export function resolveScaledDamageForPool(
  rawAmount: number,
  opts: { tagAsMd: boolean; targetIsMdc: boolean },
): ScaledDamageResult {
  const n = Math.max(0, Math.round(rawAmount))
  if (n === 0) return { applied: 0, blocked: false }

  if (!opts.tagAsMd && opts.targetIsMdc) {
    return {
      applied: 0,
      blocked: true,
      note:
        'S.D.C. damage cannot harm M.D.C. armor (Anti-M.D.C. tag required; combat_logic.md §1).',
    }
  }

  if (opts.tagAsMd && !opts.targetIsMdc) {
    return {
      applied: n * 100,
      blocked: false,
      note: 'Mega-Damage vs S.D.C. target: ×100 applied to H.P. (combat_logic.md §1).',
    }
  }

  return { applied: n, blocked: false }
}
