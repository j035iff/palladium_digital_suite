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
import { occStartingOccSkillIds } from './occCatalogEngine'
import { resolveCreationLibrarySkillSelectionTier } from './creationSkillPicks'

export type OccCoreVoucherTask = {
  id: string
  voucherIndex: number
  entry: OccCoreSkillChoiceVoucher
}

const WEAPON_PROFICIENCIES_VOUCHER_CATEGORY = 'Weapon Proficiencies'

/** Dropdown picker in the selected panel (W.P. vouchers). Category vouchers use the library + O.C.C. button. */
export function voucherUsesDedicatedPickerUi(
  entry: OccCoreSkillChoiceVoucher,
): boolean {
  return (
    entry.allowedCategories?.length === 1 &&
    entry.allowedCategories[0] === WEAPON_PROFICIENCIES_VOUCHER_CATEGORY
  )
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
  },
): 'occ' | 'related' | 'secondary' | undefined {
  const userTier = resolveCreationLibrarySkillSelectionTier(librarySkillId, opts)
  if (userTier) return userTier
  if (
    findOccCoreVoucherPickForSkillId(
      librarySkillId,
      opts.voucherTasks,
      opts.voucherPicks,
    )
  ) {
    return 'occ'
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
    if (voucherUsesDedicatedPickerUi(task.entry)) continue
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
      `Resolve O.C.C. core skill choices (${pending.length} voucher${pending.length === 1 ? '' : 's'} remaining).`,
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

/** Every skill pick on the character (O.C.C. core + related + secondary). */
export function collectAllCreationSkillPicks(
  character: Pick<
    CharacterRootState,
    | 'creationOccCoreVoucherPicks'
    | 'creationOccGrantPickDetails'
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
  return [
    ...occPicks,
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
