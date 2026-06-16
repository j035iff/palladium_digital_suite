import { getMorphusCharacteristicById, getMorphusTableById } from '../data/library/morphusTableCatalogLoader'
import { diceNotationBounds } from './diceNotationBounds'
import type {
  MorphusCharacteristic,
  MorphusForgeDiceRollSpec,
  MorphusSlotPickOption,
  MorphusSubTraitChoicesBudget,
} from '../types'

export type MorphusSubTraitPoolMode = 'morphus_table' | 'gimmick' | 'trait_entry'

export function morphusSubTraitPoolMode(
  entry: Pick<MorphusCharacteristic, 'gimmickInventory'>,
  budget: MorphusSubTraitChoicesBudget,
): MorphusSubTraitPoolMode {
  const gimmickIds = new Set(
    (entry.gimmickInventory ?? [])
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id?.trim())),
  )
  if (budget.allowedChoicesPool.every((id) => gimmickIds.has(id))) {
    return 'gimmick'
  }
  if (budget.allowedChoicesPool.every((id) => getMorphusTableById(id) != null)) {
    return 'morphus_table'
  }
  return 'trait_entry'
}

export function morphusSubTraitBudgetDiceSpec(
  budget: MorphusSubTraitChoicesBudget,
): MorphusForgeDiceRollSpec | undefined {
  if (!budget.slotsFormula?.trim()) return undefined
  const { min, max } = diceNotationBounds(budget.slotsFormula)
  return {
    notation: budget.slotsFormula.trim().toUpperCase(),
    min,
    max,
  }
}

export function morphusSubTraitBudgetPickCount(
  budget: MorphusSubTraitChoicesBudget,
): number {
  if (budget.slotsAvailable != null) return budget.slotsAvailable
  return 0
}

export function buildMorphusGimmickPickOption(
  entry: Pick<MorphusCharacteristic, 'gimmickInventory'>,
  gimmickId: string,
): MorphusSlotPickOption | undefined {
  const gimmick = entry.gimmickInventory?.find((row) => row.id === gimmickId)
  if (!gimmick) return undefined
  const description =
    gimmick.customOneOffs?.join(' ') ?? gimmick.effectFormula ?? undefined
  return {
    id: gimmickId,
    name: gimmick.itemName,
    description,
    bonuses: [],
    penalties: [],
  }
}

export function buildMorphusTraitEntryPickOption(traitId: string): MorphusSlotPickOption {
  const catalog = getMorphusCharacteristicById(traitId)
  return {
    id: traitId,
    name: catalog?.name ?? traitId,
    description: catalog?.description,
    bonuses: [],
    penalties: [],
  }
}

export function resolveMorphusSubTraitPickLabel(
  entry: Pick<MorphusCharacteristic, 'gimmickInventory'>,
  poolMode: MorphusSubTraitPoolMode,
  pickId: string,
): string {
  if (poolMode === 'gimmick') {
    return (
      entry.gimmickInventory?.find((row) => row.id === pickId)?.itemName ?? pickId
    )
  }
  return getMorphusCharacteristicById(pickId)?.name ?? pickId
}

/** Sub-trait / gadget picks keyed by `${parentPath}#${index}` on the parent trait path. */
export function collectMorphusSubTraitPicksForPath(
  subTraitPicks: Readonly<Record<string, string>> | undefined,
  parentPath: string,
): readonly string[] {
  if (!subTraitPicks) return []
  const prefix = `${parentPath}#`
  return Object.entries(subTraitPicks)
    .filter(([key]) => key.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
}
