import { getAbilityById } from '../data/abilityLibrary'
import { getFeatureById } from '../data/library/registry'
import { occIsNaturalPsychicClass } from './creationPhases'
import {
  occCreationAbilityBudget,
  psionicCategoriesForFeature,
  type OccCreationAbilityBudget,
} from './occCreationDerivation'
import {
  psychicGateCreationPsionicSlots,
  psychicGateIspFormulaHint,
} from './psychicGate'
import type { Feature, PalladiumOcc, PsychicTier } from '../types'

/** Sensitive / Physical / Healing pools for standard Psychic Gate picks. */
export const PSYCHIC_GATE_POOL_CATEGORIES = [
  'sensitive',
  'physical',
  'healer',
] as const

export type PsychicGatePoolCategory = (typeof PSYCHIC_GATE_POOL_CATEGORIES)[number]

/** Major tier: 8 from one pool, or 6 across pools. */
export type PsychicGateMajorAllocation = 'single_pool' | 'mixed_pools'

const GATE_POOL_LABELS: Record<PsychicGatePoolCategory, string> = {
  sensitive: 'Sensitive',
  physical: 'Physical',
  healer: 'Healing',
}

export function psychicGatePsionicRulesApply(
  occ: PalladiumOcc | undefined,
  tier: PsychicTier,
  psychicGateBypassed: boolean,
): boolean {
  if (psychicGateBypassed || (tier !== 'minor' && tier !== 'major')) return false
  if (occ && occIsNaturalPsychicClass(occ)) return false
  if (occ?.ispEngine && occCreationAbilityBudget(occ).psionicSlots > 0) return false
  return psychicGateCreationPsionicSlots(tier, occ) > 0
}

export function psychicGateRequiredPickCount(
  tier: PsychicTier,
  majorAllocation?: PsychicGateMajorAllocation | null,
): number | null {
  if (tier === 'minor') return 2
  if (tier === 'major') {
    if (majorAllocation === 'single_pool') return 8
    if (majorAllocation === 'mixed_pools') return 6
    return null
  }
  return null
}

export function psychicGateRequiresSinglePool(
  tier: PsychicTier,
  majorAllocation?: PsychicGateMajorAllocation | null,
): boolean {
  return tier === 'minor' || (tier === 'major' && majorAllocation === 'single_pool')
}

function normalizeGateViewingCategory(
  category: string | undefined | null,
): PsychicGatePoolCategory | null {
  if (!category) return null
  const normalized =
    category.toLowerCase() === 'healing' ? 'healer' : category.toLowerCase()
  if (
    PSYCHIC_GATE_POOL_CATEGORIES.includes(normalized as PsychicGatePoolCategory)
  ) {
    return normalized as PsychicGatePoolCategory
  }
  return null
}

function intersectGatePoolLists(
  poolLists: readonly (readonly PsychicGatePoolCategory[])[],
): PsychicGatePoolCategory[] {
  if (poolLists.length === 0) return []
  let current = new Set(poolLists[0])
  for (let i = 1; i < poolLists.length; i++) {
    const next = new Set(poolLists[i])
    current = new Set([...current].filter((pool) => next.has(pool)))
  }
  return PSYCHIC_GATE_POOL_CATEGORIES.filter((pool) => current.has(pool))
}

/** All Sensitive / Physical / Healing pools a power belongs to for this genre. */
export function gatePoolsForFeature(
  feature: Feature,
  genreId: string,
): readonly PsychicGatePoolCategory[] {
  const categories = psionicCategoriesForFeature(feature, genreId)
  return PSYCHIC_GATE_POOL_CATEGORIES.filter((pool) => categories.includes(pool))
}

export function primaryPsychicGatePoolForFeature(
  feature: Feature,
  genreId: string,
): PsychicGatePoolCategory | null {
  return gatePoolsForFeature(feature, genreId)[0] ?? null
}

export type GatePsionicSelection = {
  id: string
  pool: PsychicGatePoolCategory
}

export function listGatePsionicSelections(
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
): GatePsionicSelection[] {
  const out: GatePsionicSelection[] = []
  for (const id of selectedIds ?? []) {
    if (getAbilityById(id)?.category !== 'Psionic') continue
    const feature = getFeatureById(id)
    if (!feature) continue
    const pool = gatePoolsForFeature(feature, genreId)[0]
    if (!pool) continue
    out.push({ id, pool })
  }
  return out
}

export function lockedPsychicGatePool(
  tier: PsychicTier,
  majorAllocation: PsychicGateMajorAllocation | undefined | null,
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
): PsychicGatePoolCategory | null {
  if (!psychicGateRequiresSinglePool(tier, majorAllocation)) return null

  const poolLists: PsychicGatePoolCategory[][] = []
  for (const id of selectedIds ?? []) {
    if (getAbilityById(id)?.category !== 'Psionic') continue
    const feature = getFeatureById(id)
    if (!feature) continue
    const pools = gatePoolsForFeature(feature, genreId)
    if (pools.length > 0) poolLists.push([...pools])
  }
  if (poolLists.length === 0) return null

  const intersection = intersectGatePoolLists(poolLists)
  return intersection.length === 1 ? intersection[0] : null
}

export function psychicGatePsionicPickAllowed(params: {
  tier: PsychicTier
  majorAllocation?: PsychicGateMajorAllocation | null
  psychicGateBypassed?: boolean
  occ?: PalladiumOcc
  selectedIds: readonly string[] | undefined | null
  candidateId: string
  genreId: string
  /** Active forge category tab; omitted when searching all pools. */
  viewingCategory?: string | null
}): { allowed: boolean; reason?: string } | null {
  const {
    tier,
    majorAllocation,
    psychicGateBypassed = false,
    occ,
    selectedIds,
    candidateId,
    genreId,
    viewingCategory,
  } = params

  if (!psychicGatePsionicRulesApply(occ, tier, psychicGateBypassed)) {
    return null
  }

  if (tier === 'major' && !majorAllocation) {
    return {
      allowed: false,
      reason:
        'Choose Major psionic allocation first (8 from one category, or 6 mixed).',
    }
  }

  const feature = getFeatureById(candidateId)
  if (!feature) {
    return { allowed: false, reason: 'Unknown psionic power.' }
  }

  const candidatePools = gatePoolsForFeature(feature, genreId)
  if (candidatePools.length === 0) {
    const categories = psionicCategoriesForFeature(feature, genreId)
    if (categories.includes('super')) {
      return {
        allowed: false,
        reason: 'Super psionics are not available via the Psychic Gate.',
      }
    }
    return {
      allowed: false,
      reason: 'Not a Sensitive, Physical, or Healing psionic for this genre.',
    }
  }

  const viewingPool = normalizeGateViewingCategory(viewingCategory)
  if (viewingPool && !candidatePools.includes(viewingPool)) {
    return {
      allowed: false,
      reason: 'Not listed in this psionic category for this genre.',
    }
  }

  const required = psychicGateRequiredPickCount(tier, majorAllocation)
  if (required == null) {
    return { allowed: false, reason: 'Psychic Gate pick budget is not configured.' }
  }

  const selections = listGatePsionicSelections(selectedIds, genreId)
  const already = (selectedIds ?? []).includes(candidateId)
  const total = selections.length

  if (!already && total >= required) {
    return { allowed: false, reason: 'Psychic Gate pick budget is full.' }
  }

  const existingPoolLists: PsychicGatePoolCategory[][] = []
  for (const id of selectedIds ?? []) {
    if (id === candidateId) continue
    if (getAbilityById(id)?.category !== 'Psionic') continue
    const selectedFeature = getFeatureById(id)
    if (!selectedFeature) continue
    const pools = gatePoolsForFeature(selectedFeature, genreId)
    if (pools.length > 0) existingPoolLists.push([...pools])
  }

  const locked = lockedPsychicGatePool(tier, majorAllocation, selectedIds, genreId)
  if (locked) {
    if (!candidatePools.includes(locked)) {
      return {
        allowed: false,
        reason: `Psychic Gate picks must all come from ${GATE_POOL_LABELS[locked]} (${GATE_POOL_LABELS.sensitive}, ${GATE_POOL_LABELS.physical}, or ${GATE_POOL_LABELS.healer} — one pool only).`,
      }
    }
    if (viewingPool && viewingPool !== locked) {
      return {
        allowed: false,
        reason: `Psychic Gate picks must all come from ${GATE_POOL_LABELS[locked]}. Open the ${GATE_POOL_LABELS[locked]} category to select this power.`,
      }
    }
  } else if (
    psychicGateRequiresSinglePool(tier, majorAllocation) &&
    existingPoolLists.length > 0 &&
    !already
  ) {
    const sharedPools = intersectGatePoolLists([
      ...existingPoolLists,
      candidatePools,
    ])
    if (sharedPools.length === 0) {
      return {
        allowed: false,
        reason:
          'Psychic Gate picks must all come from one category — choose a power that shares Sensitive, Physical, or Healing with your existing picks.',
      }
    }
  }

  return { allowed: true }
}

export function formatPsychicGateRequirementLabel(
  tier: PsychicTier,
  majorAllocation: PsychicGateMajorAllocation | undefined | null,
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
): string {
  if (tier === 'major' && !majorAllocation) {
    return 'Choose Major psionic allocation (8 from one category, or 6 mixed)'
  }

  const required = psychicGateRequiredPickCount(tier, majorAllocation) ?? 0
  const total = listGatePsionicSelections(selectedIds, genreId).length
  const remaining = Math.max(0, required - total)

  if (tier === 'minor') {
    const locked = lockedPsychicGatePool(tier, majorAllocation, selectedIds, genreId)
    if (remaining === 0) {
      return locked
        ? `${GATE_POOL_LABELS[locked]} psionics selected (${total}/${required})`
        : `Psionics selected (${total}/${required})`
    }
    if (locked) {
      return `Select ${remaining} more ${GATE_POOL_LABELS[locked]} psionic${remaining === 1 ? '' : 's'} (${total}/${required})`
    }
    return `Select ${remaining} more psionic${remaining === 1 ? '' : 's'} from one category — Sensitive, Physical, or Healing (${total}/${required})`
  }

  if (majorAllocation === 'single_pool') {
    const locked = lockedPsychicGatePool(tier, majorAllocation, selectedIds, genreId)
    if (remaining === 0) {
      return locked
        ? `${GATE_POOL_LABELS[locked]} psionics selected (${total}/${required})`
        : `Psionics selected (${total}/${required})`
    }
    if (locked) {
      return `Select ${remaining} more ${GATE_POOL_LABELS[locked]} psionic${remaining === 1 ? '' : 's'} (${total}/${required})`
    }
    return `Select ${remaining} more psionic${remaining === 1 ? '' : 's'} from one category — Sensitive, Physical, or Healing (${total}/${required})`
  }

  if (remaining === 0) {
    return `Psionics selected across Sensitive, Physical, and Healing (${total}/${required})`
  }
  return `Select ${remaining} more psionic${remaining === 1 ? '' : 's'} from any mix of Sensitive, Physical, and Healing (${total}/${required})`
}

export function assessPsychicGatePsionicBlockers(params: {
  occ?: PalladiumOcc
  tier: PsychicTier
  psychicGateBypassed?: boolean
  majorAllocation?: PsychicGateMajorAllocation | null
  selectedIds?: readonly string[] | null
  genreId?: string
}): string[] {
  const {
    occ,
    tier,
    psychicGateBypassed = false,
    majorAllocation,
    selectedIds,
    genreId = 'nightbane',
  } = params

  if (!psychicGatePsionicRulesApply(occ, tier, psychicGateBypassed)) {
    return []
  }

  if (tier === 'major' && !majorAllocation) {
    return [
      'Choose Major psionic allocation (8 from one category, or 6 from any combination of Sensitive, Physical, and Healing).',
    ]
  }

  const required = psychicGateRequiredPickCount(tier, majorAllocation)
  if (required == null) return []

  const total = listGatePsionicSelections(selectedIds, genreId).length
  if (total >= required) return []

  return [formatPsychicGateRequirementLabel(tier, majorAllocation, selectedIds, genreId)]
}

export function resolveGateAwareCreationAbilityBudget(input: {
  occ?: PalladiumOcc
  psychicTier?: PsychicTier
  psychicGateBypassed?: boolean
  majorAllocation?: PsychicGateMajorAllocation | null
  storedBudget?: OccCreationAbilityBudget | null
  creationGenreId?: string
}): OccCreationAbilityBudget {
  const {
    occ,
    psychicTier = 'none',
    psychicGateBypassed = false,
    majorAllocation,
    storedBudget,
    creationGenreId,
  } = input

  if (creationGenreId && psychicGateBypassed) {
    // handled by parent
  }

  const occBudget = occ
    ? occCreationAbilityBudget(occ)
    : (storedBudget ?? { spellSlots: 0, psionicSlots: 0, talentSlots: 0 })

  const tier = psychicGateBypassed ? 'none' : psychicTier

  if (psychicGatePsionicRulesApply(occ, tier, psychicGateBypassed)) {
    const required =
      psychicGateRequiredPickCount(tier, majorAllocation) ??
      (tier === 'major' ? 8 : tier === 'minor' ? 2 : 0)
    return {
      spellSlots: occBudget.spellSlots,
      psionicSlots: required,
      talentSlots: occBudget.talentSlots,
    }
  }

  const gatePsionic = psychicGateCreationPsionicSlots(tier, occ)
  return {
    spellSlots: occBudget.spellSlots,
    psionicSlots: Math.max(occBudget.psionicSlots, gatePsionic),
    talentSlots: occBudget.talentSlots,
  }
}

export function psychicGateEngineSummaryLines(
  tier: PsychicTier,
  majorAllocation: PsychicGateMajorAllocation | undefined | null,
  selectionCount: number,
): string[] {
  const required = psychicGateRequiredPickCount(tier, majorAllocation)
  const ispHint = psychicGateIspFormulaHint(tier)
  const lines = ispHint ? [`I.S.P.: ${ispHint}`] : []

  if (tier === 'minor') {
    lines.push(
      'Psionic picks: 2 from any one of Sensitive, Physical, or Healing',
    )
  } else if (tier === 'major') {
    if (majorAllocation === 'single_pool') {
      lines.push(
        'Psionic picks: 8 from any one of Sensitive, Physical, or Healing',
      )
    } else if (majorAllocation === 'mixed_pools') {
      lines.push(
        'Psionic picks: 6 from any combination of Sensitive, Physical, and Healing',
      )
    } else {
      lines.push(
        'Psionic picks: choose 8 from one category, or 6 mixed across Sensitive, Physical, and Healing',
      )
    }
  }

  if (required != null) {
    lines.push(
      `Selection budget: ${selectionCount}/${required} psionic power${required === 1 ? '' : 's'}`,
    )
  }

  lines.push('Super psionics locked via Psychic Gate')
  return lines
}
