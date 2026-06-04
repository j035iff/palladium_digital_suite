import type { OccCoreSkillChoiceVoucher, PalladiumOcc } from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { isWhitelistedForHostGenre } from './genreGating'
import {
  isOccCoreSkillChoiceVoucher,
  resolveEffectivePalladiumOcc,
} from './occComposition'
import { occStartingOccSkillIds } from './occCatalogEngine'

export type OccCoreVoucherTask = {
  id: string
  voucherIndex: number
  entry: OccCoreSkillChoiceVoucher
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
  hostGenreId: string,
): boolean {
  const catalog = getPalladiumSkillCatalogEntryById(skillId)
  if (!catalog || !isWhitelistedForHostGenre(catalog, hostGenreId)) return false

  if (entry.allowedSkillIds?.length) {
    return entry.allowedSkillIds.includes(skillId)
  }

  if (entry.allowedCategories?.length) {
    const cats = catalog.categories ?? []
    return entry.allowedCategories.some((c) => cats.includes(c))
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
): string[] {
  return catalogSkillIds.filter((id) => skillMatchesVoucher(id, entry, hostGenreId))
}

export function occCoreVoucherPicksComplete(
  tasks: readonly OccCoreVoucherTask[],
  picks: Readonly<Record<string, readonly string[]>>,
): boolean {
  return tasks.every((t) => {
    const chosen = picks[t.id] ?? []
    const unique = new Set(chosen)
    return (
      chosen.length === t.entry.choiceCount &&
      unique.size === chosen.length &&
      chosen.every((id) => id.length > 0)
    )
  })
}

export function assessOccCoreVoucherBlockers(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  picks: Readonly<Record<string, readonly string[]>>,
): string[] {
  const tasks = listOccCoreVoucherTasks(occ, specializationId)
  if (!tasks.length) return []
  if (occCoreVoucherPicksComplete(tasks, picks)) return []
  const pending = tasks.filter((t) => (picks[t.id] ?? []).length < t.entry.choiceCount)
  return [
    `Resolve O.C.C. core skill choices (${pending.length} voucher${pending.length === 1 ? '' : 's'} remaining).`,
  ]
}

/** Fixed core grants + voucher picks + extra player O.C.C. skills (deduped). */
export function resolveCreationOccSkillIds(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  creationOccSkillIds: readonly string[],
  voucherPicks: Readonly<Record<string, readonly string[]>>,
): string[] {
  const grants = occ ? occStartingOccSkillIds(occ, specializationId) : []
  const voucherIds = listOccCoreVoucherTasks(occ, specializationId).flatMap(
    (t) => voucherPicks[t.id] ?? [],
  )
  const grantSet = new Set(grants)
  const voucherSet = new Set(voucherIds)
  const extras = creationOccSkillIds.filter(
    (id) => !grantSet.has(id) && !voucherSet.has(id),
  )
  return [...new Set([...grants, ...voucherIds, ...extras])]
}

export function mergeOccSkillIdsWithVouchers(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  currentOccSkillIds: readonly string[],
  voucherPicks: Readonly<Record<string, readonly string[]>>,
): string[] {
  return resolveCreationOccSkillIds(
    occ,
    specializationId,
    currentOccSkillIds,
    voucherPicks,
  )
}
