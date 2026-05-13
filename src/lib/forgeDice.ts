/** Single d6, inclusive 1–6. */
export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export function roll3d6(): [number, number, number] {
  return [rollD6(), rollD6(), rollD6()]
}

export function sumDice(d: readonly [number, number, number]): number {
  return d[0] + d[1] + d[2]
}

/** SRS §2: optional +1d6 after 3d6 when the (pre-bonus) total is 16–18. */
export function isBonusDieEligible(baseTotal: number): boolean {
  return baseTotal >= 16 && baseTotal <= 18
}
