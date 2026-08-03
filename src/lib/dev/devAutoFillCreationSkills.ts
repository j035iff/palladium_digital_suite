import type { CharacterRootState, CreationSkillPick, PalladiumOcc, PsychicTier } from '../../types'
import { listCreationSkillLibrary } from '../creationSkillCatalog'
import {
  appendCreationSkillPickWithConditionalGrants,
} from '../conditionalRelatedSkills'
import {
  canAffordHandToHandTier,
  creationHandToHandElectiveSlotCost,
  listOccHandToHandOptions,
  occStartingHandToHandTier,
  type CreationHandToHandTier,
} from '../creationHandToHandChoice'
import { occSkillSlotPolicy, occStartingOccSkillIds } from '../occCatalogEngine'
import { creationRelatedSkillCap } from '../creationPsychicSkills'
import {
  buildCreationSkillPick,
  creationFreeRelatedSkillCap,
  creationLibrarySkillAddState,
  creationSkillIdsSet,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  isCreationSkillIdentityTaken,
  skillRequiresSpecialization,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
} from '../creationSkillPicks'
import {
  listEligibleVoucherSkillIds,
  listOccCoreVoucherTasks,
  resolveOccCoreSkillPicks,
} from '../occCoreSkillVouchers'
import {
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
} from '../occCreationDerivation'
import { resolveEffectivePalladiumOcc } from '../occComposition'
import {
  countRelatedPicksInCategory,
} from '../occRelatedSkillMinimums'
import {
  flattenRelatedVoucherPicks,
  getRelatedVoucherSlotPicks,
  isSkillEligibleForRelatedVoucher,
  listOccRelatedVoucherTasks,
  sumRelatedVoucherReservedSlots,
} from '../occRelatedSkillVouchers'
import { getPalladiumSkillCatalogEntryById } from '../../data/library/skillsCatalogLoader'
import { mapFilterCategoryToOccCategory } from '../occCategoryRuleDisplay'

const DEV_SPEC = 'Dev Autofill'

const DEV_LANGUAGE_SPECS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Mandarin',
] as const

function devSpecializationCandidates(skillId: string): readonly string[] {
  if (skillId === 'skill_language' || skillId === 'skill_literacy') {
    return DEV_LANGUAGE_SPECS
  }
  return [DEV_SPEC, `${DEV_SPEC} B`, `${DEV_SPEC} C`]
}

function buildDevSkillPick(skillId: string): CreationSkillPick {
  if (!skillRequiresSpecialization(skillId)) {
    return buildCreationSkillPick(skillId, {})
  }
  const specialization = devSpecializationCandidates(skillId)[0]!
  return buildCreationSkillPick(skillId, { specialization })
}

/** Prefer a specialization that does not collide with already-selected identities. */
function buildDevSkillPickAvoidingIdentity(
  skillId: string,
  existingPicks: readonly CreationSkillPick[],
): CreationSkillPick | null {
  if (!skillRequiresSpecialization(skillId)) {
    if (isCreationSkillIdentityTaken(existingPicks, skillId)) return null
    return buildCreationSkillPick(skillId, {})
  }
  for (const specialization of devSpecializationCandidates(skillId)) {
    if (isCreationSkillIdentityTaken(existingPicks, skillId, specialization)) {
      continue
    }
    return buildCreationSkillPick(skillId, { specialization })
  }
  return null
}

function resolveHandToHandTier(
  occ: PalladiumOcc,
  relatedCap: number,
  relatedSkillOnlyCount: number,
): CreationHandToHandTier {
  const effective = resolveEffectivePalladiumOcc(occ)
  const current = occStartingHandToHandTier(effective)
  const options = listOccHandToHandOptions(effective)
  if (options.length === 0) return 'none'

  const preferred =
    options.find((o) => o.tier === current && !o.disabled) ??
    options.find((o) => !o.disabled) ??
    options[0]
  if (
    preferred &&
    !preferred.disabled &&
    canAffordHandToHandTier(
      effective,
      preferred.tier,
      relatedCap,
      relatedSkillOnlyCount,
    )
  ) {
    return preferred.tier
  }

  for (const opt of options) {
    if (opt.disabled) continue
    if (
      canAffordHandToHandTier(
        effective,
        opt.tier,
        relatedCap,
        relatedSkillOnlyCount,
      )
    ) {
      return opt.tier
    }
  }

  return options[0]?.tier ?? 'none'
}

function skillMatchesRelatedCategory(skillId: string, categoryName: string): boolean {
  const occCategory = mapFilterCategoryToOccCategory(categoryName)
  const bookCategories = getPalladiumSkillCatalogEntryById(skillId)?.categories ?? []
  return bookCategories.some(
    (c) => c === categoryName || mapFilterCategoryToOccCategory(c) === occCategory,
  )
}

function tryAddRelatedSkill(
  def: ReturnType<typeof listCreationSkillLibrary>[number],
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  occPicks: readonly CreationSkillPick[],
  related: CreationSkillPick[],
  secondary: CreationSkillPick[],
  relatedCap: number,
  secondaryCap: number,
  handToHandReserved: number,
  extraIdentityPicks: readonly CreationSkillPick[] = [],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } | null {
  if (
    isCreationSkillIdentityTaken(
      [...occPicks, ...related, ...secondary, ...extraIdentityPicks],
      def.id,
    )
  ) {
    return null
  }
  const relatedSlotsUsed = sumRelatedPoolSlotUsage(related, occPicks, handToHandReserved)
  const secondarySlotsUsed = sumCreationSkillPickSlots(secondary)
  const state = creationLibrarySkillAddState(def, {
    effectiveOcc: occ,
    specializationId,
    relatedSlotsUsed,
    relatedSkillCap: relatedCap,
    secondaryPickSlots: secondarySlotsUsed,
    secondaryCap,
    occPicks,
    relatedPicks: related,
    secondaryPicks: secondary,
  })
  if (!state.canAddRelated) return null
  const pick = buildDevSkillPick(def.id)
  const occSkillIds = occStartingOccSkillIds(occ, specializationId)
  const selectedBefore = creationSkillIdsSet(occSkillIds, related, secondary)
  return appendCreationSkillPickWithConditionalGrants(
    pick,
    'related',
    selectedBefore,
    related,
    secondary,
  )
}

/** Satisfy O.C.C. related category minimums before general related autofill. */
function fillRelatedCategoryMinimums(
  library: ReturnType<typeof listCreationSkillLibrary>,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  occPicks: readonly CreationSkillPick[],
  relatedPicks: CreationSkillPick[],
  secondaryPicks: CreationSkillPick[],
  relatedCap: number,
  secondaryCap: number,
  handToHandReserved: number,
  extraIdentityPicks: readonly CreationSkillPick[] = [],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  if (effective.occRelatedSkills.skillVouchers?.length) {
    return { related: relatedPicks, secondary: secondaryPicks }
  }
  const minimums = effective.occRelatedSkills.categoryMinimums ?? []
  if (!minimums.length) {
    return { related: relatedPicks, secondary: secondaryPicks }
  }

  let related = [...relatedPicks]
  let secondary = [...secondaryPicks]

  for (const rule of minimums) {
    while (countRelatedPicksInCategory(related, rule.categoryName) < rule.minimumCount) {
      let added = false
      for (const def of library) {
        if (!skillMatchesRelatedCategory(def.id, rule.categoryName)) continue
        const next = tryAddRelatedSkill(
          def,
          occ,
          specializationId,
          occPicks,
          related,
          secondary,
          relatedCap,
          secondaryCap,
          handToHandReserved,
          extraIdentityPicks,
        )
        if (!next) continue
        related = next.related
        secondary = next.secondary
        added = true
        break
      }
      if (!added) break
    }
  }

  return { related, secondary }
}

function fillTierPicks(
  library: ReturnType<typeof listCreationSkillLibrary>,
  tier: 'related' | 'secondary',
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  occPicks: readonly CreationSkillPick[],
  relatedPicks: CreationSkillPick[],
  secondaryPicks: CreationSkillPick[],
  relatedCap: number,
  secondaryCap: number,
  handToHandReserved: number,
  extraIdentityPicks: readonly CreationSkillPick[] = [],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  let related = [...relatedPicks]
  let secondary = [...secondaryPicks]
  const occSkillIds = occStartingOccSkillIds(occ, specializationId)

  let progressed = true
  while (progressed) {
    progressed = false
    const relatedSlotsUsed = sumRelatedPoolSlotUsage(related, occPicks, handToHandReserved)
    const secondarySlotsUsed = sumCreationSkillPickSlots(secondary)

    for (const def of library) {
      if (
        isCreationSkillIdentityTaken(
          [...occPicks, ...related, ...secondary, ...extraIdentityPicks],
          def.id,
        )
      ) {
        continue
      }
      const ctx = {
        effectiveOcc: occ,
        specializationId,
        relatedSlotsUsed,
        relatedSkillCap: relatedCap,
        secondaryPickSlots: secondarySlotsUsed,
        secondaryCap,
        occPicks,
        relatedPicks: related,
        secondaryPicks: secondary,
      }
      const state = creationLibrarySkillAddState(def, ctx)
      const canAdd = tier === 'related' ? state.canAddRelated : state.canAddSecondary
      if (!canAdd) continue

      const pick = buildDevSkillPick(def.id)
      const selectedBefore = creationSkillIdsSet(occSkillIds, related, secondary)
      const next = appendCreationSkillPickWithConditionalGrants(
        pick,
        tier,
        selectedBefore,
        related,
        secondary,
      )
      related = next.related
      secondary = next.secondary
      progressed = true
      break
    }
  }

  return { related, secondary }
}

function fillRelatedVoucherPicks(
  library: ReturnType<typeof listCreationSkillLibrary>,
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
  occPicks: readonly CreationSkillPick[],
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
  prevRelatedVoucherPicks: Readonly<Record<string, unknown>> | undefined,
  prevClusters: Readonly<Record<string, string>> | undefined,
): {
  relatedVoucherPicks: Record<string, (CreationSkillPick | null)[]>
  relatedVoucherClusters: Record<string, string>
} {
  const tasks = listOccRelatedVoucherTasks(occ, specializationId)
  const relatedVoucherClusters: Record<string, string> = {
    ...(prevClusters ?? {}),
  }
  const relatedVoucherPicks: Record<string, (CreationSkillPick | null)[]> = {}

  for (const task of tasks) {
    const { entry } = task
    if (
      entry.clusterCategoryOptions?.length &&
      !relatedVoucherClusters[task.id]
    ) {
      relatedVoucherClusters[task.id] = entry.clusterCategoryOptions[0]!
    }

    const existing = getRelatedVoucherSlotPicks(
      prevRelatedVoucherPicks,
      task.id,
      entry.choiceCount,
    )
    const slots: (CreationSkillPick | null)[] = [...existing]
    for (let i = 0; i < entry.choiceCount; i++) {
      if (slots[i]) continue
      const identityPool = [
        ...occPicks,
        ...relatedPicks,
        ...secondaryPicks,
        ...flattenRelatedVoucherPicks(tasks, {
          ...relatedVoucherPicks,
          [task.id]: slots,
        }),
      ]
      let pick: CreationSkillPick | null = null
      for (const def of library) {
        if (
          !isSkillEligibleForRelatedVoucher(
            def.id,
            task,
            occ,
            specializationId,
            relatedVoucherClusters,
          )
        ) {
          continue
        }
        pick = buildDevSkillPickAvoidingIdentity(def.id, identityPool)
        if (pick) break
      }
      slots[i] = pick
    }
    relatedVoucherPicks[task.id] = slots
  }

  return { relatedVoucherPicks, relatedVoucherClusters }
}

/** Dev-only: fill vouchers, grants, related slots, secondary slots, and Hand-to-Hand. */
export function buildDevAutoFillCreationSkillsState(
  prev: CharacterRootState,
  occ: PalladiumOcc,
  hostGenreId: string,
  psychicTier: PsychicTier,
): CharacterRootState {
  const specializationId = prev.occSpecializationId
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const library = listCreationSkillLibrary(hostGenreId)
  const catalogIds = library.map((d) => d.id)

  const relatedBase =
    prev.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(effective)
  const relatedCap = creationRelatedSkillCap(
    relatedBase,
    psychicTier,
    occSkillSlotPolicy(occ),
  )
  const relatedVoucherReserved = sumRelatedVoucherReservedSlots(
    listOccRelatedVoucherTasks(occ, specializationId),
  )
  const freeRelatedCap = creationFreeRelatedSkillCap(
    relatedCap,
    relatedVoucherReserved,
  )
  const secondaryCap = occSecondarySkillSlots(effective)

  const voucherPicks: Record<string, (CreationSkillPick | null)[]> = {}
  for (const [key, slots] of Object.entries(prev.creationOccCoreVoucherPicks ?? {})) {
    voucherPicks[key] = slots.map((slot) =>
      slot == null ? null : typeof slot === 'string' ? buildDevSkillPick(slot) : slot,
    )
  }

  const grantDetailsSeed: Record<string, CreationSkillPick> = {
    ...(prev.creationOccGrantPickDetails ?? {}),
  }
  for (const skillId of occStartingOccSkillIds(occ, specializationId)) {
    if (skillRequiresSpecialization(skillId) && !grantDetailsSeed[skillId]) {
      grantDetailsSeed[skillId] = buildDevSkillPick(skillId)
    }
  }

  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    const eligible = listEligibleVoucherSkillIds(
      task.entry,
      hostGenreId,
      catalogIds,
    )
    const slots: (CreationSkillPick | null)[] = []
    for (let i = 0; i < task.entry.choiceCount; i++) {
      const existingForIdentity = [
        ...resolveOccCoreSkillPicks(
          occ,
          specializationId,
          voucherPicks,
          grantDetailsSeed,
        ),
        ...slots.filter((p): p is CreationSkillPick => p != null),
      ]
      let pick: CreationSkillPick | null = null
      for (const skillId of eligible) {
        pick = buildDevSkillPickAvoidingIdentity(skillId, existingForIdentity)
        if (pick) break
      }
      slots.push(pick)
    }
    voucherPicks[task.id] = [...slots]
  }

  const grantDetails: Record<string, CreationSkillPick> = {
    ...grantDetailsSeed,
  }

  const occPicks = resolveOccCoreSkillPicks(
    occ,
    specializationId,
    voucherPicks,
    grantDetails,
  )

  let relatedPicks = [...getCreationRelatedPicks(prev)]
  let secondaryPicks = [...getCreationSecondaryPicks(prev)]

  const { relatedVoucherPicks, relatedVoucherClusters } = fillRelatedVoucherPicks(
    library,
    occ,
    specializationId,
    occPicks,
    relatedPicks,
    secondaryPicks,
    prev.creationOccRelatedVoucherPicks,
    prev.creationOccRelatedVoucherClusters,
  )
  const relatedVoucherIdentity = flattenRelatedVoucherPicks(
    listOccRelatedVoucherTasks(occ, specializationId),
    relatedVoucherPicks,
  )

  const handToHandTier = resolveHandToHandTier(
    occ,
    freeRelatedCap,
    sumCreationSkillPickSlots(relatedPicks),
  )
  const handToHandReserved = creationHandToHandElectiveSlotCost(
    effective,
    handToHandTier,
  )

  const categoryMinFill = fillRelatedCategoryMinimums(
    library,
    occ,
    specializationId,
    occPicks,
    relatedPicks,
    secondaryPicks,
    freeRelatedCap,
    secondaryCap,
    handToHandReserved,
    relatedVoucherIdentity,
  )
  relatedPicks = categoryMinFill.related
  secondaryPicks = categoryMinFill.secondary

  const relatedFill = fillTierPicks(
    library,
    'related',
    occ,
    specializationId,
    occPicks,
    relatedPicks,
    secondaryPicks,
    freeRelatedCap,
    secondaryCap,
    handToHandReserved,
    relatedVoucherIdentity,
  )
  relatedPicks = relatedFill.related
  secondaryPicks = relatedFill.secondary

  const secondaryFill = fillTierPicks(
    library,
    'secondary',
    occ,
    specializationId,
    occPicks,
    relatedPicks,
    secondaryPicks,
    freeRelatedCap,
    secondaryCap,
    handToHandReserved,
    relatedVoucherIdentity,
  )
  relatedPicks = secondaryFill.related
  secondaryPicks = secondaryFill.secondary

  return {
    ...prev,
    creationHandToHandTier: handToHandTier,
    creationOccCoreVoucherPicks: voucherPicks,
    creationOccGrantPickDetails: grantDetails,
    creationOccRelatedVoucherPicks: relatedVoucherPicks,
    creationOccRelatedVoucherClusters: relatedVoucherClusters,
    creationRelatedSkillPicks: relatedPicks,
    creationRelatedSkillIds: undefined,
    creationSecondarySkillPicks: secondaryPicks,
    creationSecondarySkillIds: undefined,
  }
}
