import type { CharacterAttributes } from '../types'
import type { PalladiumOcc } from '../types'
import type { Race } from '../types'
import { rollRaceHpMaximum, rollRaceStartingPpe, getRacePpeNotation } from './raceEngine'
import { deriveSdcHpMaximums } from './derivedVitality'
import { rollNdS, rollDiceNotation } from './diceNotation'
import { calculateBaseSdc } from '../utils/vitalsCalculator'

/** One-shot Spawn commit payload (vitalityPathUpdate + CharacterContext). */
export type SpawnVitalityRolls = {
  facadeHp: number
  facadeSdc: number
  morphusHp: number
  morphusSdc: number
  ppeMax: number
  morphusIspMax: number
}

/**
 * Facade H.P. maximum at Spawn — P.E. anchors the body (attribute_and_stat.md §1, §4).
 * Formula: P.E. + 1d6, floor 4.
 */
export function rollFacadeHpMaximum(pe: number, race?: Race): number {
  return rollRaceHpMaximum(pe, race?.vitals?.hpFormula)
}

/**
 * Facade S.D.C. maximum — race vitals + O.C.C. tags when defined; otherwise derived baseline + 1d6.
 */
export function rollFacadeSdcMaximum(
  attrs: CharacterAttributes,
  opts?: { race?: Race; occ?: PalladiumOcc },
): number {
  if (opts?.race?.vitals?.sdc != null) {
    const formula = calculateBaseSdc(opts.race, opts.occ)
    return Math.max(4, rollDiceNotation(formula))
  }
  const base = deriveSdcHpMaximums(attrs).sdcMaximum
  return Math.max(4, base + rollNdS(1, 6))
}

/**
 * P.P.E. pool maximum — mental + physical endurance blend (sheet placeholder until RCC tables).
 */
export function rollPpeMaximum(me: number, pe: number, race?: Race): number {
  return rollRaceStartingPpe(me, pe, getRacePpeNotation(race))
}

/**
 * I.S.P. pool maximum — psychic_gate.md §3: M.E. + one die.
 */
export function rollIspMaximum(me: number): number {
  return Math.max(0, me + rollNdS(1, 6))
}

/**
 * Morphus H.P. (M.D.C. track) — high P.E. body + swing dice for Nightbane morphus convergence.
 */
export function rollMorphusHpMaximum(pe: number): number {
  return Math.max(10, pe * 3 + rollNdS(2, 6) * 4)
}

/**
 * Morphus structural pool (M.D.C.) — scales with P.E. + P.S. + dice.
 */
export function rollMorphusSdcMaximum(pe: number, ps: number): number {
  return Math.max(20, pe * 4 + ps * 2 + rollNdS(2, 6) * 8)
}
