import type {
  CharacterRootState,
  CreationSkillPick,
  OccCoreSkillChoiceVoucher,
  PalladiumOcc,
  WeaponProficiencyEra,
} from '../types'
import {
  getSkillBookCategories,
  voucherAllowedCategoryMatches,
  weaponProficiencyEraForSkillId,
} from './creationSkillCatalog'
import {
  creationSkillPickIdentityKey,
  findDuplicateSkillIdentityKeys,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  getOccCoreVoucherPicks,
  getOccCoreVoucherSlotPicks,
  isCreationSkillIdentityTaken,
  migrateSkillIdToPick,
  occGrantPickComplete,
  skillRequiresSpecialization,
} from './creationSkillPicks'
import { resolveCatalogSkillId, getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { skillHasTrait } from '../data/library/skillTraitRegistryLoader'
import {
  isOccCoreSkillChoiceVoucher,
  resolveEffectivePalladiumOcc,
} from './occComposition'
import type { OccRelatedVoucherTask } from './occRelatedSkillVouchers'
import {
  findRelatedVoucherPickForSkillId,
  flattenRelatedVoucherPicks,
  isVocationalFocusVoucherTask,
  listCreationVoucherRelatedTasks,
  listOccRelatedVoucherTasks,
  occRelatedVoucherPicksComplete,
  findOpenRelatedVoucherSlot,
} from './occRelatedSkillVouchers'
import { occStartingOccSkillIds } from './occCatalogEngine'
import { resolveCreationLibrarySkillSelectionTier } from './creationSkillPicks'
import {
  applyPsychicOccSkillBonusPercent,
  type PsychicTier,
} from './creationPsychicSkills'

export type OccCoreVoucherTask = {
  id: string
  voucherIndex: number
  entry: OccCoreSkillChoiceVoucher
}

const WEAPON_PROFICIENCIES_VOUCHER_CATEGORY = 'Weapon Proficiencies'

/** @deprecated All vouchers use the creation skill library (+ Voucher N). */
export function voucherUsesDedicatedPickerUi(
  _entry: OccCoreSkillChoiceVoucher,
): boolean {
  return false
}

/** Library filter categories for an O.C.C. core voucher (maps W.P. to WP: Ancient / Modern). */
export function resolveOccCoreVoucherLibraryBookCategories(
  entry: OccCoreSkillChoiceVoucher,
): string[] {
  if (
    entry.allowedCategories?.length === 1 &&
    entry.allowedCategories[0] === WEAPON_PROFICIENCIES_VOUCHER_CATEGORY
  ) {
    const lockedEra = resolveVoucherWeaponProficiencyEra(entry)
    if (lockedEra) {
      return [lockedEra === 'ancient' ? 'WP: Ancient' : 'WP: Modern']
    }
    return ['WP: Ancient', 'WP: Modern']
  }
  if (entry.allowedCategories?.length) {
    return [...entry.allowedCategories]
  }
  return []
}

/** O.C.C.-mandated W.P. era when set; undefined means the player may choose ancient or modern. */
export function resolveVoucherWeaponProficiencyEra(
  entry: OccCoreSkillChoiceVoucher,
): WeaponProficiencyEra | undefined {
  return entry.weaponProficiencyEra
}

export function formatOccCoreVoucherCategoryScope(
  entry: OccCoreSkillChoiceVoucher,
): string {
  if (
    entry.weaponProficiencyEra &&
    entry.allowedCategories?.includes(WEAPON_PROFICIENCIES_VOUCHER_CATEGORY)
  ) {
    const eraLabel =
      entry.weaponProficiencyEra === 'ancient' ? 'Ancient' : 'Modern'
    return `${eraLabel} Weapon Proficiencies`
  }
  if (entry.allowedSkillTraits?.length) {
    const scope = entry.allowedSkillTraits
      .map((id) => id.replace(/_/g, ' '))
      .join(', ')
    return scope
  }
  if (entry.allowedCategories?.length) {
    return entry.allowedCategories.join(', ')
  }
  if (entry.label) return entry.label
  if (entry.allowedSkillIds?.length) {
    return entry.allowedSkillIds.join(' or ')
  }
  return 'O.C.C. choices'
}

export function formatOccCoreVoucherGroupHeader(
  entry: OccCoreSkillChoiceVoucher,
  filledCount: number,
): string {
  const bonus =
    entry.bonusPercent != null && entry.bonusPercent !== 0
      ? ` +${entry.bonusPercent}%`
      : ''
  return `${formatOccCoreVoucherCategoryScope(entry)}${bonus} ${filledCount}/${entry.choiceCount}`
}

export function countFilledOccCoreVoucherSlots(
  task: OccCoreVoucherTask,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): number {
  return getOccCoreVoucherSlotPicks(
    voucherPicks,
    task.id,
    task.entry.choiceCount,
  ).filter((pick): pick is CreationSkillPick => pick != null).length
}

export function catalogSkillIdsMatch(a: string, b: string): boolean {
  return resolveCatalogSkillId(a) === resolveCatalogSkillId(b)
}

export function isOccCorePickForLibrarySkill(
  librarySkillId: string,
  pick: CreationSkillPick,
): boolean {
  return (
    pick.grantedBySkillId == null &&
    catalogSkillIdsMatch(pick.skillId, librarySkillId)
  )
}

export function findOccCoreVoucherPickForSkillId(
  skillId: string,
  tasks: readonly OccCoreVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): {
  task: OccCoreVoucherTask
  slot: number
  pick: CreationSkillPick
} | null {
  for (const task of tasks) {
    const slots = getOccCoreVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    for (let slot = 0; slot < slots.length; slot++) {
      const pick = slots[slot]
      if (pick && catalogSkillIdsMatch(pick.skillId, skillId)) {
        return { task, slot, pick }
      }
    }
  }
  return null
}

export function resolveCreationLibrarySkillTier(
  librarySkillId: string,
  opts: {
    relatedPicks: readonly CreationSkillPick[]
    secondaryPicks: readonly CreationSkillPick[]
    resolvedOccPicks: readonly CreationSkillPick[]
    voucherTasks: readonly OccCoreVoucherTask[]
    voucherPicks: Readonly<Record<string, unknown>> | undefined
    relatedVoucherTasks?: readonly OccRelatedVoucherTask[]
    relatedVoucherPicks?: Readonly<Record<string, unknown>> | undefined
  },
): 'occ' | 'voucher' | 'specialization' | 'related' | 'secondary' | undefined {
  const userTier = resolveCreationLibrarySkillSelectionTier(librarySkillId, opts)
  if (userTier) return userTier
  if (opts.relatedVoucherTasks?.length) {
    for (const task of opts.relatedVoucherTasks) {
      const slots = getOccCoreVoucherSlotPicks(
        opts.relatedVoucherPicks,
        task.id,
        task.entry.choiceCount,
      )
      if (slots.some((pick) => pick && catalogSkillIdsMatch(pick.skillId, librarySkillId))) {
        return isVocationalFocusVoucherTask(task)
          ? 'specialization'
          : 'voucher'
      }
    }
  }
  if (
    findOccCoreVoucherPickForSkillId(
      librarySkillId,
      opts.voucherTasks,
      opts.voucherPicks,
    )
  ) {
    return 'voucher'
  }
  if (
    opts.resolvedOccPicks.some((pick) =>
      isOccCorePickForLibrarySkill(librarySkillId, pick),
    )
  ) {
    return 'occ'
  }
  return undefined
}

export function findOpenOccCoreVoucherSlot(
  skillId: string,
  tasks: readonly OccCoreVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
): { taskId: string; slot: number; choiceCount: number } | null {
  for (const task of tasks) {
    if (
      !listEligibleVoucherSkillIds(
        task.entry,
        hostGenreId,
        catalogSkillIds,
        forbiddenWpIds,
      ).includes(skillId)
    ) {
      continue
    }
    const slots = getOccCoreVoucherSlotPicks(
      voucherPicks,
      task.id,
      task.entry.choiceCount,
    )
    const slot = slots.findIndex((pick) => pick == null)
    if (slot >= 0) {
      return {
        taskId: task.id,
        slot,
        choiceCount: task.entry.choiceCount,
      }
    }
  }
  return null
}

export function canAddSkillViaOccCoreVoucher(
  skillId: string,
  tasks: readonly OccCoreVoucherTask[],
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  allPicks: readonly CreationSkillPick[],
  forbiddenWpIds: readonly string[] = [],
): boolean {
  if (findOccCoreVoucherPickForSkillId(skillId, tasks, voucherPicks) != null) {
    return false
  }
  if (
    findOpenOccCoreVoucherSlot(
      skillId,
      tasks,
      voucherPicks,
      hostGenreId,
      catalogSkillIds,
      forbiddenWpIds,
    ) == null
  ) {
    return false
  }
  return !isCreationSkillIdentityTaken(allPicks, skillId)
}

export function resolveOccCoreVoucherEntryBonus(
  entry: OccCoreSkillChoiceVoucher,
  skillId: string,
): number {
  const override = entry.skillSpecificOverrides?.[skillId]
  if (typeof override === 'number') return override
  return entry.bonusPercent ?? 0
}

/** O.C.C. core voucher % for a resolved pick (creation preview + spawn handoff). */
export function resolveOccCoreVoucherSkillBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillId: string,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  psychicTier: PsychicTier,
): number {
  if (!occ) return 0
  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    const picks = getOccCoreVoucherPicks(voucherPicks, task.id)
    if (picks.some((pick) => catalogSkillIdsMatch(pick.skillId, skillId))) {
      return applyPsychicOccSkillBonusPercent(
        resolveOccCoreVoucherEntryBonus(task.entry, skillId),
        psychicTier,
      )
    }
  }
  return 0
}

export function listOccCoreVoucherTasks(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): OccCoreVoucherTask[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const tasks: OccCoreVoucherTask[] = []
  effective.occSkillsCore.forEach((entry, index) => {
    if (!isOccCoreSkillChoiceVoucher(entry)) return
    tasks.push({
      id: `core_voucher_${index}`,
      voucherIndex: index,
      entry,
    })
  })
  return tasks
}

function skillMatchesVoucher(
  skillId: string,
  entry: OccCoreSkillChoiceVoucher,
  _hostGenreId: string,
  libraryIds: ReadonlySet<string>,
): boolean {
  if (!libraryIds.has(skillId)) return false

  if (entry.allowedSkillTraits?.length) {
    const row = getPalladiumSkillCatalogEntryById(skillId)
    if (!row) return false
    const hasTrait = entry.allowedSkillTraits.some((traitId) =>
      skillHasTrait(row, traitId),
    )
    if (!hasTrait) return false
  }

  if (entry.allowedSkillIds?.length) {
    if (!entry.allowedSkillIds.includes(skillId)) return false
  } else if (entry.allowedCategories?.length) {
    const cats = getSkillBookCategories(skillId)
    const categoryMatch = entry.allowedCategories.some((c) =>
      voucherAllowedCategoryMatches(c, skillId, cats),
    )
    if (!categoryMatch) return false
  } else if (!entry.allowedSkillTraits?.length) {
    return false
  }

  const lockedEra = resolveVoucherWeaponProficiencyEra(entry)
  if (lockedEra) {
    return weaponProficiencyEraForSkillId(skillId) === lockedEra
  }

  return true
}

export function eligibleSkillIdsForVoucher(
  entry: OccCoreSkillChoiceVoucher,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
): string[] {
  return listEligibleVoucherSkillIds(entry, hostGenreId, catalogSkillIds)
}

/** All catalog skill ids eligible for a voucher (genre + category/skill filters). */
export function listEligibleVoucherSkillIds(
  entry: OccCoreSkillChoiceVoucher,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
): string[] {
  const libraryIds = new Set(catalogSkillIds)
  const forbidden = new Set(forbiddenWpIds)
  return catalogSkillIds.filter(
    (id) =>
      !forbidden.has(id) &&
      skillMatchesVoucher(id, entry, hostGenreId, libraryIds),
  )
}

function voucherSlotPicksValid(picks: readonly CreationSkillPick[]): boolean {
  if (!picks.length) return false
  const keys = picks.map(creationSkillPickIdentityKey)
  if (new Set(keys).size !== keys.length) return false
  return picks.every((p) => occGrantPickComplete(p))
}

export function occCoreVoucherPicksComplete(
  tasks: readonly OccCoreVoucherTask[],
  picks: Readonly<Record<string, unknown>>,
): boolean {
  return tasks.every((t) => {
    const slots = getOccCoreVoucherSlotPicks(picks, t.id, t.entry.choiceCount)
    const chosen = slots.filter((p): p is CreationSkillPick => p != null)
    return slots.length === t.entry.choiceCount && voucherSlotPicksValid(chosen)
  })
}

export function occCoreGrantSpecializationsComplete(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  grantDetails: Readonly<Record<string, CreationSkillPick>> | undefined,
): boolean {
  if (!occ) return true
  const grants = occStartingOccSkillIds(occ, specializationId).filter(
    skillRequiresSpecialization,
  )
  return grants.every((skillId) =>
    occGrantPickComplete(grantDetails?.[skillId] ?? migrateSkillIdToPick(skillId)),
  )
}

export function assessOccCoreVoucherBlockers(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  picks: Readonly<Record<string, unknown>>,
  grantDetails?: Readonly<Record<string, CreationSkillPick>>,
  character?: Pick<
    CharacterRootState,
    | 'creationRelatedSkillPicks'
    | 'creationRelatedSkillIds'
    | 'creationSecondarySkillPicks'
    | 'creationSecondarySkillIds'
    | 'creationOccCoreVoucherPicks'
    | 'creationOccGrantPickDetails'
    | 'occSpecializationId'
  >,
): string[] {
  const blockers: string[] = []
  const tasks = listOccCoreVoucherTasks(occ, specializationId)
  if (tasks.length && !occCoreVoucherPicksComplete(tasks, picks)) {
    const pending = tasks.filter((t) => {
      const slots = getOccCoreVoucherSlotPicks(picks, t.id, t.entry.choiceCount)
      return slots.some((p) => p == null) || !voucherSlotPicksValid(
        slots.filter((x): x is CreationSkillPick => x != null),
      )
    })
    blockers.push(
      `Resolve voucher skill choices (${pending.length} voucher${pending.length === 1 ? '' : 's'} remaining).`,
    )
  }
  if (!occCoreGrantSpecializationsComplete(occ, specializationId, grantDetails)) {
    blockers.push(
      'Specify written language / type for parameterized O.C.C. core skills (e.g. Literacy).',
    )
  }
  const allPicks = character
    ? collectAllCreationSkillPicks(
        {
          ...character,
          creationOccCoreVoucherPicks: picks as CharacterRootState['creationOccCoreVoucherPicks'],
          creationOccGrantPickDetails: grantDetails,
        },
        occ,
      )
    : resolveOccCoreSkillPicks(occ, specializationId, picks, grantDetails)
  if (findDuplicateSkillIdentityKeys(allPicks).length > 0) {
    blockers.push(
      'Remove duplicate skill selections (same skill and type chosen more than once).',
    )
  }
  return blockers
}

/** Fixed grants + voucher slots as picks (for display and spawn). */
export function resolveOccCoreSkillPicks(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  grantDetails: Readonly<Record<string, CreationSkillPick>> | undefined,
): CreationSkillPick[] {
  if (!occ) return []
  const grantIds = occStartingOccSkillIds(occ, specializationId)
  const grantPicks = grantIds.map((skillId) => {
    const detail = grantDetails?.[skillId]
    if (detail) return detail
    return migrateSkillIdToPick(skillId)
  })
  const voucherSlotPicks = listOccCoreVoucherTasks(occ, specializationId).flatMap(
    (t) => getOccCoreVoucherPicks(voucherPicks, t.id),
  )
  return [...grantPicks, ...voucherSlotPicks]
}

export function isOccCoreGrantSkillPick(
  pick: CreationSkillPick,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): boolean {
  if (!occ || pick.instanceId !== pick.skillId) return false
  return occStartingOccSkillIds(occ, specializationId).includes(pick.skillId)
}

export function findOccCoreVoucherSlotForPick(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  instanceId: string,
): { taskId: string; slot: number; choiceCount: number } | undefined {
  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    const slots = getOccCoreVoucherSlotPicks(
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

/** Every skill pick on the character (O.C.C. core + related vouchers + related + secondary). */
export function collectAllCreationSkillPicks(
  character: Pick<
    CharacterRootState,
    | 'creationOccCoreVoucherPicks'
    | 'creationOccGrantPickDetails'
    | 'creationOccRelatedVoucherPicks'
    | 'creationRelatedSkillPicks'
    | 'creationRelatedSkillIds'
    | 'creationSecondarySkillPicks'
    | 'creationSecondarySkillIds'
    | 'occSpecializationId'
  >,
  occ?: PalladiumOcc,
): CreationSkillPick[] {
  const occPicks = resolveOccCoreSkillPicks(
    occ,
    character.occSpecializationId,
    character.creationOccCoreVoucherPicks,
    character.creationOccGrantPickDetails,
  )
  const relatedVoucherPicks = flattenRelatedVoucherPicks(
    listOccRelatedVoucherTasks(occ, character.occSpecializationId),
    character.creationOccRelatedVoucherPicks,
  )
  return [
    ...occPicks,
    ...relatedVoucherPicks,
    ...getCreationRelatedPicks(character),
    ...getCreationSecondaryPicks(character),
  ]
}

/** Fixed core grants + voucher picks + extra player O.C.C. skills (deduped). */
export function resolveCreationOccSkillIds(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  creationOccSkillIds: readonly string[],
  voucherPicks: Readonly<Record<string, unknown>>,
): string[] {
  const corePicks = resolveOccCoreSkillPicks(
    occ,
    specializationId,
    voucherPicks,
    undefined,
  )
  const coreIds = corePicks.map((p) => p.skillId)
  const coreSet = new Set(coreIds)
  const extras = creationOccSkillIds.filter((id) => !coreSet.has(id))
  return [...new Set([...coreIds, ...extras])]
}

export function mergeOccSkillIdsWithVouchers(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  currentOccSkillIds: readonly string[],
  voucherPicks: Readonly<Record<string, unknown>>,
): string[] {
  return resolveCreationOccSkillIds(
    occ,
    specializationId,
    currentOccSkillIds,
    voucherPicks,
  )
}

/** True when any O.C.C. core or non-vocational related voucher slots remain open. */
export function hasIncompleteCreationVoucherPicks(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined,
): boolean {
  const occTasks = listOccCoreVoucherTasks(occ, specializationId)
  if (
    occTasks.length > 0 &&
    !occCoreVoucherPicksComplete(occTasks, occCoreVoucherPicks ?? {})
  ) {
    return true
  }
  const relatedVoucherTasks = listCreationVoucherRelatedTasks(
    listOccRelatedVoucherTasks(occ, specializationId),
  )
  return (
    relatedVoucherTasks.length > 0 &&
    !occRelatedVoucherPicksComplete(
      relatedVoucherTasks,
      relatedVoucherPicks,
      relatedVoucherClusters,
    )
  )
}

export function isSkillInVouchersLibraryScope(
  skillId: string,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  occCoreTasks: readonly OccCoreVoucherTask[],
  occCoreVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherTasks: readonly OccRelatedVoucherTask[],
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined,
  hostGenreId: string,
  catalogSkillIds: readonly string[],
  forbiddenWpIds: readonly string[] = [],
): boolean {
  if (
    findOccCoreVoucherPickForSkillId(skillId, occCoreTasks, occCoreVoucherPicks)
  ) {
    return true
  }

  const libraryOccTasks = occCoreTasks
  if (
    findOpenOccCoreVoucherSlot(
      skillId,
      libraryOccTasks,
      occCoreVoucherPicks,
      hostGenreId,
      catalogSkillIds,
      forbiddenWpIds,
    ) != null
  ) {
    return true
  }

  if (
    findRelatedVoucherPickForSkillId(
      skillId,
      relatedVoucherTasks,
      relatedVoucherPicks,
    )
  ) {
    return true
  }

  return (
    findOpenRelatedVoucherSlot(
      skillId,
      relatedVoucherTasks,
      relatedVoucherPicks,
      occ,
      specializationId,
      relatedVoucherClusters,
    ) != null
  )
}
