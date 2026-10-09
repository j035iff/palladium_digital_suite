import { DEFENDER_WINS_TIES } from './opposedRollRules'

export type SaveRollBonusLine = {
  label: string
  /** Positive amount added to the d20 roll. */
  amount: number
}

/** Primary value on a Bonuses / Saving Throws overlay card. */
export type OverlayCardPrimary =
  | { kind: 'empty' }
  | { kind: 'signed'; amount: number }
  | { kind: 'signedPercent'; amount: number }
  | { kind: 'chancePercent'; amount: number }
  | { kind: 'special'; text: string }

/** GM-called save target (e.g. “save vs magic 12”). */
export function formatSaveVsTarget(baseTarget: number): string {
  return `vs ${baseTarget}`
}

/** Total bonus added to the player’s d20 roll. */
export function formatSaveRollBonus(totalBonus: number): string {
  if (totalBonus === 0) return '+0 to roll'
  return `+${totalBonus} to roll`
}

export function formatAdditiveSaveTooltip(
  baseTarget: number,
  bonuses: readonly SaveRollBonusLine[],
  totalBonus: number,
): string {
  const parts = [
    `[Save vs ${baseTarget}]`,
    `d20 ${formatSaveRollBonus(totalBonus)}`,
    `Success when total ≥ ${baseTarget}${DEFENDER_WINS_TIES ? ' (you win ties)' : ''}`,
  ]
  for (const b of bonuses) {
    if (b.amount !== 0) parts.push(`+ [${b.label}: ${b.amount}]`)
  }
  return parts.join(' ')
}

/** Mock-style signed bonus (`+2`, `−1`); callers treat `0` as empty dash separately. */
export function formatOverlaySigned(amount: number): string {
  if (amount > 0) return `+${amount}`
  return `${amount}`
}

/** Signed percent bonus (`+8%`). */
export function formatOverlaySignedPercent(amount: number): string {
  if (amount > 0) return `+${amount}%`
  if (amount < 0) return `${amount}%`
  return '0%'
}

/** Absolute percent chance (Trust / Charm) — `45%`. */
export function formatOverlayChancePercent(amount: number): string {
  return `${amount}%`
}

export function formatOverlaySpecial(text: string): OverlayCardPrimary {
  return { kind: 'special', text }
}

/** Tone for overlay primary values (green / red / black / special green). */
export function overlayPrimaryTone(
  primary: OverlayCardPrimary,
): 'positive' | 'negative' | 'neutral' | 'special' {
  switch (primary.kind) {
    case 'empty':
      return 'neutral'
    case 'special':
      return 'special'
    case 'signed':
    case 'signedPercent':
    case 'chancePercent':
      if (primary.amount < 0) return 'negative'
      if (primary.amount > 0) return 'positive'
      return 'neutral'
  }
}
