import type {
  ActiveForm,
  AccumulatedHandToHandBonuses,
  Character,
  CharacterAttributes,
  FeatureModifiers,
} from '../types'
import { getFormState } from '../types'
import { handToHandAttackBonus } from '../utils/combatCalculator'
import { buildLiveCombatContext, resolveLiveCharacterMaxApm } from './liveStatEngine'

/**
 * PC base attacks per melee plus Hand-to-Hand extra attacks (`stat_engine_spec.md` §4.5).
 * No engine cap — only GM rulings limit total APM after other modifiers are applied.
 */
export function computeMaxApm(
  _attrs: CharacterAttributes,
  _level: number,
  hthAttackBonus = 0,
): number {
  const base = 2
  const hth = Math.max(0, Math.round(hthAttackBonus))
  return base + hth
}

export type AttacksPerMeleeStack = {
  core: number
  skillApm: number
  traitApm: number
  baseApm: number
  total: number
}

/** Full APM stack — mirrors `buildAttacksPerMeleeLine()` in creationLiveLedger.ts. */
export function resolveAttacksPerMelee(
  attrs: CharacterAttributes,
  level: number,
  hthAttackBonus: number,
  skillApm = 0,
  traitApm = 0,
  baseApm = 0,
): AttacksPerMeleeStack {
  const core = computeMaxApm(attrs, level, hthAttackBonus)
  return {
    core,
    skillApm,
    traitApm,
    baseApm,
    total: core + skillApm + traitApm + baseApm,
  }
}

/** Live-play max APM for the active form (skills + traits + Nightbane mBase when Morphus). */
export function resolveCharacterMaxApm(
  character: Character,
  activeForm: ActiveForm,
  supportsDualForm: boolean,
  handToHand: AccumulatedHandToHandBonuses,
  passive: FeatureModifiers,
): number {
  return resolveLiveCharacterMaxApm(
    character,
    activeForm,
    supportsDualForm,
    handToHand,
    passive,
  )
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
