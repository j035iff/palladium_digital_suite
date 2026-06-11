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
