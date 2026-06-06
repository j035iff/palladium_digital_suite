import type { EngineSkillDef } from '../data/library/skills'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { PalladiumOcc } from '../types'
import {
  isOccRelatedSkillAllowed,
  isSecondarySkillAllowed,
} from './occCreationDerivation'
import { isActiveFilterCategoryOccBlocked } from './occCategoryRuleDisplay'
import type { CreationSkillPick } from '../types'

export function newCreationSkillPickInstanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pick_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Legacy string id → pick (instance id equals skill id for non-parameterized rows). */
export function migrateSkillIdToPick(skillId: string): CreationSkillPick {
  return { instanceId: skillId, skillId }
}

function normalizePickList(
  picks: readonly CreationSkillPick[] | undefined,
  legacyIds: readonly string[] | undefined,
): CreationSkillPick[] {
  if (picks?.length) return [...picks]
  return (legacyIds ?? []).map(migrateSkillIdToPick)
}

export function getCreationRelatedPicks(
  character: Pick<
    CharacterRootStateLike,
    'creationRelatedSkillPicks' | 'creationRelatedSkillIds'
  >,
): CreationSkillPick[] {
  return normalizePickList(
    character.creationRelatedSkillPicks,
    character.creationRelatedSkillIds,
  )
}

export function getCreationSecondaryPicks(
  character: Pick<
    CharacterRootStateLike,
    'creationSecondarySkillPicks' | 'creationSecondarySkillIds'
  >,
): CreationSkillPick[] {
  return normalizePickList(
    character.creationSecondarySkillPicks,
    character.creationSecondarySkillIds,
  )
}

type CharacterRootStateLike = {
  creationRelatedSkillPicks?: readonly CreationSkillPick[]
  creationRelatedSkillIds?: readonly string[]
  creationSecondarySkillPicks?: readonly CreationSkillPick[]
  creationSecondarySkillIds?: readonly string[]
}

export function creationSkillPickSlotWeight(pick: CreationSkillPick): number {
  if (pick.grantedBySkillId) return 0
  return pick.professionalQuality ? 2 : 1
}

export function sumCreationSkillPickSlots(
  picks: readonly CreationSkillPick[],
): number {
  return picks.reduce((sum, p) => sum + creationSkillPickSlotWeight(p), 0)
}

export function flattenCreationSkillIds(
  picks: readonly CreationSkillPick[],
): string[] {
  return picks.map((p) => p.skillId)
}

export function creationSkillIdsSet(
  occIds: readonly string[],
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): Set<string> {
  return new Set([
    ...occIds,
    ...flattenCreationSkillIds(relatedPicks),
    ...flattenCreationSkillIds(secondaryPicks),
  ])
}

function normalizeSpecialization(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function skillRequiresSpecialization(skillId: string): boolean {
  const row = getPalladiumSkillCatalogEntryById(skillId)
  if (!row) return false
  if (row.requiresSpecialization) return true
  return row.specialization != null
}

export function skillAllowsMultipleInstances(skillId: string): boolean {
  const row = getPalladiumSkillCatalogEntryById(skillId)
  return row?.specialization?.allowsMultipleInstances === true
}

export function getSpecializationPrompt(skillId: string): string {
  const row = getPalladiumSkillCatalogEntryById(skillId)
  return row?.specialization?.prompt ?? 'Specify type'
}

/** Placeholder shown on parameterized O.C.C. grants before a type is chosen. */
export function occGrantSelectionPlaceholder(skillId: string): string {
  if (skillId === 'skill_language' || skillId === 'skill_literacy') {
    return 'Select Language'
  }
  const name = getPalladiumSkillCatalogEntryById(skillId)?.name ?? 'type'
  return `Select ${name}`
}

export function skillSupportsProfessionalQuality(skillId: string): boolean {
  const row = getPalladiumSkillCatalogEntryById(skillId)
  if (!row) return false
  if (row.repeatSelection) return true
  const inherit = row.categoryMechanicsInheritance?.repeatSelection?.mode
  return inherit === 'inherit' || inherit === 'append'
}

/** True when +Related/+Secondary must open a prompt (specialization and/or professional tier). */
export function skillNeedsPickDialog(
  skillId: string,
  existingPicks: readonly CreationSkillPick[],
): boolean {
  if (skillRequiresSpecialization(skillId)) return true
  if (!skillSupportsProfessionalQuality(skillId)) return false
  const existing = findMatchingCreationSkillPick(existingPicks, skillId)
  if (existing?.professionalQuality) return false
  return true
}

export function professionalQualityLabel(skillId: string): string {
  const row = getPalladiumSkillCatalogEntryById(skillId)
  const rank2 = row?.repeatSelection?.ranks?.find((r) => r.selectionNumber === 2)
  return rank2?.label ?? 'Professional Quality'
}

export function resolveProfessionalPercentBonus(
  skillId: string,
  pick?: CreationSkillPick,
): number {
  if (!pick?.professionalQuality) return 0
  const row = getPalladiumSkillCatalogEntryById(skillId)
  if (!row) return 0
  const rank2 = row.repeatSelection?.ranks?.find((r) => r.selectionNumber === 2)
  if (rank2?.skillPercentBonus != null) return rank2.skillPercentBonus
  if (row.categories.includes('Domestic')) return 10
  return 0
}

export function formatCreationSkillPickLabel(
  pick: CreationSkillPick,
  baseName?: string,
): string {
  const name = baseName ?? getPalladiumSkillCatalogEntryById(pick.skillId)?.name ?? pick.skillId
  let label = name
  const spec = pick.specialization?.trim()
  if (spec) label = `${name}: ${spec}`
  if (pick.professionalQuality) {
    label = `${label} (${professionalQualityLabel(pick.skillId)})`
  }
  return label
}

export function findMatchingCreationSkillPick(
  picks: readonly CreationSkillPick[],
  skillId: string,
  specialization?: string,
  excludeInstanceIds?: readonly string[],
): CreationSkillPick | undefined {
  const requiresSpec = skillRequiresSpecialization(skillId)
  const specNorm = normalizeSpecialization(specialization)
  const exclude = new Set(excludeInstanceIds ?? [])
  return picks.find((p) => {
    if (exclude.has(p.instanceId)) return false
    if (p.skillId !== skillId) return false
    if (requiresSpec) {
      return normalizeSpecialization(p.specialization) === specNorm
    }
    return true
  })
}

export function findConditionalGrantPick(
  picks: readonly CreationSkillPick[],
  skillId: string,
): CreationSkillPick | undefined {
  return picks.find((p) => p.skillId === skillId && p.grantedBySkillId)
}

/** Same skill + specialization already chosen (ignores conditional grant placeholders). */
export function isCreationSkillIdentityTaken(
  allPicks: readonly CreationSkillPick[],
  skillId: string,
  specialization?: string,
  excludeInstanceIds?: readonly string[],
): boolean {
  const match = findMatchingCreationSkillPick(
    allPicks,
    skillId,
    specialization,
    excludeInstanceIds,
  )
  if (!match) return false
  return match.grantedBySkillId == null
}

export function findDuplicateSkillIdentityKeys(
  picks: readonly CreationSkillPick[],
): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const pick of picks) {
    const key = creationSkillPickIdentityKey(pick)
    if (seen.has(key)) duplicates.push(key)
    seen.add(key)
  }
  return duplicates
}

export function isCreationSkillFullySelected(
  skillId: string,
  occPicks: readonly CreationSkillPick[],
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): boolean {
  if (skillAllowsMultipleInstances(skillId) || skillRequiresSpecialization(skillId)) {
    return false
  }
  const allPicks = [...occPicks, ...relatedPicks, ...secondaryPicks]
  const existing = findMatchingCreationSkillPick(allPicks, skillId)
  if (!existing) return false
  if (existing.grantedBySkillId) return false
  if (skillSupportsProfessionalQuality(skillId) && !existing.professionalQuality) {
    return false
  }
  return true
}

export function resolveSelectionTierForPick(
  pick: CreationSkillPick,
  occSkillIds: readonly string[],
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): 'occ' | 'related' | 'secondary' | undefined {
  if (occSkillIds.includes(pick.skillId)) return 'occ'
  if (relatedPicks.some((p) => p.instanceId === pick.instanceId)) return 'related'
  if (secondaryPicks.some((p) => p.instanceId === pick.instanceId)) return 'secondary'
  return undefined
}

/** Slots consumed by a new pick or upgrade (1 for amateur, 2 for professional from scratch, 1 to upgrade). */
export function additionalSlotsForSkillAdd(
  existing: CreationSkillPick | undefined,
  professionalQuality: boolean,
): number {
  if (existing) {
    if (existing.professionalQuality) return 0
    return professionalQuality ? 1 : 0
  }
  return professionalQuality ? 2 : 1
}

export function validateSpecializationInput(value: string): boolean {
  return value.trim().length >= 1
}

export function buildCreationSkillPick(
  skillId: string,
  opts: { specialization?: string; professionalQuality?: boolean },
): CreationSkillPick {
  return {
    instanceId: newCreationSkillPickInstanceId(),
    skillId,
    ...(opts.specialization?.trim()
      ? { specialization: opts.specialization.trim() }
      : {}),
    ...(opts.professionalQuality ? { professionalQuality: true } : {}),
  }
}

export function upgradePickToProfessional(
  pick: CreationSkillPick,
): CreationSkillPick {
  return { ...pick, professionalQuality: true }
}

export function downgradePickToStandard(
  pick: CreationSkillPick,
): CreationSkillPick {
  const { professionalQuality: _removed, ...rest } = pick
  return rest
}

/** Extra related slots when an O.C.C. core grant/voucher is professional (base grant is free). */
export function occCoreProfessionalRelatedSlotSurcharge(
  pick: CreationSkillPick,
): number {
  if (!pick.professionalQuality) return 0
  if (!skillSupportsProfessionalQuality(pick.skillId)) return 0
  return 1
}

export function sumOccCoreProfessionalRelatedSlotSurcharges(
  occPicks: readonly CreationSkillPick[],
): number {
  return occPicks.reduce(
    (sum, pick) => sum + occCoreProfessionalRelatedSlotSurcharge(pick),
    0,
  )
}

export function sumRelatedPoolSlotUsage(
  relatedPicks: readonly CreationSkillPick[],
  occPicks: readonly CreationSkillPick[],
  handToHandReserved = 0,
): number {
  return (
    sumCreationSkillPickSlots(relatedPicks) +
    handToHandReserved +
    sumOccCoreProfessionalRelatedSlotSurcharges(occPicks)
  )
}

/** Stable identity for duplicate detection (skill + specialization, case-insensitive). */
export function creationSkillPickIdentityKey(pick: CreationSkillPick): string {
  const spec = pick.specialization?.trim().toLowerCase() ?? ''
  return `${pick.skillId}::${spec}`
}

export function normalizeVoucherSlotArray(
  raw: unknown,
): (CreationSkillPick | null)[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    if (item == null) return null
    if (typeof item === 'string') return migrateSkillIdToPick(item)
    return item as CreationSkillPick
  })
}

/** Non-null voucher slot picks (legacy flat list migration). */
export function getOccCoreVoucherPicks(
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  voucherId: string,
): CreationSkillPick[] {
  return normalizeVoucherSlotArray(voucherPicks?.[voucherId]).filter(
    (p): p is CreationSkillPick => p != null,
  )
}

export function getOccCoreVoucherSlotPicks(
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  voucherId: string,
  choiceCount: number,
): (CreationSkillPick | null)[] {
  const slots = normalizeVoucherSlotArray(voucherPicks?.[voucherId])
  return Array.from({ length: choiceCount }, (_, i) => slots[i] ?? null)
}

/** O.C.C. core vouchers only need specialization prompts (no professional tier). */
export function skillNeedsVoucherPickDialog(skillId: string): boolean {
  return skillRequiresSpecialization(skillId)
}

export function occGrantPickComplete(pick: CreationSkillPick | undefined): boolean {
  if (!pick) return false
  if (!skillRequiresSpecialization(pick.skillId)) return true
  return validateSpecializationInput(pick.specialization ?? '')
}

/** Locked picks with a user-defined specialization string can be edited in place. */
export function creationSkillPickHasEditableSpecialization(
  pick: CreationSkillPick,
): boolean {
  if (!skillRequiresSpecialization(pick.skillId)) return false
  return validateSpecializationInput(pick.specialization ?? '')
}

export type CreationLibrarySkillContext = {
  effectiveOcc: PalladiumOcc | null | undefined
  specializationId: string | null | undefined
  relatedSlotsUsed: number
  relatedSkillCap: number
  secondaryPickSlots: number
  secondaryCap: number
  occPicks: readonly CreationSkillPick[]
  relatedPicks: readonly CreationSkillPick[]
  secondaryPicks: readonly CreationSkillPick[]
  /** Active library category filter — gates availability per category. */
  activeFilterCategory?: string
  /** When set, skills blocked for the active race surface this reason. */
  raceBlocked?: boolean
}

export function creationLibrarySkillAddState(
  def: EngineSkillDef,
  opts: CreationLibrarySkillContext,
): {
  picked: boolean
  canAddRelated: boolean
  canAddSecondary: boolean
} {
  const picked = isCreationSkillFullySelected(
    def.id,
    opts.occPicks,
    opts.relatedPicks,
    opts.secondaryPicks,
  )
  const relFull = opts.relatedSlotsUsed >= opts.relatedSkillCap
  const secFull = opts.secondaryPickSlots >= opts.secondaryCap
  const relatedBlocked =
    def.slotKind === 'occ_related' &&
    opts.effectiveOcc != null &&
    !isOccRelatedSkillAllowed(
      opts.effectiveOcc,
      def.id,
      def.category,
      opts.specializationId,
      opts.activeFilterCategory,
    )
  const secondaryBlocked =
    def.secondaryEligible &&
    opts.effectiveOcc != null &&
    !isSecondarySkillAllowed(
      opts.effectiveOcc,
      def.id,
      def.category,
      opts.specializationId,
      opts.activeFilterCategory,
    )
  const raceBlocked = opts.raceBlocked === true
  const canAddRelated =
    def.slotKind === 'occ_related' &&
    !picked &&
    !relFull &&
    !relatedBlocked &&
    !raceBlocked
  const canAddSecondary =
    def.secondaryEligible &&
    !picked &&
    !secFull &&
    !secondaryBlocked &&
    !raceBlocked
  return { picked, canAddRelated, canAddSecondary }
}

export function isCreationLibrarySkillSelectable(
  def: EngineSkillDef,
  opts: CreationLibrarySkillContext,
): boolean {
  const { canAddRelated, canAddSecondary } = creationLibrarySkillAddState(def, opts)
  return canAddRelated || canAddSecondary
}

export function resolveCreationLibrarySkillBlockReason(
  def: EngineSkillDef,
  opts: CreationLibrarySkillContext,
): string {
  const { picked, canAddRelated, canAddSecondary } = creationLibrarySkillAddState(
    def,
    opts,
  )
  if (canAddRelated || canAddSecondary) return ''

  if (picked) return 'Already selected'
  if (opts.raceBlocked) return 'Not available to Race'

  if (
    isActiveFilterCategoryOccBlocked(opts.activeFilterCategory, opts.effectiveOcc)
  ) {
    return ''
  }

  const relFull = opts.relatedSlotsUsed >= opts.relatedSkillCap
  const secFull = opts.secondaryPickSlots >= opts.secondaryCap
  const hasRelated = def.slotKind === 'occ_related'
  const hasSecondary = def.secondaryEligible
  const relatedBlocked =
    hasRelated &&
    opts.effectiveOcc != null &&
    !isOccRelatedSkillAllowed(
      opts.effectiveOcc,
      def.id,
      def.category,
      opts.specializationId,
      opts.activeFilterCategory,
    )
  const secondaryBlocked =
    hasSecondary &&
    opts.effectiveOcc != null &&
    !isSecondarySkillAllowed(
      opts.effectiveOcc,
      def.id,
      def.category,
      opts.specializationId,
      opts.activeFilterCategory,
    )

  if (
    (hasRelated && relatedBlocked && (!hasSecondary || secondaryBlocked)) ||
    (hasSecondary && secondaryBlocked && (!hasRelated || relatedBlocked))
  ) {
    return 'Not available to O.C.C.'
  }

  if (hasRelated && relFull && (!hasSecondary || secFull)) {
    return 'No O.C.C. related slots available'
  }
  if (hasSecondary && secFull && (!hasRelated || relFull)) {
    return 'No secondary slots available'
  }

  return 'Not available'
}
