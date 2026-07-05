import { getAbilityById } from '../data/abilityLibrary'
import { getFeatureById } from '../data/library/registry'
import type { Feature, PalladiumOcc } from '../types'
import {
  gatePoolsForFeature,
  PSYCHIC_GATE_POOL_CATEGORIES,
  type PsychicGatePoolCategory,
} from './psychicGatePsionicBudget'
import { normalizePsionicCategoryId, psionicCategoriesForFeature } from './occCreationDerivation'
import type {
  OccSupernaturalCreationSelectionStep,
  OccSupernaturalPerLevelSelection,
  OccSupernaturalSelectionMode,
  OccSupernaturalSelectionModeSingleCategory,
  OccSupernaturalEngineSelectionFields,
} from '../types'

const POOL_CATEGORY_LABELS: Record<string, string> = {
  sensitive: 'Sensitive',
  physical: 'Physical',
  healer: 'Healing',
  healing: 'Healing',
  super: 'Super',
}

export function supernaturalSelectionModeRequiredPicks(
  mode: OccSupernaturalSelectionMode,
): number {
  switch (mode.kind) {
    case 'pool':
    case 'single_category':
      return mode.selections
    case 'per_category':
      return Object.values(mode.buckets).reduce((sum, n) => sum + n, 0)
    default:
      return 0
  }
}

export function sumCreationSelectionPlanPicks(
  plan: readonly OccSupernaturalCreationSelectionStep[] | undefined,
): number {
  if (!plan?.length) return 0
  return plan.reduce(
    (sum, step) => sum + supernaturalSelectionModeRequiredPicks(step.selectionMode),
    0,
  )
}

export function perLevelSelectionTotalThroughLevel(
  rule: OccSupernaturalPerLevelSelection | undefined,
  maxLevel: number,
): number {
  if (!rule || maxLevel < rule.fromLevel) return 0
  const end = rule.toLevel ?? maxLevel
  const cappedEnd = Math.min(end, maxLevel)
  const levels = Math.max(0, cappedEnd - rule.fromLevel + 1)
  return levels * rule.selectionsGained
}

export function occEngineHasStructuredSelectionPlan(
  engine: OccSupernaturalEngineSelectionFields | undefined,
): boolean {
  return (engine?.creationSelectionPlan?.length ?? 0) > 0
}

export function occIspCreationSelectionPlan(
  occ: PalladiumOcc | undefined,
): readonly OccSupernaturalCreationSelectionStep[] | undefined {
  return occ?.ispEngine?.creationSelectionPlan
}

export function occIspPerLevelSelection(
  occ: PalladiumOcc | undefined,
): OccSupernaturalPerLevelSelection | undefined {
  return occ?.ispEngine?.perLevelSelection
}

/** 1st-level psionic pick budget from structured plan or legacy roadmap. */
export function occCreationPsionicSlotBudget(occ: PalladiumOcc | undefined): number {
  const plan = occIspCreationSelectionPlan(occ)
  if (plan?.length) return sumCreationSelectionPlanPicks(plan)
  if (!occ?.ispEngine?.progressionRoadmap?.length) return 0
  return occ.ispEngine.progressionRoadmap
    .filter((s) => s.level <= 1)
    .reduce((sum, s) => sum + s.selectionsGained, 0)
}

export function occEnginePsionicRulesApply(occ: PalladiumOcc | undefined): boolean {
  return occCreationPsionicSlotBudget(occ) > 0
}

function normalizePoolCategory(raw: string): string {
  return normalizePsionicCategoryId(raw)
}

function poolLabel(category: string): string {
  return POOL_CATEGORY_LABELS[category] ?? category
}

function featureMatchesPool(
  feature: Feature,
  pool: string,
  genreId: string,
): boolean {
  const pools = psionicCategoriesForFeature(feature, genreId).map(normalizePoolCategory)
  return pools.includes(normalizePoolCategory(pool))
}

export type StructuredPsionicSelection = {
  id: string
  pool: string
  planIndex: number
}

export type OccPsionicPerCategoryBucket = {
  planIndex: number
  pool: string
  label: string
  cap: number
  pickIds: string[]
  filledCount: number
}

function excludeGrantedAbilityIds(
  selectedIds: readonly string[] | undefined | null,
  grantedIds?: readonly string[] | undefined,
): readonly string[] {
  if (!grantedIds?.length) return selectedIds ?? []
  const granted = new Set(grantedIds)
  return (selectedIds ?? []).filter((id) => !granted.has(id))
}

export function occEngineHasPerCategoryPsionicPlan(
  occ: PalladiumOcc | undefined,
): boolean {
  const plan = occIspCreationSelectionPlan(occ)
  return plan?.some((step) => step.selectionMode.kind === 'per_category') ?? false
}

export function listOccEnginePerCategoryBuckets(
  occ: PalladiumOcc | undefined,
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
  grantedIds?: readonly string[],
): OccPsionicPerCategoryBucket[] {
  const plan = occIspCreationSelectionPlan(occ)
  if (!plan?.length) return []

  const playerIds = excludeGrantedAbilityIds(selectedIds, grantedIds)
  const selections = listStructuredPsionicSelections(plan, playerIds, genreId)
  const out: OccPsionicPerCategoryBucket[] = []

  for (let planIndex = 0; planIndex < plan.length; planIndex++) {
    const step = plan[planIndex]
    if (step.selectionMode.kind !== 'per_category') continue
    for (const [pool, cap] of Object.entries(step.selectionMode.buckets)) {
      if (cap <= 0) continue
      const normalized = normalizePoolCategory(pool)
      const pickIds = selections
        .filter((s) => s.planIndex === planIndex && s.pool === normalized)
        .map((s) => s.id)
      out.push({
        planIndex,
        pool: normalized,
        label: poolLabel(pool),
        cap,
        pickIds,
        filledCount: pickIds.length,
      })
    }
  }

  return out
}

export function listStructuredPsionicSelections(
  plan: readonly OccSupernaturalCreationSelectionStep[],
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
  grantedIds?: readonly string[],
): StructuredPsionicSelection[] {
  const out: StructuredPsionicSelection[] = []
  for (const id of excludeGrantedAbilityIds(selectedIds, grantedIds)) {
    if (getAbilityById(id)?.category !== 'Psionic') continue
    const feature = getFeatureById(id)
    if (!feature) continue
    for (let planIndex = 0; planIndex < plan.length; planIndex++) {
      const step = plan[planIndex]
      const mode = step.selectionMode
      if (mode.kind === 'per_category') {
        for (const [pool, count] of Object.entries(mode.buckets)) {
          if (count > 0 && featureMatchesPool(feature, pool, genreId)) {
            out.push({ id, pool: normalizePoolCategory(pool), planIndex })
            break
          }
        }
      } else if (mode.kind === 'pool') {
        if (
          mode.categories.some((c) => featureMatchesPool(feature, c, genreId))
        ) {
          out.push({ id, pool: 'pool', planIndex })
          break
        }
      } else if (mode.kind === 'single_category') {
        const pools = gatePoolsForFeature(feature, genreId)
        const locked = mode.categories
          .map(normalizePoolCategory)
          .find((c) => pools.includes(c as PsychicGatePoolCategory))
        if (locked) {
          out.push({ id, pool: locked, planIndex })
          break
        }
      }
    }
  }
  return out
}

function lockedSingleCategoryPool(
  mode: OccSupernaturalSelectionModeSingleCategory,
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
): string | null {
  const allowed = mode.categories.map(normalizePoolCategory)
  const poolLists: string[][] = []
  for (const id of selectedIds ?? []) {
    if (getAbilityById(id)?.category !== 'Psionic') continue
    const feature = getFeatureById(id)
    if (!feature) continue
    const pools = psionicCategoriesForFeature(feature, genreId)
      .map(normalizePoolCategory)
      .filter((p) => allowed.includes(p))
    if (pools.length > 0) poolLists.push(pools)
  }
  if (poolLists.length === 0) return null
  let current = new Set(poolLists[0])
  for (let i = 1; i < poolLists.length; i++) {
    const next = new Set(poolLists[i])
    current = new Set([...current].filter((p) => next.has(p)))
  }
  const intersection = [...current]
  return intersection.length === 1 ? intersection[0] : null
}

function countSelectionsForPlanStep(
  planIndex: number,
  _step: OccSupernaturalCreationSelectionStep,
  selections: readonly StructuredPsionicSelection[],
): number {
  return selections.filter((s) => s.planIndex === planIndex).length
}

function countPerCategoryBucket(
  planIndex: number,
  pool: string,
  selections: readonly StructuredPsionicSelection[],
): number {
  return selections.filter(
    (s) => s.planIndex === planIndex && s.pool === normalizePoolCategory(pool),
  ).length
}

export function formatSupernaturalSelectionModeLabel(
  mode: OccSupernaturalSelectionMode,
): string {
  switch (mode.kind) {
    case 'pool':
      return `${mode.selections} from any mix of ${mode.categories.map(poolLabel).join(', ')}`
    case 'per_category': {
      const parts = Object.entries(mode.buckets).map(
        ([pool, count]) => `${count} ${poolLabel(pool)}`,
      )
      return parts.join('; ')
    }
    case 'single_category':
      return `${mode.selections} from one category — ${mode.categories.map(poolLabel).join(', ')}`
    default:
      return 'Supernatural selection'
  }
}

export function formatCreationSelectionPlanLines(
  plan: readonly OccSupernaturalCreationSelectionStep[] | undefined,
): string[] {
  if (!plan?.length) return []
  return plan.map((step, index) => {
    const label = step.label?.trim()
    const modeLabel = formatSupernaturalSelectionModeLabel(step.selectionMode)
    return label ? `${label}: ${modeLabel}` : `Step ${index + 1}: ${modeLabel}`
  })
}

export function formatPerLevelSelectionLine(
  rule: OccSupernaturalPerLevelSelection | undefined,
): string | undefined {
  if (!rule) return undefined
  const modeLabel = formatSupernaturalSelectionModeLabel(rule.selectionMode)
  const range =
    rule.toLevel != null
      ? `levels ${rule.fromLevel}–${rule.toLevel}`
      : `level ${rule.fromLevel}+`
  const prefix = rule.label?.trim() ?? `Per level (${range})`
  return `${prefix}: +${rule.selectionsGained} ${modeLabel}`
}

export function occEnginePsionicPickAllowed(params: {
  occ?: PalladiumOcc
  selectedIds: readonly string[] | undefined | null
  candidateId: string
  genreId: string
  viewingCategory?: string | null
  grantedIds?: readonly string[]
}): { allowed: boolean; reason?: string } | null {
  const { occ, selectedIds, candidateId, genreId, viewingCategory, grantedIds } =
    params
  const plan = occIspCreationSelectionPlan(occ)
  if (!plan?.length) return null

  const feature = getFeatureById(candidateId)
  if (!feature) return { allowed: false, reason: 'Unknown psionic power.' }

  const candidatePools = psionicCategoriesForFeature(feature, genreId).map(
    normalizePoolCategory,
  )
  if (candidatePools.length === 0) {
    return { allowed: false, reason: 'Not listed in this genre psionic catalog.' }
  }

  const viewingPool = viewingCategory
    ? normalizePoolCategory(viewingCategory)
    : null
  if (viewingPool && !candidatePools.includes(viewingPool)) {
    return {
      allowed: false,
      reason: 'Not listed in this psionic category for this genre.',
    }
  }

  const playerIds = excludeGrantedAbilityIds(selectedIds, grantedIds)
  const selections = listStructuredPsionicSelections(plan, playerIds, genreId)
  const already = playerIds.includes(candidateId)
  const totalCap = sumCreationSelectionPlanPicks(plan)
  if (!already && selections.length >= totalCap) {
    return { allowed: false, reason: 'O.C.C. psionic pick budget is full.' }
  }

  for (let planIndex = 0; planIndex < plan.length; planIndex++) {
    const step = plan[planIndex]
    const mode = step.selectionMode

    if (mode.kind === 'per_category') {
      const matchingBucket = Object.entries(mode.buckets).find(([pool]) =>
        candidatePools.includes(normalizePoolCategory(pool)),
      )
      if (!matchingBucket) continue
      const [pool, cap] = matchingBucket
      const normalized = normalizePoolCategory(pool)
      if (viewingPool && viewingPool !== normalized) {
        return {
          allowed: false,
          reason: `Open the ${poolLabel(normalized)} category to select this power.`,
        }
      }
      const used = countPerCategoryBucket(planIndex, normalized, selections)
      if (!already && used >= cap) {
        return {
          allowed: false,
          reason: `${poolLabel(normalized)} pick budget is full (${cap}).`,
        }
      }
      return { allowed: true }
    }

    if (mode.kind === 'pool') {
      const allowedPools = mode.categories.map(normalizePoolCategory)
      if (!candidatePools.some((p) => allowedPools.includes(p))) continue
      const used = countSelectionsForPlanStep(planIndex, step, selections)
      if (!already && used >= mode.selections) {
        return { allowed: false, reason: 'Mixed-category psionic pick budget is full.' }
      }
      return { allowed: true }
    }

    if (mode.kind === 'single_category') {
      const allowedPools = mode.categories.map(normalizePoolCategory)
      if (!candidatePools.some((p) => allowedPools.includes(p))) continue
      const locked = lockedSingleCategoryPool(mode, playerIds, genreId)
      if (locked) {
        if (!candidatePools.includes(locked)) {
          return {
            allowed: false,
            reason: `O.C.C. picks must all come from ${poolLabel(locked)}.`,
          }
        }
        if (viewingPool && viewingPool !== locked) {
          return {
            allowed: false,
            reason: `O.C.C. picks must all come from ${poolLabel(locked)}.`,
          }
        }
      }
      const used = countSelectionsForPlanStep(planIndex, step, selections)
      if (!already && used >= mode.selections) {
        return { allowed: false, reason: 'O.C.C. psionic pick budget is full.' }
      }
      return { allowed: true }
    }
  }

  return {
    allowed: false,
    reason: 'Power is outside this O.C.C. psionic selection plan.',
  }
}

export function formatOccEnginePsionicRequirementLabel(
  occ: PalladiumOcc | undefined,
  selectedIds: readonly string[] | undefined | null,
  genreId: string,
  grantedIds?: readonly string[],
): string {
  const plan = occIspCreationSelectionPlan(occ)
  if (!plan?.length) return 'Select psionic powers'

  const selections = listStructuredPsionicSelections(
    plan,
    selectedIds,
    genreId,
    grantedIds,
  )
  const playerIds = excludeGrantedAbilityIds(selectedIds, grantedIds)
  const total = selections.length
  const required = sumCreationSelectionPlanPicks(plan)
  const remaining = Math.max(0, required - total)

  if (remaining === 0) {
    return `Psionics selected (${total}/${required})`
  }

  const pending = plan
    .map((step, planIndex) => {
      const mode = step.selectionMode
      if (mode.kind === 'per_category') {
        return Object.entries(mode.buckets)
          .map(([pool, cap]) => {
            const used = countPerCategoryBucket(planIndex, pool, selections)
            const left = Math.max(0, cap - used)
            return left > 0 ? `${left} ${poolLabel(pool)}` : null
          })
          .filter(Boolean)
      }
      if (mode.kind === 'single_category') {
        const used = countSelectionsForPlanStep(planIndex, step, selections)
        const left = Math.max(0, mode.selections - used)
        if (left <= 0) return null
        const locked = lockedSingleCategoryPool(mode, playerIds, genreId)
        return locked
          ? `${left} more ${poolLabel(locked)}`
          : `${left} from one category (${mode.categories.map(poolLabel).join(', ')})`
      }
      const used = countSelectionsForPlanStep(planIndex, step, selections)
      const left = Math.max(0, mode.selections - used)
      return left > 0
        ? `${left} from ${mode.categories.map(poolLabel).join(', ')}`
        : null
    })
    .flat()
    .filter(Boolean)

  if (pending.length) {
    return `Select ${pending.join('; ')} (${total}/${required})`
  }
  return `Select ${remaining} more psionic${remaining === 1 ? '' : 's'} (${total}/${required})`
}

export function assessOccEnginePsionicBlockers(params: {
  occ?: PalladiumOcc
  selectedIds?: readonly string[] | null
  genreId?: string
  grantedIds?: readonly string[]
}): string[] {
  const { occ, selectedIds, genreId = 'nightbane', grantedIds } = params
  if (!occEnginePsionicRulesApply(occ)) return []

  const plan = occIspCreationSelectionPlan(occ)
  if (!plan?.length) return []

  const selections = listStructuredPsionicSelections(
    plan,
    selectedIds,
    genreId,
    grantedIds,
  )
  const required = sumCreationSelectionPlanPicks(plan)
  if (selections.length >= required) return []

  return [
    formatOccEnginePsionicRequirementLabel(occ, selectedIds, genreId, grantedIds),
  ]
}

export { PSYCHIC_GATE_POOL_CATEGORIES }
