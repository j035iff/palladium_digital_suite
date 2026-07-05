import {
  normalizeDiceDisplay,
  parsePhysicalDiceRoll,
  sumDiceNotationFlatBonuses,
} from './diceNotation'
import { diceCoreBounds } from './diceNotationBounds'

export { parsePhysicalDiceRoll, sumDiceNotationFlatBonuses }

export type DiceContributionLabel = {
  notation: string
  label: string
}

export type PhysicalPendingDiceRoll = {
  id: string
  notation: string
  min: number
  max: number
  source: string
}

/** Dice-only contributions for ledger display and pending roll rows (flats live in block baseline). */
export function physicalDiceContributions(
  contributions: readonly DiceContributionLabel[],
): DiceContributionLabel[] {
  return contributions.map((contribution) => ({
    label: contribution.label,
    notation: parsePhysicalDiceRoll(contribution.notation).diceNotation,
  }))
}

export function flatBonusesFromDiceContributions(
  contributions: readonly DiceContributionLabel[],
): number {
  return sumDiceNotationFlatBonuses(contributions.map((c) => c.notation))
}

/** One Review-tab physical roll — dice only; bundled flat is returned separately for block baseline. */
export function createPhysicalPendingRoll(
  blockId: string,
  groupKind: string,
  index: number,
  source: string,
  rawNotation: string,
  rollId?: string,
): { roll: PhysicalPendingDiceRoll; flatBonus: number } {
  const parsed = parsePhysicalDiceRoll(rawNotation)
  const bounds = diceCoreBounds(parsed.diceNotation)
  return {
    roll: {
      id: rollId ?? `spawn.${blockId}.${groupKind}.${index}`,
      notation: normalizeDiceDisplay(parsed.diceNotation),
      min: bounds.min,
      max: bounds.max,
      source,
    },
    flatBonus: parsed.flatBonus,
  }
}
