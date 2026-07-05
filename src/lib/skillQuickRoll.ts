import { getIqBonuses } from './attributeBonuses'
import type { ActiveForm, Character } from '../types'
import { resolveLiveSkillRollTarget } from './liveSkillEngine'

/**
 * Quick d100 skill target (vision.md — speed over spectacle): base + level + I.Q. skill bonus.
 */

/** @deprecated Use {@link resolveLiveSkillRollTarget} with character + activeForm. */
export function iqSkillBonusPercent(iq: number): number {
  return getIqBonuses(iq).skillBonus
}

/** Demo: +5% per level after 1st for O.C.C. skills (replace with full skill tables when wired). */
export { occSkillLevelBonusPercent } from './liveSkillEngine'

const DEFAULT_SKILL_BASE = 28

export function computeSkillRollTargetPercent(opts: {
  skillBasePercent?: number
  characterLevel: number
  /** @deprecated Pass character + activeForm for stat-engine I.Q. */
  iq?: number
  character?: Character
  activeForm?: ActiveForm
}): { target: number; base: number; levelBonus: number; iqBonus: number } {
  if (opts.character && opts.activeForm) {
    return resolveLiveSkillRollTarget({
      character: opts.character,
      activeForm: opts.activeForm,
      skillBasePercent: opts.skillBasePercent,
      characterLevel: opts.characterLevel,
    })
  }
  const base = Math.max(
    0,
    Math.round(opts.skillBasePercent ?? DEFAULT_SKILL_BASE),
  )
  const levelBonus = Math.max(0, Math.floor(opts.characterLevel) - 1) * 5
  const iqBonus = iqSkillBonusPercent(opts.iq ?? 10)
  const target = Math.min(98, Math.max(1, base + levelBonus + iqBonus))
  return { target, base, levelBonus, iqBonus }
}
