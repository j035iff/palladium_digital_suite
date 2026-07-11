import type { PalladiumOcc } from '../types'
import { getSkillBookCategories } from './creationSkillCatalog'
import {
  countFilledOccCoreVoucherSlots,
  findOpenOccCoreVoucherSlot,
  formatOccCoreVoucherCategoryScope,
  listOccCoreVoucherTasks,
  listEligibleVoucherSkillIds,
  resolveOccCoreVoucherLibraryBookCategories,
  type OccCoreVoucherTask,
} from './occCoreSkillVouchers'
import {
  countFilledRelatedVoucherSlots,
  formatRelatedVoucherHeader,
  getRelatedVoucherSlotPicks,
  isSkillEligibleForRelatedVoucher,
  listCreationVoucherRelatedTasks,
  listOccRelatedVoucherTasks,
  relatedVoucherNeedsClusterSelection,
  type OccRelatedVoucherTask,
} from './occRelatedSkillVouchers'

export type CreationVoucherTaskRef =
  | { kind: 'occ_core'; task: OccCoreVoucherTask }
  | { kind: 'related'; task: OccRelatedVoucherTask }

export type CreationVoucherAddTarget = {
  displayNumber: number
  taskId: string
  slot: number
  choiceCount: number
  kind: CreationVoucherTaskRef['kind']
}

/** Ordered creation voucher tasks (O.C.C. core + non-vocational related), including W.P. dropdown vouchers. */
export function listCreationVoucherTaskRefs(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): CreationVoucherTaskRef[] {
  if (!occ) return []
  const refs: CreationVoucherTaskRef[] = []
  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    refs.push({ kind: 'occ_core', task })
  }
  for (const task of listCreationVoucherRelatedTasks(
    listOccRelatedVoucherTasks(occ, specializationId),
  )) {
    refs.push({ kind: 'related', task })
  }
  return refs
}

/** Library +Voucher targets use the same task list as the selected panel. */
export function listLibraryCreationVoucherTaskRefs(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): CreationVoucherTaskRef[] {
  return listCreationVoucherTaskRefs(occ, specializationId)
}

export function creationVoucherDisplayName(displayNumber: number): string {
  return `Voucher ${displayNumber}`
}

export function resolveCreationVoucherDisplayNumber(
  taskId: string,
  refs: readonly CreationVoucherTaskRef[],
): number | undefined {
  const index = refs.findIndex((ref) => ref.task.id === taskId)
  return index >= 0 ? index + 1 : undefined
}

export function formatCreationVoucherScopeLabel(ref: CreationVoucherTaskRef): string {
  if (ref.kind === 'occ_core') {
    const { entry } = ref.task
    return entry.label?.trim() || formatOccCoreVoucherCategoryScope(entry)
  }
  const { entry } = ref.task
  if (entry.label?.trim()) return entry.label.trim()
  if (entry.allowedCategories?.length) {
    return entry.allowedCategories.join(', ')
  }
  if (entry.allowedSkillIds?.length) {
    return entry.allowedSkillIds.join(' or ')
  }
  return 'Voucher skills'
}

export function formatCreationVoucherProgressLabel(
  ref: CreationVoucherTaskRef,
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
): string {
  const filled =
    ref.kind === 'occ_core'
      ? countFilledOccCoreVoucherSlots(ref.task, occCoreVoucherPicks)
      : countFilledRelatedVoucherSlots(ref.task, relatedVoucherPicks)
  const choiceCount = ref.task.entry.choiceCount
  return `(${filled}/${choiceCount})`
}

/** Scope line with counter, e.g. "Three Domestic skills (0/3)". */
export function formatCreationVoucherScopeWithProgress(
  ref: CreationVoucherTaskRef,
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters?: Readonly<Record<string, string>>,
): string {
  if (ref.kind === 'related' && ref.task.entry.clusterCategoryOptions?.length) {
    return formatRelatedVoucherHeader(
      ref.task.entry,
      countFilledRelatedVoucherSlots(ref.task, relatedVoucherPicks),
      relatedVoucherClusters?.[ref.task.id],
    )
  }
  return `${formatCreationVoucherScopeLabel(ref)} ${formatCreationVoucherProgressLabel(
    ref,
    occCoreVoucherPicks,
    relatedVoucherPicks,
  )}`
}

function refHasOpenSlots(
  ref: CreationVoucherTaskRef,
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined,
): boolean {
  const choiceCount = ref.task.entry.choiceCount
  if (ref.kind === 'occ_core') {
    return (
      countFilledOccCoreVoucherSlots(ref.task, occCoreVoucherPicks) < choiceCount
    )
  }
  if (
    relatedVoucherNeedsClusterSelection(
      ref.task.entry,
      relatedVoucherClusters,
      ref.task.id,
    )
  ) {
    return false
  }
  return (
    countFilledRelatedVoucherSlots(ref.task, relatedVoucherPicks) < choiceCount
  )
}

function collectBookCategoriesForRef(
  ref: CreationVoucherTaskRef,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
): string[] {
  const entry = ref.task.entry
  if (ref.kind === 'occ_core') {
    const libraryCats = resolveOccCoreVoucherLibraryBookCategories(entry)
    if (libraryCats.length) return libraryCats
  }
  if (entry.allowedCategories?.length) {
    return [...entry.allowedCategories]
  }
  if (entry.orCategoryBranches?.length) {
    return [...entry.orCategoryBranches]
  }
  if (entry.allowedSkillIds?.length) {
    const cats = new Set<string>()
    for (const skillId of entry.allowedSkillIds) {
      for (const cat of getSkillBookCategories(skillId)) cats.add(cat)
    }
    return [...cats]
  }
  if (ref.kind === 'occ_core') {
    const cats = new Set<string>()
    for (const skillId of listEligibleVoucherSkillIds(
      entry,
      hostGenreId,
      catalogSkillIds,
      forbiddenWpIds,
    )) {
      for (const cat of getSkillBookCategories(skillId)) cats.add(cat)
    }
    return [...cats]
  }
  return []
}

/** Book categories that still have at least one open voucher slot. */
export function collectOpenCreationVoucherBookCategories(
  refs: readonly CreationVoucherTaskRef[],
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
): Set<string> {
  const cats = new Set<string>()
  for (const ref of refs) {
    if (
      !refHasOpenSlots(
        ref,
        occCoreVoucherPicks,
        relatedVoucherPicks,
        relatedVoucherClusters,
      )
    ) {
      continue
    }
    for (const cat of collectBookCategoriesForRef(
      ref,
      hostGenreId,
      catalogSkillIds,
      forbiddenWpIds,
    )) {
      cats.add(cat)
    }
  }
  return cats
}

export function listOpenCreationVoucherAddTargets(
  skillId: string,
  refs: readonly CreationVoucherTaskRef[],
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
  activeFilterCategory?: string,
): CreationVoucherAddTarget[] {
  const targets: CreationVoucherAddTarget[] = []

  refs.forEach((ref, index) => {
    const displayNumber = index + 1
    if (ref.kind === 'occ_core') {
      const slot = findOpenOccCoreVoucherSlot(
        skillId,
        [ref.task],
        occCoreVoucherPicks,
        hostGenreId,
        catalogSkillIds,
        forbiddenWpIds,
      )
      if (!slot) return
      if (
        activeFilterCategory &&
        !collectBookCategoriesForRef(
          ref,
          hostGenreId,
          catalogSkillIds,
          forbiddenWpIds,
        ).includes(activeFilterCategory)
      ) {
        return
      }
      targets.push({
        displayNumber,
        taskId: slot.taskId,
        slot: slot.slot,
        choiceCount: slot.choiceCount,
        kind: 'occ_core',
      })
      return
    }

    if (
      !isSkillEligibleForRelatedVoucher(
        skillId,
        ref.task,
        occ,
        specializationId,
        relatedVoucherClusters,
        activeFilterCategory,
      )
    ) {
      return
    }
    const slots = getRelatedVoucherSlotPicks(
      relatedVoucherPicks,
      ref.task.id,
      ref.task.entry.choiceCount,
    )
    const slot = slots.findIndex((pick) => pick == null)
    if (slot < 0) return
    targets.push({
      displayNumber,
      taskId: ref.task.id,
      slot,
      choiceCount: ref.task.entry.choiceCount,
      kind: 'related',
    })
  })

  return targets
}
