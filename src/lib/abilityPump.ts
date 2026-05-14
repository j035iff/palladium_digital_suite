/**
 * Variable pump caps (sn_abilities_selection.md §3).
 * Max_Pump = Cap_Per_Level × Character_Level.
 */
export function maxPumpBudget(
  characterLevel: number,
  capPerLevel: number,
): number {
  return Math.max(0, characterLevel * capPerLevel)
}

/** e.g. 1d6 per 2 P.P.E. → dice = floor(spend / energyPerDice). */
export function diceCountFromEnergySpend(
  totalSpend: number,
  energyPerDice: number,
): number {
  if (energyPerDice <= 0) return 0
  return Math.floor(totalSpend / energyPerDice)
}

export function formatPumpPreview(
  energyLabel: string,
  totalSpend: number,
  diceCount: number,
  diceSides: number,
): string {
  if (diceCount <= 0) {
    return `Spending ${totalSpend} ${energyLabel} — below threshold for damage dice.`
  }
  return `Spending ${totalSpend} ${energyLabel} deals ${diceCount}D${diceSides} damage.`
}
