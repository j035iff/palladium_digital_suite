import type { CharacterAttributes } from '../types'
import { deriveSdcHpMaximums } from './derivedVitality'

/** One-shot Spawn commit payload (vitalityPathUpdate + CharacterContext). */
export type SpawnVitalityRolls = {
  facadeHp: number
  facadeSdc: number
  morphusHp: number
  morphusSdc: number
  ppeMax: number
  morphusIspMax: number
}

/** Roll n dice of s sides (inclusive). */
export function rollNdS(n: number, s: number): number {
  let t = 0
  for (let i = 0; i < n; i++) {
    t += 1 + Math.floor(Math.random() * s)
  }
  return t
}

/**
 * Facade H.P. maximum at Spawn — P.E. anchors the body (attribute_and_stat.md §1, §4).
 * Formula: P.E. + 1d6, floor 4.
 */
export function rollFacadeHpMaximum(pe: number): number {
  return Math.max(4, pe + rollNdS(1, 6))
}

/**
 * Facade S.D.C. maximum — structural baseline from attributes + small variance die
 * (derivedVitality placeholder + convergence roll).
 */
export function rollFacadeSdcMaximum(attrs: CharacterAttributes): number {
  const base = deriveSdcHpMaximums(attrs).sdcMaximum
  return Math.max(4, base + rollNdS(1, 6))
}

/**
 * P.P.E. pool maximum — mental + physical endurance blend (sheet placeholder until RCC tables).
 */
export function rollPpeMaximum(me: number, pe: number): number {
  return Math.max(8, me + pe + rollNdS(2, 6))
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
