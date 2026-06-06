import type { CharacterCreationForgeTabId } from '../../types'
import { assessConfiguratorPairConflict } from '../configuratorMatrix'
import {
  getEffectivePoolSlots,
  raceAttrNotation,
  valueFitsRaceNotation,
} from '../creationAttributeSync'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from '../attributeKeys'
import {
  assessHandToHandBlockers,
  creationHandToHandElectiveSlotCost,
  creationHandToHandRequiresSelection,
  listOccHandToHandOptions,
} from '../creationHandToHandChoice'
import { creationNeedsAbilitySelection } from '../creationPhases'
import { creationShowsPsychicGate } from '../creationPhases'
import {
  assessRelatedSkillSlotBlockers,
  assessSecondarySkillSlotBlockers,
  creationRelatedSkillCap,
} from '../creationPsychicSkills'
import { occSkillSlotPolicy } from '../occCatalogEngine'
import {
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
  occCreationAbilityBudget,
} from '../occCreationDerivation'
import {
  collectAllCreationSkillPicks,
  listOccCoreVoucherTasks,
  occCoreGrantSpecializationsComplete,
  occCoreVoucherPicksComplete,
  resolveOccCoreSkillPicks,
} from '../occCoreSkillVouchers'
import { resolveEffectivePalladiumOcc } from '../occComposition'
import { occStartingOccSkillIds } from '../occCatalogEngine'
import { skillRequiresSpecialization } from '../creationSkillPicks'
import {
  findDuplicateSkillIdentityKeys,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
} from '../creationSkillPicks'
import { raceCanPickOcc } from '../raceEngine'
import {
  listOccVariableAttributeBonusTasks,
  occVariableBonusTasksComplete,
} from '../occVariableBonus'
import type { ForgeTabRequirement } from './types'
import type { CharacterCreationForgeContext } from './characterCreationForge'
import { traitForgeTabApplicable } from './characterCreationForge'

function occMinForAttr(
  occ: CharacterCreationForgeContext['occ'],
  attr: ForgeAttrKey,
): number | undefined {
  const reqs = occ?.attributeRequirements as Record<string, number> | undefined
  const key = attr === 'ps' ? 'ps' : attr
  const req = reqs?.[key]
  return typeof req === 'number' && req > 0 ? req : undefined
}

function tab1Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const { character, race, occ } = ctx
  const requirements: ForgeTabRequirement[] = [
    {
      id: 'race',
      label: 'Select a race',
      satisfied: Boolean(character.raceId && race),
    },
  ]

  if (!race || !raceCanPickOcc(race)) return requirements

  requirements.push({
    id: 'occ',
    label: 'Select an O.C.C.',
    satisfied: Boolean(character.occ?.id && character.occ?.xpTable?.floors?.length),
  })

  if (occ?.specializations?.length) {
    requirements.push({
      id: 'occ-spec',
      label: 'Select an O.C.C. specialization',
      satisfied: Boolean(character.occSpecializationId),
    })
  }

  if (character.occ?.id && occ && race) {
    const conflict = assessConfiguratorPairConflict(
      race,
      occ,
      character.facade.alignment,
    )
    requirements.push({
      id: 'pair',
      label: conflict ?? 'Valid race, O.C.C., and alignment combination',
      satisfied: conflict == null,
    })
  }

  return requirements
}

function tab2Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const { character, occ, race } = ctx
  const assignments = character.creationAttributeAssignments ?? {}
  const pool = character.creationAttributePool ?? []
  const poolSlots = getEffectivePoolSlots(
    pool,
    assignments,
    character.creationAttributePoolSlots,
  )
  const filledPool = pool.filter((n) => n != null && Number.isFinite(n)).length
  const formulas = race?.attributes

  const allAssigned = FORGE_ATTRIBUTE_KEYS.every((attr) => {
    const v = assignments[attr]
    return v != null && Number.isFinite(v) && v >= 1
  })

  const minsAndDiceOk = FORGE_ATTRIBUTE_KEYS.every((attr) => {
    const v = assignments[attr]
    if (v == null || !Number.isFinite(v)) return false
    const min = occMinForAttr(occ, attr)
    if (min != null && v < min) return false
    const notation = raceAttrNotation(formulas, attr)
    return valueFitsRaceNotation(v, notation)
  })

  const usedSlotIndices = FORGE_ATTRIBUTE_KEYS.map((a) => poolSlots[a]).filter(
    (i): i is number => typeof i === 'number',
  )
  const poolSlotsUnique =
    usedSlotIndices.length < 8 || new Set(usedSlotIndices).size === 8

  const requirements: ForgeTabRequirement[] = [
    {
      id: 'pool',
      label: 'Enter all eight rolled values in the attribute pool',
      satisfied: filledPool >= 8,
    },
    {
      id: 'assign',
      label: 'Assign all eight attributes from the pool',
      satisfied: allAssigned && poolSlotsUnique,
    },
    {
      id: 'limits',
      label: 'Meet O.C.C. minimums and race dice limits for each attribute',
      satisfied: allAssigned && minsAndDiceOk,
    },
  ]

  const variableTasks = listOccVariableAttributeBonusTasks(
    occ,
    character.occSpecializationId,
  )
  if (variableTasks.length > 0) {
    requirements.push({
      id: 'occ-variable',
      label: 'Resolve all O.C.C. variable dice bonuses',
      satisfied: occVariableBonusTasksComplete(
        variableTasks,
        character.creationOccVariableResolutions ?? {},
      ),
    })
  }

  return requirements
}

function tab3Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  if (
    !creationShowsPsychicGate(ctx.character, ctx.occ, ctx.character.creationGenreId)
  ) {
    return []
  }
  return [
    {
      id: 'psychic-tier',
      label: 'Select None, Minor, or Major psionic potential',
      satisfied: ctx.character.creationPsychicTierChosen === true,
    },
  ]
}

function tab4Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const { character, race, occ } = ctx
  if (!raceCanPickOcc(race) || !occ) return []

  const effectiveOcc = resolveEffectivePalladiumOcc(occ, character.occSpecializationId)
  const voucherTasks = listOccCoreVoucherTasks(occ, character.occSpecializationId)
  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const grantDetails = character.creationOccGrantPickDetails
  const relatedBase =
    character.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(occ)
  const relatedPicks = getCreationRelatedPicks(character)
  const occPicks = resolveOccCoreSkillPicks(
    occ,
    character.occSpecializationId,
    voucherPicks,
    grantDetails,
  )
  const relatedCap = creationRelatedSkillCap(
    relatedBase,
    ctx.psychicTier,
    occSkillSlotPolicy(occ),
  )
  const handToHandReserved = creationHandToHandElectiveSlotCost(
    effectiveOcc,
    character.creationHandToHandTier,
  )
  const relatedSelected = sumRelatedPoolSlotUsage(
    relatedPicks,
    occPicks,
    handToHandReserved,
  )
  const secondaryBase = occSecondarySkillSlots(occ)
  const secondarySelected = sumCreationSkillPickSlots(
    getCreationSecondaryPicks(character),
  )
  const allPicks = collectAllCreationSkillPicks(character, occ)
  const handToHandOptions = listOccHandToHandOptions(effectiveOcc)

  const requirements: ForgeTabRequirement[] = []

  if (voucherTasks.length > 0) {
    requirements.push({
      id: 'occ-vouchers',
      label: 'Complete all O.C.C. core skill vouchers',
      satisfied: occCoreVoucherPicksComplete(voucherTasks, voucherPicks),
    })
  }

  const parameterizedGrants = occStartingOccSkillIds(
    occ,
    character.occSpecializationId,
  ).filter(skillRequiresSpecialization)
  if (parameterizedGrants.length > 0) {
    requirements.push({
      id: 'occ-grants',
      label: 'Specify language/literacy for parameterized O.C.C. core skills',
      satisfied: occCoreGrantSpecializationsComplete(
        occ,
        character.occSpecializationId,
        grantDetails,
      ),
    })
  }

  if (handToHandOptions.length > 0) {
    const handToHandBlockers = assessHandToHandBlockers(
      effectiveOcc,
      character.creationHandToHandTier,
      relatedCap,
      relatedSelected - handToHandReserved,
    )
    const needsMandatoryPick = creationHandToHandRequiresSelection(effectiveOcc)
    requirements.push({
      id: 'hand-to-hand',
      label: needsMandatoryPick
        ? 'Select a Hand-to-Hand fighting style'
        : 'Resolve Hand-to-Hand choice',
      satisfied: handToHandBlockers.length === 0,
    })
  }

  if (relatedCap > 0) {
    const relatedBlockers = assessRelatedSkillSlotBlockers(
      relatedSelected,
      relatedBase,
      ctx.psychicTier,
      occ,
      handToHandReserved,
    )
    requirements.push({
      id: 'related-slots',
      label:
        relatedBlockers[0] ??
        `Fill all O.C.C. related skill slots (${relatedSelected} / ${relatedCap})`,
      satisfied: relatedBlockers.length === 0,
    })
  }

  if (secondaryBase > 0) {
    const secondaryBlockers = assessSecondarySkillSlotBlockers(
      secondarySelected,
      secondaryBase,
      occ,
    )
    requirements.push({
      id: 'secondary-slots',
      label:
        secondaryBlockers[0] ??
        `Fill all secondary skill slots (${secondarySelected} / ${secondaryBase})`,
      satisfied: secondaryBlockers.length === 0,
    })
  }

  requirements.push({
    id: 'no-duplicates',
    label: 'Remove duplicate skill selections',
    satisfied: findDuplicateSkillIdentityKeys(allPicks).length === 0,
  })

  return requirements
}

function tab5Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  if (!traitForgeTabApplicable(ctx.race, ctx.occ)) return []
  return [
    {
      id: 'trait-stub',
      label: 'Complete the trait forge placeholder step',
      satisfied: ctx.character.creationTraitForgeStubComplete === true,
    },
  ]
}

function tab6Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const budget = ctx.occ
    ? occCreationAbilityBudget(ctx.occ)
    : ctx.character.creationAbilityBudget
  if (!creationNeedsAbilitySelection(budget, ctx.character.creationGenreId)) {
    return []
  }
  const abs = ctx.character.selectedAbilities ?? []
  return [
    {
      id: 'ability-min',
      label: 'Pick at least one supernatural ability',
      satisfied: abs.length >= 1,
    },
  ]
}

export function listCharacterCreationTabRequirements(
  tabId: CharacterCreationForgeTabId,
  ctx: CharacterCreationForgeContext,
): ForgeTabRequirement[] {
  switch (tabId) {
    case 'tab1_configurator':
      return tab1Requirements(ctx)
    case 'tab2_attributes':
      return tab2Requirements(ctx)
    case 'tab3_psionic':
      return tab3Requirements(ctx)
    case 'tab4_skills':
      return tab4Requirements(ctx)
    case 'tab5_traits':
      return tab5Requirements(ctx)
    case 'tab6_abilities':
      return tab6Requirements(ctx)
    default:
      return []
  }
}
