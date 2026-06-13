import type { OccAlignmentRestrictions } from '../types'
import {
  PALLADIUM_ALIGNMENT_VALUES,
  summarizeAlignmentNames,
} from './configuratorMatrix'

function inList(list: readonly string[] | undefined, value: string): boolean {
  return list?.includes(value) ?? false
}

/** Whether a chosen alignment satisfies O.C.C. or path-level restrictions. */
export function alignmentSatisfiesRestrictions(
  alignment: string | undefined | null,
  restrictions: OccAlignmentRestrictions | undefined,
): boolean {
  if (!restrictions?.allowed?.length && !restrictions?.forbidden?.length) {
    return true
  }
  const trimmed = alignment?.trim() ?? ''
  if (!trimmed) return false
  if (inList(restrictions.forbidden, trimmed)) return false
  if (restrictions.allowed?.length && !inList(restrictions.allowed, trimmed)) {
    return false
  }
  return true
}

/** Player-facing reason when a gated option is unavailable. */
export function formatAlignmentRestrictionReason(
  restrictions: OccAlignmentRestrictions,
): string {
  if (restrictions.allowed?.length) {
    const names = restrictions.allowed.filter((a) =>
      (PALLADIUM_ALIGNMENT_VALUES as readonly string[]).includes(a),
    )
    if (names.length) {
      return `Requires ${summarizeAlignmentNames(names)} alignment`
    }
    return `Requires ${restrictions.allowed.join(' or ')} alignment`
  }
  if (restrictions.forbidden?.length) {
    return `Not available to ${summarizeAlignmentNames(restrictions.forbidden)}`
  }
  return 'Alignment restricted'
}
