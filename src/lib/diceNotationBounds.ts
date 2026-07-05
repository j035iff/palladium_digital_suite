import { notationForRoll, parsePhysicalDiceRoll } from './diceNotation'

/** Min/max totals for Palladium dice strings (NdM, NdM*K, NdM+N, NdMxK, -NdM). */

/** Exceptional human attribute ceiling on flat 3D6 pool rolls. */
export const EXCEPTIONAL_3D6_POOL_MAX = 30

/** Exceptional human attribute ceiling on flat 2D6 pool rolls. */
export const EXCEPTIONAL_2D6_POOL_MAX = 18

export function isDiceNotation(raw: string): boolean {
  return /^\d+d\d+/i.test(raw.trim())
}

/** Flat Nd6 only — no multipliers or flat modifiers. */
function flatNd6Counts(raw: string): { dice: number; faces: number } | null {
  const s = raw.trim().replace(/\s+/g, '')
  const m = /^(\d+)d(\d+)$/i.exec(s)
  if (!m) return null
  const dice = Number(m[1])
  const faces = Number(m[2])
  if (!Number.isFinite(dice) || !Number.isFinite(faces) || dice <= 0 || faces <= 0) {
    return null
  }
  return { dice, faces }
}

/** Bounds for the dice portion only — excludes trailing flat modifiers (Review physical rolls). */
export function diceCoreBounds(raw: string): { min: number; max: number } {
  const { diceNotation } = parsePhysicalDiceRoll(raw)
  let s = diceNotation.trim().replace(/\s+/g, '')
  let negated = false
  if (s.startsWith('-')) {
    negated = true
    s = s.slice(1)
  }
  s = notationForRoll(s)
  const m = /^(\d+)d(\d+)(?:\*(\d+))?$/i.exec(s)
  if (!m) {
    return { min: 0, max: 999 }
  }
  const n = Number(m[1])
  const faces = Number(m[2])
  const mul = m[3] != null && m[3] !== '' ? Number(m[3]) : 1
  if (!Number.isFinite(n) || !Number.isFinite(faces) || n <= 0 || faces <= 0) {
    return { min: 0, max: 999 }
  }
  const minRoll = n * 1 * mul
  const maxRoll = n * faces * mul
  if (negated) {
    return { min: -maxRoll, max: -minRoll }
  }
  return { min: minRoll, max: maxRoll }
}

export function diceNotationBounds(raw: string): { min: number; max: number } {
  const { diceNotation, flatBonus } = parsePhysicalDiceRoll(raw)
  const core = diceCoreBounds(diceNotation)
  if (flatBonus === 0) return core
  return {
    min: core.min + flatBonus,
    max: core.max + flatBonus,
  }
}

/**
 * Valid range for a race attribute pool roll (physical dice entry).
 * Only flat 2D6 (max 18) and 3D6 (max 30) allow exceptional totals.
 */
export function attributePoolNotationBounds(raw: string): { min: number; max: number } {
  const base = diceNotationBounds(raw)
  const flat = flatNd6Counts(raw)
  if (flat?.faces === 6 && flat.dice === 3) {
    return { min: base.min, max: EXCEPTIONAL_3D6_POOL_MAX }
  }
  if (flat?.faces === 6 && flat.dice === 2) {
    return { min: base.min, max: EXCEPTIONAL_2D6_POOL_MAX }
  }
  return base
}

/** Bounds for a single die roll (e.g. 1D6 → 1..6). */
export function singleDieBounds(notation: string): { min: number; max: number } {
  const s = notation.trim().toUpperCase()
  const m = /^(\d+)D(\d+)$/.exec(s)
  if (!m) return { min: 1, max: 6 }
  const n = Number(m[1])
  const faces = Number(m[2])
  if (n !== 1 || !Number.isFinite(faces) || faces <= 0) {
    return diceNotationBounds(notation)
  }
  return { min: 1, max: faces }
}
