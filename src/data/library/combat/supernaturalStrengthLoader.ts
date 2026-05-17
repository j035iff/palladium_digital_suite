import data from './supernatural_strength.json'
import type {
  StrengthCategory,
  SupernaturalDamageTableRow,
  ThrowObjectKind,
} from '../../../types'

export type SupernaturalStrengthData = {
  damageTable: readonly SupernaturalDamageTableRow[]
  baseThrowRanges: Record<
    ThrowObjectKind,
    Record<StrengthCategory, number>
  >
}

const loaded = data as SupernaturalStrengthData

export const SUPERNATURAL_STRENGTH_DATA: SupernaturalStrengthData = loaded

export function getSupernaturalDamageTable(): readonly SupernaturalDamageTableRow[] {
  return SUPERNATURAL_STRENGTH_DATA.damageTable
}

export function listThrowObjectKinds(): readonly ThrowObjectKind[] {
  return Object.keys(SUPERNATURAL_STRENGTH_DATA.baseThrowRanges) as ThrowObjectKind[]
}

export function getBaseThrowRangeFeet(
  objectKind: ThrowObjectKind,
  category: StrengthCategory,
): number {
  return SUPERNATURAL_STRENGTH_DATA.baseThrowRanges[objectKind][category]
}
