import type {
  CreationSkillPick,
  OccRelatedSkillChoiceVoucher,
  PalladiumOcc,
} from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import {
  getOccCoreVoucherSlotPicks,
  isCreationSkillIdentityTaken,
} from './creationSkillPicks'
import { mapFilterCategoryToOccCategory } from './occCategoryRuleDisplay'
import { resolveEffectivePalladiumOcc } from './occComposition'
import {
  isOccRelatedSkillAllowed,
  isOccWeaponProficiencyForbidden,
} from './occCreationDerivation'

export type OccRelatedVoucherTask = {
  id: string
  entry: OccRelatedSkillChoiceVoucher
}

const WEAPON_PROFICIENCIES_CATEGORY = 'Weapon Proficiencies'

function pickMatchesCategory(skillId: string, categoryName: string): boolean {
  const occCategory = mapFilterCategoryToOccCategory(categoryName)
  const bookCategories = getPalladiumSkillCatalogEntryById(skillId)?.categories ?? []
  return bookCategories.some(
    (c) => c === categoryName || mapFilterCategoryToOccCategory(c) === occCategory,
  )
}

export function listOccRelatedVoucherTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccRelatedVoucherTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const vouchers = effective.occRelatedSkills.skillVouchers ?? []
  return vouchers.map((entry) => ({ id: entry.id, entry }))
}

export function sumRelatedVoucherReservedSlots(
  tasks: readonly OccRelatedVoucherTask[],
): number {
  return tasks.reduce((sum, task) => sum + task.entry.choiceCount, 0)
}

export function getRelatedVoucherSlotPicks(
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  voucherId: string,
  choiceCount: number,
): (CreationSkillPick | null)[] {
  return getOccCoreVoucherSlotPicks(voucherPicks, voucherId, choiceCount)
}

export function flattenRelatedVoucherPicks(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): CreationSkillPick[] {
  const out: CreationSkillPick[] = []
  for (const task of tasks) {
    const slots = getRelatedVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    for (const pick of slots) {
      if (pick) out.push(pick)
    }
  }
  return out
}

export function countFilledRelatedVoucherSlots(
  task: OccRelatedVoucherTask,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): number {
  return getRelatedVoucherSlotPicks(
    voucherPicks,
    task.id,
    task.entry.choiceCount,
  ).filter((p): p is CreationSkillPick => p != null).length
}

export function countAllFilledRelatedVoucherSlots(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): number {
  return tasks.reduce(
    (sum, task) => sum + countFilledRelatedVoucherSlots(task, voucherPicks),
    0,
  )
}

export function occRelatedVoucherPicksComplete(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
): boolean {
  if (!tasks.length) return true
  for (const task of tasks) {
    if (
      relatedVoucherNeedsClusterSelection(
        task.entry,
        clusterSelections,
        task.id,
      )
    ) {
      return false
    }
    if (
      countFilledRelatedVoucherSlots(task, voucherPicks) < task.entry.choiceCount
    ) {
      return false
    }
  }
  return true
}

export function findRelatedVoucherSlotForPick(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  instanceId: string,
): { taskId: string; slot: number; choiceCount: number } | undefined {
  for (const task of tasks) {
    const slots = getRelatedVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    const slot = slots.findIndex((p) => p?.instanceId === instanceId)
    if (slot >= 0) {
      return { taskId: task.id, slot, choiceCount: task.entry.choiceCount }
    }
  }
  return undefined
}

export function findRelatedVoucherPickForSkillId(
  skillId: string,
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): boolean {
  for (const task of tasks) {
    const slots = getRelatedVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    if (slots.some((p) => p?.skillId === skillId)) return true
  }
  return false
}

export function formatRelatedVoucherHeader(
  entry: OccRelatedSkillChoiceVoucher,
  filledCount: number,
  selectedCluster?: string,
): string {
  const bonus =
    entry.clusterBonusPercent != null && entry.clusterBonusPercent !== 0
      ? ` (+${entry.clusterBonusPercent}%)`
      : ''
  if (entry.clusterCategoryOptions?.length) {
    const cluster = selectedCluster?.trim()
    const scope = cluster
      ? `${cluster} specialty${bonus}`
      : entry.label?.trim() || 'Choose specialty category'
    return `${scope} ${filledCount}/${entry.choiceCount}`
  }
  if (entry.orCategoryBranches?.length) {
    const scope =
      entry.label?.trim() || entry.orCategoryBranches.join(' or ')
    return `${scope}${bonus} ${filledCount}/${entry.choiceCount}`
  }
  const scope =
    entry.label?.trim() ||
    entry.allowedCategories?.join(', ') ||
    entry.allowedSkillIds?.join(' or ') ||
    'Related voucher'
  return `${scope}${bonus} ${filledCount}/${entry.choiceCount}`
}

export function relatedVoucherNeedsClusterSelection(
  entry: OccRelatedSkillChoiceVoucher,
  clusterSelections: Readonly<Record<string, string>> | undefined,
  voucherId: string,
): boolean {
  if (!entry.clusterCategoryOptions?.length) return false
  const selected = clusterSelections?.[voucherId]?.trim()
  if (!selected) return true
  return !entry.clusterCategoryOptions.some(
    (c) => c.toLowerCase() === selected.toLowerCase(),
  )
}

function skillAllowedByVoucherScope(
  skillId: string,
  entry: OccRelatedSkillChoiceVoucher,
  selectedCluster: string | undefined,
): boolean {
  if (entry.allowedSkillIds?.length) {
    return entry.allowedSkillIds.some((id) => id === skillId)
  }
  if (entry.clusterCategoryOptions?.length) {
    const cluster = selectedCluster?.trim()
    if (!cluster) return false
    return pickMatchesCategory(skillId, cluster)
  }
  if (entry.orCategoryBranches?.length) {
    return entry.orCategoryBranches.some((branch) =>
      pickMatchesCategory(skillId, branch),
    )
  }
  if (entry.allowedCategories?.length) {
    return entry.allowedCategories.some((cat) => pickMatchesCategory(skillId, cat))
  }
  return true
}

/** Book category this skill satisfies for the active voucher scope (cluster / OR / fixed). */
function voucherCategoryForSkill(
  skillId: string,
  entry: OccRelatedSkillChoiceVoucher,
  selectedCluster: string | undefined,
): string | undefined {
  if (entry.clusterCategoryOptions?.length) {
    const cluster = selectedCluster?.trim()
    if (!cluster) return undefined
    return pickMatchesCategory(skillId, cluster) ? cluster : undefined
  }
  if (entry.orCategoryBranches?.length) {
    return entry.orCategoryBranches.find((branch) =>
      pickMatchesCategory(skillId, branch),
    )
  }
  if (entry.allowedCategories?.length) {
    return entry.allowedCategories.find((cat) => pickMatchesCategory(skillId, cat))
  }
  return undefined
}

/**
 * Related access for specialization voucher picks. Categories listed on the
 * voucher override `accessType: "none"` rules (book: "None, except as special
 * vocational training, above").
 */
function isOccRelatedSkillAllowedForSpecializationVoucher(
  occ: PalladiumOcc,
  skillId: string,
  entry: OccRelatedSkillChoiceVoucher,
  selectedCluster: string | undefined,
  specializationId: string | null | undefined,
  activeFilterCategory?: string,
): boolean {
  if (isOccWeaponProficiencyForbidden(occ, skillId, specializationId)) {
    return false
  }

  const voucherCategory = voucherCategoryForSkill(skillId, entry, selectedCluster)
  if (voucherCategory) {
    const effective = resolveEffectivePalladiumOcc(occ, specializationId)
    const occCategory = mapFilterCategoryToOccCategory(voucherCategory)
    const rule = effective.occRelatedSkills.categoryRules.find(
      (row) => row.categoryName === occCategory,
    )
    if (rule?.accessType === 'none') {
      return true
    }
  }

  return isOccRelatedSkillAllowed(
    occ,
    skillId,
    undefined,
    specializationId,
    activeFilterCategory,
  )
}

export function isSkillEligibleForRelatedVoucher(
  skillId: string,
  task: OccRelatedVoucherTask,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
  activeFilterCategory?: string,
): boolean {
  const { entry } = task
  if (relatedVoucherNeedsClusterSelection(entry, clusterSelections, task.id)) {
    return false
  }
  const selectedCluster = clusterSelections?.[task.id]
  if (!skillAllowedByVoucherScope(skillId, entry, selectedCluster)) {
    return false
  }
  const row = getPalladiumSkillCatalogEntryById(skillId)
  if (!row) return false
  return isOccRelatedSkillAllowedForSpecializationVoucher(
    occ,
    skillId,
    entry,
    selectedCluster,
    specializationId,
    activeFilterCategory,
  )
}

export function findOpenRelatedVoucherSlot(
  skillId: string,
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
  activeFilterCategory?: string,
): { taskId: string; slot: number; choiceCount: number } | undefined {
  for (const task of tasks) {
    if (
      !isSkillEligibleForRelatedVoucher(
        skillId,
        task,
        occ,
        specializationId,
        clusterSelections,
        activeFilterCategory,
      )
    ) {
      continue
    }
    const slots = getRelatedVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    const slot = slots.findIndex((p) => p == null)
    if (slot >= 0) {
      return { taskId: task.id, slot, choiceCount: task.entry.choiceCount }
    }
  }
  return undefined
}

export function canAddSkillViaRelatedVoucher(
  skillId: string,
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
  allPicks: readonly CreationSkillPick[],
  activeFilterCategory?: string,
): boolean {
  if (!occ) return false
  if (isCreationSkillIdentityTaken(allPicks, skillId)) return false
  return (
    findOpenRelatedVoucherSlot(
      skillId,
      tasks,
      voucherPicks,
      occ,
      specializationId,
      clusterSelections,
      activeFilterCategory,
    ) != null
  )
}

export function resolveRelatedVoucherSkillBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillId: string,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): number {
  if (!occ) return 0
  const tasks = listOccRelatedVoucherTasks(occ, specializationId)
  for (const task of tasks) {
    const slots = getRelatedVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    if (!slots.some((p) => p?.skillId === skillId)) continue
    if (
      task.entry.clusterBonusPercent != null &&
      task.entry.clusterBonusPercent !== 0
    ) {
      return task.entry.clusterBonusPercent
    }
  }
  return 0
}

export function assessRelatedSkillVoucherBlockers(
  occ: PalladiumOcc | undefined,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
  specializationId?: string | null,
): string[] {
  if (!occ) return []
  const tasks = listOccRelatedVoucherTasks(occ, specializationId)
  if (!tasks.length) return []

  const blockers: string[] = []
  for (const task of tasks) {
    const { entry } = task
    if (relatedVoucherNeedsClusterSelection(entry, clusterSelections, task.id)) {
      const label =
        entry.label?.trim() ||
        `Choose a specialty (${entry.clusterCategoryOptions?.join(', ')})`
      blockers.push(`${label} before selecting skills.`)
      continue
    }
    const filled = countFilledRelatedVoucherSlots(task, voucherPicks)
    if (filled >= entry.choiceCount) continue
    const remaining = entry.choiceCount - filled
    const header = formatRelatedVoucherHeader(
      entry,
      filled,
      clusterSelections?.[task.id],
    )
    blockers.push(
      `Select ${remaining} more vocational focus skill${remaining === 1 ? '' : 's'} for ${header}.`,
    )
  }
  return blockers
}

export function relatedVoucherUsesDedicatedPickerUi(
  entry: OccRelatedSkillChoiceVoucher,
): boolean {
  return (
    entry.allowedCategories?.length === 1 &&
    entry.allowedCategories[0] === WEAPON_PROFICIENCIES_CATEGORY
  )
}

/** Cluster / area-of-training vouchers (pick category first, then N skills). */
export function isVocationalFocusVoucherEntry(
  entry: OccRelatedSkillChoiceVoucher,
): boolean {
  return (entry.clusterCategoryOptions?.length ?? 0) > 0
}

export function isVocationalFocusVoucherTask(
  task: OccRelatedVoucherTask,
): boolean {
  return isVocationalFocusVoucherEntry(task.entry)
}

export function listVocationalFocusVoucherTasks(
  tasks: readonly OccRelatedVoucherTask[],
): OccRelatedVoucherTask[] {
  return tasks.filter(isVocationalFocusVoucherTask)
}

/** Related vouchers that are not vocational focus (category / OR / fixed picks). */
export function listCreationVoucherRelatedTasks(
  tasks: readonly OccRelatedVoucherTask[],
): OccRelatedVoucherTask[] {
  return tasks.filter((task) => !isVocationalFocusVoucherTask(task))
}

/** Pseudo library category for O.C.C. core + non-vocational related voucher picks. */
export const CREATION_VOUCHERS_LIBRARY_CATEGORY = 'Vouchers'

/** Pseudo library category for vocational-focus voucher picks (cluster / OR minimums). */
export const CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY = 'Vocational Focus'

/** @deprecated Use {@link CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY}. */
export const CREATION_SPECIALIZATION_LIBRARY_CATEGORY =
  CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

export function hasIncompleteVocationalFocusVouchers(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
): boolean {
  const vocational = listVocationalFocusVoucherTasks(tasks)
  if (!vocational.length) return false
  return !occRelatedVoucherPicksComplete(
    vocational,
    voucherPicks,
    clusterSelections,
  )
}

/** @deprecated Use {@link hasIncompleteVocationalFocusVouchers}. */
export function hasIncompleteSpecializationVouchers(
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
): boolean {
  return hasIncompleteVocationalFocusVouchers(
    tasks,
    voucherPicks,
    clusterSelections,
  )
}

export function collectVocationalFocusBookCategories(
  tasks: readonly OccRelatedVoucherTask[],
  clusterSelections: Readonly<Record<string, string>> | undefined,
): string[] {
  return collectSpecializationBookCategories(
    listVocationalFocusVoucherTasks(tasks),
    clusterSelections,
  )
}

/** @deprecated Use {@link collectVocationalFocusBookCategories}. */
export function collectSpecializationBookCategories(
  tasks: readonly OccRelatedVoucherTask[],
  clusterSelections: Readonly<Record<string, string>> | undefined,
): string[] {
  const cats = new Set<string>()
  for (const task of tasks) {
    const { entry } = task
    if (entry.clusterCategoryOptions?.length) {
      const selected = clusterSelections?.[task.id]?.trim()
      if (selected) {
        cats.add(selected)
      } else {
        for (const cat of entry.clusterCategoryOptions) cats.add(cat)
      }
    } else if (entry.orCategoryBranches?.length) {
      for (const cat of entry.orCategoryBranches) cats.add(cat)
    } else if (entry.allowedCategories?.length) {
      for (const cat of entry.allowedCategories) cats.add(cat)
    }
  }
  return [...cats]
}

export function isSkillInVocationalFocusLibraryScope(
  skillId: string,
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
): boolean {
  const vocational = listVocationalFocusVoucherTasks(tasks)
  if (findRelatedVoucherPickForSkillId(skillId, vocational, voucherPicks)) {
    return true
  }
  return (
    findOpenRelatedVoucherSlot(
      skillId,
      vocational,
      voucherPicks,
      occ,
      specializationId,
      clusterSelections,
    ) != null
  )
}

/** @deprecated Use {@link isSkillInVocationalFocusLibraryScope}. */
export function isSkillInSpecializationLibraryScope(
  skillId: string,
  tasks: readonly OccRelatedVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  clusterSelections: Readonly<Record<string, string>> | undefined,
): boolean {
  return isSkillInVocationalFocusLibraryScope(
    skillId,
    tasks,
    voucherPicks,
    occ,
    specializationId,
    clusterSelections,
  )
}
