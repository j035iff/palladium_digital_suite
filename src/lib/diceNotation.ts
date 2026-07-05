/**
 * Safe dice evaluation (no eval). Supports NdM, NdM*K, NdM+N, NdM-N (case-insensitive).
 */

export function rollNdS(n: number, sides: number): number {
  const count = Math.max(0, Math.floor(n))
  const s = Math.max(1, Math.floor(sides))
  let t = 0
  for (let i = 0; i < count; i++) {
    t += 1 + Math.floor(Math.random() * s)
  }
  return t
}

/** Display form uses `x` (e.g. 1D4x10); roll parser expects `*`. */
export function notationForRoll(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/x(\d+)/gi, '*$1')
}

/** Display form: `1D4*10` / `1D4X10` → `1D4x10`. */
export function normalizeDiceDisplay(notation: string): string {
  return notation
    .trim()
    .toUpperCase()
    .replace(/\*(\d+)/g, 'x$1')
    .replace(/X(\d+)/g, 'x$1')
}

export type PhysicalDiceRollParts = {
  /** Dice-only notation for physical roll entry (excludes trailing flat modifier). */
  diceNotation: string
  /** Flat bonus bundled in the source string — already in pending block baseline. */
  flatBonus: number
}

/**
 * Split Palladium dice strings into physical roll vs flat addend.
 * `1D6x10+20` → roll `1D6*10`, flat `20`; `1D6+2` → roll `1D6`, flat `2`; `-1D6` → roll `-1D6`, flat `0`.
 */
export function parsePhysicalDiceRoll(raw: string): PhysicalDiceRollParts {
  let trimmed = raw.trim().replace(/\s+/g, '')
  if (!trimmed) return { diceNotation: raw, flatBonus: 0 }

  let sign = 1
  if (trimmed.startsWith('-') && /^-\d+d/i.test(trimmed)) {
    sign = -1
    trimmed = trimmed.slice(1)
  }

  const normalized = notationForRoll(trimmed)
  const m = /^(\d+)d(\d+)(?:\*(\d+))?([+-]\d+)?$/i.exec(normalized)
  if (!m) {
    return { diceNotation: raw.trim(), flatBonus: 0 }
  }

  const n = m[1]!
  const faces = m[2]!
  const mul = m[3]
  const add = m[4]

  let diceCore = `${n}d${faces}`
  if (mul != null && mul !== '') {
    diceCore += `*${mul}`
  }

  const flatBonus = add != null && add !== '' ? Number(add) : 0
  const diceNotation = sign === -1 ? `-${diceCore}` : diceCore
  return { diceNotation, flatBonus }
}

/** Sum flat addends extracted from dice strings (e.g. +20 from `1D6x10+20`). */
export function sumDiceNotationFlatBonuses(notations: readonly string[]): number {
  return notations.reduce(
    (sum, notation) => sum + parsePhysicalDiceRoll(notation).flatBonus,
    0,
  )
}

/**
 * Parse and roll a single dice expression like "3D6", "1D4*10", "1D4x10", "2D6+12", "4d6-1".
 * Plain integers (e.g. Nightbane base S.D.C. 30) pass through unchanged.
 */
export function rollDiceNotation(raw: string): number {
  const t = raw.trim()
  if (/^\d+$/.test(t)) {
    const n = Number(t)
    if (!Number.isFinite(n)) throw new Error(`Invalid dice notation: "${raw}"`)
    return n
  }
  const s = notationForRoll(raw)
  const m = /^(\d+)d(\d+)(?:\*(\d+))?([+-]\d+)?$/i.exec(s)
  if (!m) {
    throw new Error(`Invalid dice notation: "${raw}"`)
  }
  const n = Number(m[1])
  const faces = Number(m[2])
  if (!Number.isFinite(n) || !Number.isFinite(faces) || n <= 0 || faces <= 0) {
    throw new Error(`Invalid dice notation: "${raw}"`)
  }
  let total = rollNdS(n, faces)
  if (m[3] != null && m[3] !== '') {
    const mul = Number(m[3])
    if (!Number.isFinite(mul)) throw new Error(`Invalid multiplier in: "${raw}"`)
    total *= mul
  }
  if (m[4] != null && m[4] !== '') {
    const add = Number(m[4])
    if (!Number.isFinite(add)) throw new Error(`Invalid modifier in: "${raw}"`)
    total += add
  }
  return Math.floor(total)
}
