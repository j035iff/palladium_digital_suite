import type { PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import { occMatchesAllTags } from './genreGating'
import { isOccAllowedForRace } from './raceEngine'

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

/** Configurator list tier (forge-character_creation.md Tab 1). */
export type ConfiguratorTier = 1 | 2 | 3

export type ConfiguratorTierResult = {
  tier: ConfiguratorTier
  /** Tier 2 — tri-directional cross-requisite lockout. */
  conflictReason?: string
  /** Tier 3 — tag filter mismatch (O.C.C. only). */
  tagMismatchReason?: string
}

export type ConfiguratorMatrixContext = {
  /** Active O.C.C. tag pill filters (AND). */
  activeOccTags: readonly string[]
  /** When empty / undefined, alignment cross-filters are skipped (optional step). */
  selectedAlignment?: string | null
  selectedRaceId?: string | null
  selectedOccId?: string | null
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

function tagMismatchReason(
  occ: PalladiumOcc,
  activeTags: readonly string[],
): string | null {
  if (!activeTags.length) return null
  if (occMatchesAllTags(occ.tags, activeTags)) return null
  return `Not a ${activeTags.join(' AND ')} O.C.C.`
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
  if (ctx.selectedAlignment?.trim()) {
    const ac = describeRaceAlignmentConflict(race, ctx.selectedAlignment)
    if (ac) return { tier: 2, conflictReason: ac }
    if (selectedOcc) {
      const oc = describeOccAlignmentConflict(selectedOcc, ctx.selectedAlignment)
      if (oc) return { tier: 2, conflictReason: oc }
    }
  }
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
  if (ctx.selectedAlignment?.trim()) {
    const oc = describeOccAlignmentConflict(occ, ctx.selectedAlignment)
    if (oc) return { tier: 2, conflictReason: oc }
    if (selectedRace) {
      const rc = describeRaceAlignmentConflict(
        selectedRace,
        ctx.selectedAlignment,
      )
      if (rc) return { tier: 2, conflictReason: rc }
    }
  }
  const tagReason = tagMismatchReason(occ, ctx.activeOccTags)
  if (tagReason) return { tier: 3, tagMismatchReason: tagReason }
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
  facadeAlignment: string | undefined,
): string {
  return facadeAlignment?.trim() ?? ''
}
