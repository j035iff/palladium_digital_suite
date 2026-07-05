import type { PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import {
  describeConfiguratorFilterMismatch,
  type ConfiguratorFilterExpression,
  type ConfiguratorFilterFormatOptions,
} from './configuratorFilterExpression'
import { isOccAllowedForRace } from './raceEngine'

export type { ConfiguratorFilterExpression, OccTagFilterExpression } from './configuratorFilterExpression'
export { occMatchesConfiguratorTag } from './configuratorFilterExpression'

/** @deprecated Use {@link OccTagFilterExpression} instead. */
export type OccConfiguratorTagFilterMode = 'include' | 'exclude'

/** @deprecated Use {@link OccTagFilterExpression} instead. */
export type OccConfiguratorTagFilter = {
  tag: string
  mode: OccConfiguratorTagFilterMode
}

const ATTR_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

export const CONFIGURATOR_PLACEHOLDER_KEY = '__configurator_placeholder__'

export const CONFIGURATOR_SELECT_RACE_LABEL = 'Select Race'
export const CONFIGURATOR_SELECT_OCC_LABEL = 'Select O.C.C.'

export function isConfiguratorRaceSelected(raceId: string | undefined | null): boolean {
  return Boolean(raceId?.trim())
}

export function isConfiguratorOccSelected(occId: string | undefined | null): boolean {
  return Boolean(occId?.trim())
}

/** Human-readable O.C.C. minimum attributes for configurator descriptions. */
export function formatOccAttributeRequirements(occ: PalladiumOcc): string | null {
  const reqs = occ.attributeRequirements
  if (!reqs) return null
  const parts: string[] = []
  for (const key of FORGE_ATTRIBUTE_KEYS) {
    const attrKey = key === 'ps' ? 'ps' : key
    const min = reqs[attrKey as keyof typeof reqs]
    if (min != null && min > 0) {
      parts.push(`${ATTR_LABELS[key]} ${min}+`)
    }
  }
  return parts.length > 0 ? `Requires: ${parts.join(', ')}` : null
}

export type ConfiguratorListRow<T extends { id: string }> =
  | { kind: 'placeholder'; key: string; label: string }
  | { kind: 'item'; key: string; item: T; filterMismatch: boolean }

/**
 * Placeholder first, then the current selection (always pinned), then the rest in tier sort order.
 * Amber styling when the pinned row is tier ≠ 1 (filters / matrix mismatch).
 */
export function buildConfiguratorColumnRows<T extends { id: string }>(
  sortedItems: readonly T[],
  tierOf: (item: T) => ConfiguratorTierResult,
  selectedId: string | undefined | null,
  placeholderLabel: string,
): ConfiguratorListRow<T>[] {
  const rows: ConfiguratorListRow<T>[] = [
    { kind: 'placeholder', key: CONFIGURATOR_PLACEHOLDER_KEY, label: placeholderLabel },
  ]
  const id = selectedId?.trim()
  const selected = id ? sortedItems.find((i) => i.id === id) : undefined

  if (selected) {
    const filterMismatch = tierOf(selected).tier !== 1
    rows.push({
      kind: 'item',
      key: selected.id,
      item: selected,
      filterMismatch,
    })
    for (const item of sortedItems) {
      if (item.id === selected.id) continue
      rows.push({ kind: 'item', key: item.id, item, filterMismatch: false })
    }
    return rows
  }

  for (const item of sortedItems) {
    rows.push({ kind: 'item', key: item.id, item, filterMismatch: false })
  }
  return rows
}

export type ConfiguratorScrollLayout<T> = {
  placeholderLabel: string
  /** Current pick — frozen above the scroll region (race / O.C.C. columns). */
  pinned: { item: T; filterMismatch: boolean } | null
  /** Remaining options (excludes pinned id). */
  scrollItems: readonly T[]
}

/** Race / O.C.C. lists: placeholder + pinned selection + scrollable remainder. */
export function buildConfiguratorScrollLayout<T extends { id: string }>(
  sortedItems: readonly T[],
  tierOf: (item: T) => ConfiguratorTierResult,
  selectedId: string | undefined | null,
  placeholderLabel: string,
): ConfiguratorScrollLayout<T> {
  const id = selectedId?.trim()
  const selected = id ? sortedItems.find((i) => i.id === id) : undefined
  return {
    placeholderLabel,
    pinned: selected
      ? {
          item: selected,
          filterMismatch: tierOf(selected).tier !== 1,
        }
      : null,
    scrollItems: selected
      ? sortedItems.filter((i) => i.id !== selected.id)
      : sortedItems,
  }
}

/** Configurator list tier (docs/forge/character_creation.md Tab 1). */
export type ConfiguratorTier = 1 | 2 | 3

export type ConfiguratorTierResult = {
  tier: ConfiguratorTier
  /** Tier 2 — tri-directional cross-requisite lockout. */
  conflictReason?: string
  /** Tier 3 — tag filter mismatch (O.C.C. only). */
  tagMismatchReason?: string
}

export type ConfiguratorMatrixContext = {
  /** Boolean filter tree — race / O.C.C. predicates with AND, OR, NOT, and groups. */
  configuratorFilter?: ConfiguratorFilterExpression | null
  /** @deprecated Use {@link configuratorFilter}. */
  occTagFilter?: ConfiguratorFilterExpression | null
  filterFormatOptions?: ConfiguratorFilterFormatOptions
  /** When empty / undefined, alignment cross-filters are skipped (optional step). */
  selectedAlignment?: string | null
  selectedRaceId?: string | null
  selectedOccId?: string | null
}

function resolveConfiguratorFilter(
  ctx: ConfiguratorMatrixContext,
): ConfiguratorFilterExpression | null | undefined {
  return ctx.configuratorFilter ?? ctx.occTagFilter
}

function inList(list: readonly string[] | undefined, value: string): boolean {
  if (!list?.length) return false
  const n = value.trim().toLowerCase()
  return list.some((x) => x.trim().toLowerCase() === n)
}

/** Race ↔ O.C.C. cross-requisite conflict (Tier 2). */
export function describeRaceOccConflict(
  race: Race,
  occ: PalladiumOcc,
): string | null {
  const rr = occ.raceRestrictions
  if (rr?.forbidden?.includes(race.id)) {
    return `O.C.C. prohibits ${race.name} race`
  }
  if (rr?.allowed?.length && !rr.allowed.includes(race.id)) {
    const label = rr.allowed
      .map((id) => id.replace(/^race_/, '').replace(/_/g, ' '))
      .join(' or ')
    return `Requires ${label} race`
  }

  const lim = race.occLimitations
  if (lim.allowedOccIds?.length && !lim.allowedOccIds.includes(occ.id)) {
    return `${race.name} may not take this O.C.C.`
  }
  if (lim.forbiddenOccIds?.includes(occ.id)) {
    return `${race.name} forbids this O.C.C.`
  }
  if (!isOccAllowedForRace(race, occ)) {
    return `${race.name} and ${occ.name} are incompatible`
  }
  return null
}

/** Race ↔ alignment conflict when alignment is chosen. */
export function describeRaceAlignmentConflict(
  race: Race,
  alignment: string,
): string | null {
  if (!alignment.trim()) return null
  if (inList(race.demographics.excludedAlignments, alignment)) {
    return `${race.name} prohibits ${alignment} alignment`
  }
  return null
}

/** O.C.C. ↔ alignment conflict when alignment is chosen. */
export function describeOccAlignmentConflict(
  occ: PalladiumOcc,
  alignment: string,
): string | null {
  if (!alignment.trim()) return null
  const ar = occ.alignmentRestrictions
  if (ar?.forbidden && inList(ar.forbidden, alignment)) {
    return `O.C.C. prohibits ${alignment} alignment`
  }
  if (ar?.allowed?.length && !inList(ar.allowed, alignment)) {
    return `O.C.C. requires ${ar.allowed.join(' or ')} alignment`
  }
  return null
}

export function assessRaceConfiguratorTier(
  race: Race,
  ctx: ConfiguratorMatrixContext,
  occById: ReadonlyMap<string, PalladiumOcc>,
): ConfiguratorTierResult {
  const selectedOcc = ctx.selectedOccId
    ? occById.get(ctx.selectedOccId)
    : undefined
  if (selectedOcc) {
    const conflict = describeRaceOccConflict(race, selectedOcc)
    if (conflict) return { tier: 2, conflictReason: conflict }
  }
  const filterReason = describeConfiguratorFilterMismatch(
    { race, occ: selectedOcc, focus: 'race' },
    resolveConfiguratorFilter(ctx),
    ctx.filterFormatOptions,
  )
  if (filterReason) return { tier: 3, tagMismatchReason: filterReason }
  return { tier: 1 }
}

export function assessOccConfiguratorTier(
  occ: PalladiumOcc,
  ctx: ConfiguratorMatrixContext,
  raceById: ReadonlyMap<string, Race>,
): ConfiguratorTierResult {
  const selectedRace = ctx.selectedRaceId
    ? raceById.get(ctx.selectedRaceId)
    : undefined

  if (selectedRace) {
    const conflict = describeRaceOccConflict(selectedRace, occ)
    if (conflict) return { tier: 2, conflictReason: conflict }
  }
  const filterReason = describeConfiguratorFilterMismatch(
    { race: selectedRace, occ, focus: 'occ' },
    resolveConfiguratorFilter(ctx),
    ctx.filterFormatOptions,
  )
  if (filterReason) return { tier: 3, tagMismatchReason: filterReason }
  return { tier: 1 }
}

export function assessAlignmentConfiguratorTier(
  alignment: string,
  ctx: ConfiguratorMatrixContext,
  raceById: ReadonlyMap<string, Race>,
  occById: ReadonlyMap<string, PalladiumOcc>,
): ConfiguratorTierResult {
  if (!alignment.trim()) return { tier: 1 }

  const selectedRace = ctx.selectedRaceId
    ? raceById.get(ctx.selectedRaceId)
    : undefined
  const selectedOcc = ctx.selectedOccId
    ? occById.get(ctx.selectedOccId)
    : undefined

  if (selectedRace) {
    const rc = describeRaceAlignmentConflict(selectedRace, alignment)
    if (rc) return { tier: 2, conflictReason: rc }
  }
  if (selectedOcc) {
    const oc = describeOccAlignmentConflict(selectedOcc, alignment)
    if (oc) return { tier: 2, conflictReason: oc }
  }
  return { tier: 1 }
}

export function sortConfiguratorEntries<T>(
  items: readonly T[],
  tierOf: (item: T) => ConfiguratorTierResult,
  nameOf: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const ta = tierOf(a).tier
    const tb = tierOf(b).tier
    if (ta !== tb) return ta - tb
    return nameOf(a).localeCompare(nameOf(b))
  })
}

/** Whether race and O.C.C. pass both-direction restrictions (no Tier 2 conflict). */
export function isOccCompatibleWithRace(
  race: Race | undefined,
  occ: PalladiumOcc,
): boolean {
  if (!race) return true
  return describeRaceOccConflict(race, occ) == null
}

/**
 * When hiding filter mismatches, drop Tier 3 rows from scroll lists.
 * The current selection stays pinned above the scroll region separately.
 */
export function filterConfiguratorListForActiveFilter<T>(
  items: readonly T[],
  tierOf: (item: T) => ConfiguratorTierResult,
  hideFilterMismatches: boolean,
): T[] {
  if (!hideFilterMismatches) return [...items]
  return items.filter((item) => tierOf(item).tier !== 3)
}

/** Drop O.C.C.s the selected race cannot take when `hideRaceIncompatible` is true. */
export function filterConfiguratorOccPoolForRace(
  occs: readonly PalladiumOcc[],
  race: Race | undefined,
  hideRaceIncompatible: boolean,
): PalladiumOcc[] {
  if (!hideRaceIncompatible || !race) return [...occs]
  return occs.filter((occ) => isOccCompatibleWithRace(race, occ))
}

/** Drop races that cannot take the selected O.C.C. when `hideOccIncompatible` is true. */
export function filterConfiguratorRacePoolForOcc(
  races: readonly Race[],
  occ: PalladiumOcc | undefined,
  hideOccIncompatible: boolean,
): Race[] {
  if (!hideOccIncompatible || !occ) return [...races]
  return races.filter((race) => isOccCompatibleWithRace(race, occ))
}

/** Selected race + O.C.C. must both be Tier 1 relative to each other (alignment optional). */
export function assessConfiguratorPairConflict(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  alignment?: string | null,
): string | null {
  if (!race || !occ) return null
  const pair = describeRaceOccConflict(race, occ)
  if (pair) return pair
  if (alignment?.trim()) {
    return (
      describeRaceAlignmentConflict(race, alignment) ??
      describeOccAlignmentConflict(occ, alignment)
    )
  }
  return null
}

export function isConfiguratorSelectable(
  result: ConfiguratorTierResult,
): boolean {
  return result.tier === 1
}

export function configuratorTierTooltip(result: ConfiguratorTierResult): string {
  if (result.conflictReason) return result.conflictReason
  if (result.tagMismatchReason) return result.tagMismatchReason
  return ''
}

/** Undecided alignment — cross-filters skipped until player picks. */
export const CONFIGURATOR_ALIGNMENT_UNDECIDED = ''

export const CONFIGURATOR_ALIGNMENT_OPTIONS = [
  CONFIGURATOR_ALIGNMENT_UNDECIDED,
  'Principled',
  'Scrupulous',
  'Unprincipled',
  'Anarchist',
  'Miscreant',
  'Aberrant',
  'Diabolic',
] as const

const ALIGNMENT_DISPLAY_LABELS: Record<string, string> = {
  [CONFIGURATOR_ALIGNMENT_UNDECIDED]: 'Select Alignment',
  Principled: 'Good - Principled',
  Scrupulous: 'Good - Scrupulous',
  Unprincipled: 'Selfish - Unprincipled',
  Anarchist: 'Selfish - Anarchist',
  Miscreant: 'Evil - Miscreant',
  Aberrant: 'Evil - Aberrant',
  Diabolic: 'Evil - Diabolic',
}

export function configuratorAlignmentLabel(alignment: string): string {
  return ALIGNMENT_DISPLAY_LABELS[alignment] ?? alignment
}

/** Playable alignments (excludes undecided placeholder). */
export const PALLADIUM_ALIGNMENT_VALUES: readonly [
  'Principled',
  'Scrupulous',
  'Unprincipled',
  'Anarchist',
  'Miscreant',
  'Aberrant',
  'Diabolic',
] = [
  'Principled',
  'Scrupulous',
  'Unprincipled',
  'Anarchist',
  'Miscreant',
  'Aberrant',
  'Diabolic',
]

export function effectiveConfiguratorAlignment(
  primaryAlignment: string | undefined,
): string {
  return primaryAlignment?.trim() ?? ''
}

const ALIGNMENT_CATEGORY_LABELS = {
  good: 'Good alignments',
  selfish: 'Selfish alignments',
  evil: 'Evil alignments',
} as const

const ALIGNMENT_CATEGORIES = {
  good: ['Principled', 'Scrupulous'] as const,
  selfish: ['Unprincipled', 'Anarchist'] as const,
  evil: ['Miscreant', 'Aberrant', 'Diabolic'] as const,
}

/** Human-readable list such as "Anarchist or Evil alignments". */
export function summarizeAlignmentNames(names: readonly string[]): string {
  const allowed = new Set(names.map((name) => name.trim()).filter(Boolean))
  const parts: string[] = []

  for (const category of ['good', 'selfish', 'evil'] as const) {
    const bucket = ALIGNMENT_CATEGORIES[category]
    const bucketFull =
      bucket.length > 0 && bucket.every((alignment) => allowed.has(alignment))

    if (bucketFull) {
      parts.push(ALIGNMENT_CATEGORY_LABELS[category])
      for (const alignment of bucket) allowed.delete(alignment)
      continue
    }

    for (const alignment of bucket) {
      if (allowed.has(alignment)) {
        parts.push(alignment)
        allowed.delete(alignment)
      }
    }
  }

  for (const alignment of allowed) parts.push(alignment)

  if (parts.length === 0) return 'restricted alignments'
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, or ${parts.at(-1)}`
}

function effectiveAllowedAlignmentsForOcc(
  restrictions: PalladiumOcc['alignmentRestrictions'],
): readonly string[] | null {
  if (!restrictions?.allowed?.length && !restrictions?.forbidden?.length) {
    return null
  }
  if (restrictions.allowed?.length) return restrictions.allowed
  return PALLADIUM_ALIGNMENT_VALUES.filter(
    (alignment) => !inList(restrictions.forbidden, alignment),
  )
}

/** Selection note for O.C.C. rows with alignment restrictions. */
export function formatOccAlignmentRestrictionNote(occ: PalladiumOcc): string | null {
  const allowed = effectiveAllowedAlignmentsForOcc(occ.alignmentRestrictions)
  if (!allowed || allowed.length >= PALLADIUM_ALIGNMENT_VALUES.length) return null
  return `Only available to ${summarizeAlignmentNames(allowed)}`
}

/** Selection note for race rows with excluded alignments. */
export function formatRaceAlignmentRestrictionNote(race: Race): string | null {
  const excluded = race.demographics.excludedAlignments
  if (!excluded?.length) return null
  return `Not available to ${summarizeAlignmentNames(excluded)}`
}

/** Tooltip / disabled-reason for an alignment option given current race + O.C.C. */
export function describeAlignmentSelectionConflict(
  alignment: string,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string | null {
  if (!alignment.trim()) return null
  const raceConflict = race
    ? describeRaceAlignmentConflict(race, alignment)
    : null
  if (raceConflict) return raceConflict
  return occ ? describeOccAlignmentConflict(occ, alignment) : null
}

export function isAlignmentCompatibleWithSelection(
  alignment: string,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): boolean {
  return describeAlignmentSelectionConflict(alignment, race, occ) == null
}
