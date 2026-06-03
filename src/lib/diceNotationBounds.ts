/** Min/max totals for Palladium dice strings (NdM, NdM*K, NdM+N). */

export function isDiceNotation(raw: string): boolean {
  return /^\d+d\d+/i.test(raw.trim())
}

export function diceNotationBounds(raw: string): { min: number; max: number } {
  const s = raw.trim().replace(/\s+/g, '')
  const m = /^(\d+)d(\d+)(?:\*(\d+))?([+-]\d+)?$/i.exec(s)
  if (!m) {
    return { min: 0, max: 999 }
  }
  const n = Number(m[1])
  const faces = Number(m[2])
  const mul = m[3] != null && m[3] !== '' ? Number(m[3]) : 1
  const add = m[4] != null && m[4] !== '' ? Number(m[4]) : 0
  if (
    !Number.isFinite(n) ||
    !Number.isFinite(faces) ||
    n <= 0 ||
    faces <= 0
  ) {
    return { min: 0, max: 999 }
  }
  const minRoll = n * 1 * mul + add
  const maxRoll = n * faces * mul + add
  return {
    min: Math.min(minRoll, maxRoll),
    max: Math.max(minRoll, maxRoll),
  }
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
