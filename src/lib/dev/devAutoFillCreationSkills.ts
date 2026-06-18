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
  creationLibrarySkillAddState,
  creationSkillIdsSet,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
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

const DEV_SPEC = 'Dev Autofill'

function devSpecialization(skillId: string): string | undefined {
  if (!skillRequiresSpecialization(skillId)) return undefined
  if (skillId === 'skill_language' || skillId === 'skill_literacy') {
    return 'English'
  }
  return DEV_SPEC
}

function buildDevSkillPick(skillId: string): CreationSkillPick {
  const spec = devSpecialization(skillId)
  return buildCreationSkillPick(skillId, spec ? { specialization: spec } : {})
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
    prev.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(occ)
  const relatedCap = creationRelatedSkillCap(
    relatedBase,
    psychicTier,
    occSkillSlotPolicy(occ),
  )
  const secondaryCap = occSecondarySkillSlots(occ)

  const voucherPicks: Record<string, (CreationSkillPick | null)[]> = {
    ...(prev.creationOccCoreVoucherPicks ?? {}),
  }

  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    const eligible = listEligibleVoucherSkillIds(
      task.entry,
      hostGenreId,
      catalogIds,
    )
    const chosen = new Set<string>()
    const slots: (CreationSkillPick | null)[] = []
    for (let i = 0; i < task.entry.choiceCount; i++) {
      const skillId = eligible.find((id) => !chosen.has(id))
      if (!skillId) {
        slots.push(null)
        continue
      }
      chosen.add(skillId)
      slots.push(buildDevSkillPick(skillId))
    }
    voucherPicks[task.id] = slots
  }

  const grantDetails: Record<string, CreationSkillPick> = {
    ...(prev.creationOccGrantPickDetails ?? {}),
  }
  for (const skillId of occStartingOccSkillIds(occ, specializationId)) {
    if (skillRequiresSpecialization(skillId)) {
      grantDetails[skillId] = buildDevSkillPick(skillId)
    }
  }

  const occPicks = resolveOccCoreSkillPicks(
    occ,
    specializationId,
    voucherPicks,
    grantDetails,
  )

  let relatedPicks = [...getCreationRelatedPicks(prev)]
  let secondaryPicks = [...getCreationSecondaryPicks(prev)]

  const handToHandTier = resolveHandToHandTier(
    occ,
    relatedCap,
    sumCreationSkillPickSlots(relatedPicks),
  )
  const handToHandReserved = creationHandToHandElectiveSlotCost(
    effective,
    handToHandTier,
  )

  const relatedFill = fillTierPicks(
    library,
    'related',
    occ,
    specializationId,
    occPicks,
    relatedPicks,
    secondaryPicks,
    relatedCap,
    secondaryCap,
    handToHandReserved,
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
    relatedCap,
    secondaryCap,
    handToHandReserved,
  )
  relatedPicks = secondaryFill.related
  secondaryPicks = secondaryFill.secondary

  return {
    ...prev,
    creationHandToHandTier: handToHandTier,
    creationOccCoreVoucherPicks: voucherPicks,
    creationOccGrantPickDetails: grantDetails,
    creationRelatedSkillPicks: relatedPicks,
    creationRelatedSkillIds: undefined,
    creationSecondarySkillPicks: secondaryPicks,
    creationSecondarySkillIds: undefined,
  }
}
