import { DEFENDER_WINS_TIES } from './opposedRollRules'

export type SaveRollBonusLine = {
  label: string
  /** Positive amount added to the d20 roll. */
  amount: number
}

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
