import type { CharacterCreationForgeTabId } from '../../types'
import { assessConfiguratorPairConflict } from '../configuratorMatrix'
import {
  raceAttrNotation,
  valueFitsRaceNotation,
} from '../creationAttributeSync'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from '../attributeKeys'
import { creationHandToHandReservedRelatedSlots } from '../creationHandToHandChoice'
import {
  countSelectedAbilitiesByBudgetCategory,
  formatAbilityBudgetRequirementLabel,
  resolveEffectiveCreationAbilityBudget,
} from '../creationAbilityBudget'
import {
  formatPsychicGateRequirementLabel,
  listGatePsionicSelections,
  psychicGatePsionicRulesApply,
  psychicGateRequiredPickCount,
} from '../psychicGatePsionicBudget'
import { creationNeedsAbilitySelection } from '../creationPhases'
import {
  creationPsychicGateRequiresTierChoice,
  isCreationPsychicTierComplete,
} from '../creationPhases'
import {
  assessRelatedSkillSlotBlockers,
  assessSecondarySkillSlotBlockers,
  creationRelatedSkillCap,
} from '../creationPsychicSkills'
import { assessRelatedSkillCategoryMinimumBlockers } from '../occRelatedSkillMinimums'
import { occSupernaturalGrantedAbilityIds } from '../occSupernaturalGrants'
import { occSkillSlotPolicy } from '../occCatalogEngine'
import {
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
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
import { creationUsesOccSkillProgram, raceForcedOccId } from '../shadowOcc'
import {
  listOccVariableAttributeBonusTasks,
  occVariableBonusTasksComplete,
} from '../occVariableBonus'
import type { ForgeTabRequirement } from './types'
import type { CharacterCreationForgeContext } from './characterCreationForge'
import { traitForgeTabApplicable } from './characterCreationForge'
import {
  listPendingDiceBlocks,
  pendingDiceBlocksResolutionComplete,
} from '../pendingDiceLedger'

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
  const raceSelected = Boolean(character.raceId && race)
  const occSelected = Boolean(
    character.occ?.id && character.occ?.xpTable?.floors?.length,
  )
  const picksOcc = race ? raceCanPickOcc(race) : false
  const shadowForcedOcc = race ? raceForcedOccId(race) : undefined
  const occProgramRequired = race ? creationUsesOccSkillProgram(race) : false

  const pairConflict =
    raceSelected && occSelected && race && occ && picksOcc
      ? assessConfiguratorPairConflict(race, occ, null)
      : null

  const pairSatisfied = occProgramRequired
    ? raceSelected && occSelected && (picksOcc ? pairConflict == null : true)
    : raceSelected

  const pairLabel = pairConflict
    ? pairConflict
    : shadowForcedOcc
      ? 'R.C.C. skill package auto-mounted'
      : picksOcc
        ? 'Select a valid race and O.C.C. combination'
        : 'Select a race'

  const requirements: ForgeTabRequirement[] = [
    {
      id: 'race-occ-pair',
      label: pairLabel,
      satisfied: pairSatisfied,
    },
  ]

  if (occ?.specializations?.length) {
    requirements.push({
      id: 'occ-spec',
      label: 'Select an O.C.C. specialization',
      satisfied: Boolean(character.occSpecializationId),
    })
  }

  return requirements
}

function tab2Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const { character, occ, race } = ctx
  const assignments = character.creationAttributeAssignments ?? {}
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

  const requirements: ForgeTabRequirement[] = [
    {
      id: 'assign',
      label: 'Assign all eight attributes',
      satisfied: allAssigned,
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
    !creationPsychicGateRequiresTierChoice(
      ctx.character,
      ctx.occ,
      ctx.character.creationGenreId,
    )
  ) {
    return []
  }
  const requirements: ForgeTabRequirement[] = [
    {
      id: 'psychic-tier',
      label: 'Select None, Minor, or Major psionic potential',
      satisfied: isCreationPsychicTierComplete(
        ctx.character,
        ctx.occ,
        ctx.character.creationGenreId,
      ),
    },
  ]

  return requirements
}

function tab4Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const { character, race, occ } = ctx
  if (!creationUsesOccSkillProgram(race) || !occ) return []

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
  const handToHandReserved = creationHandToHandReservedRelatedSlots(
    effectiveOcc,
    character,
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

  if (relatedCap > 0) {
    const relatedBlockers = assessRelatedSkillSlotBlockers(
      relatedSelected,
      relatedBase,
      ctx.psychicTier,
      occ,
      handToHandReserved,
    )
    const categoryMinimumBlockers = assessRelatedSkillCategoryMinimumBlockers(
      occ,
      relatedPicks,
      character.occSpecializationId,
    )
    requirements.push({
      id: 'related-slots',
      label:
        relatedBlockers[0] ??
        categoryMinimumBlockers[0] ??
        `Fill all O.C.C. related skill slots (${relatedSelected} / ${relatedCap})`,
      satisfied:
        relatedBlockers.length === 0 && categoryMinimumBlockers.length === 0,
    })
    if (categoryMinimumBlockers.length > 1) {
      for (const [index, blocker] of categoryMinimumBlockers.slice(1).entries()) {
        requirements.push({
          id: `related-category-min-${index}`,
          label: blocker,
          satisfied: false,
        })
      }
    }
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
  const scope = ctx.supportsDualForm ? 'facade' : 'all'
  const blocks = listPendingDiceBlocks(ctx.character, ctx.race, ctx.occ, {
    supportsDualForm: ctx.supportsDualForm,
    psychicTier: ctx.psychicTier,
    scope,
  })
  if (blocks.length === 0) {
    return [
      {
        id: 'finalize-none',
        label: 'No pending dice for this build',
        satisfied: true,
      },
    ]
  }
  const complete = pendingDiceBlocksResolutionComplete(
    blocks,
    ctx.character.creationPendingDiceResolutions ?? {},
  )
  return [
    {
      id: 'finalize-dice',
      label: ctx.supportsDualForm
        ? 'Enter all Facade physical die results'
        : 'Enter all physical die results',
      satisfied: complete,
    },
  ]
}

function tab6Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  if (!traitForgeTabApplicable(ctx.race, ctx.occ)) return []
  const requirements: ForgeTabRequirement[] = []
  if (ctx.supportsDualForm) {
    requirements.push({
      id: 'facade-finalized',
      label: 'Complete Facade dice on the Roll Pending tab',
      satisfied: ctx.character.creationFacadeDiceFinalized === true,
    })
    const morphusBlocks = listPendingDiceBlocks(ctx.character, ctx.race, ctx.occ, {
      supportsDualForm: true,
      psychicTier: ctx.psychicTier,
      scope: 'morphus',
    })
    if (morphusBlocks.length > 0) {
      requirements.push({
        id: 'morphus-dice',
        label: 'Enter all Morphus physical die results',
        satisfied: pendingDiceBlocksResolutionComplete(
          morphusBlocks,
          ctx.character.creationPendingDiceResolutions ?? {},
        ),
      })
    }
  }
  requirements.push({
    id: 'morphus-sub-forge',
    label: 'Complete the Morphus Sub-Forge and Finalize Morphus',
    satisfied: ctx.character.creationTraitForgeStubComplete === true,
  })
  return requirements
}

function tab7Requirements(ctx: CharacterCreationForgeContext): ForgeTabRequirement[] {
  const genreId = ctx.character.creationGenreId ?? 'nightbane'
  const budget = resolveEffectiveCreationAbilityBudget({
    occ: ctx.occ,
    raceId: ctx.character.raceId,
    psychicTier: ctx.psychicTier,
    psychicGateBypassed: ctx.character.psychicGateBypassed === true,
    majorAllocation: ctx.character.creationPsychicGateMajorAllocation,
    storedBudget: ctx.character.creationAbilityBudget,
    creationGenreId: genreId,
  })
  if (!creationNeedsAbilitySelection(budget, genreId)) {
    return []
  }
  const counts = countSelectedAbilitiesByBudgetCategory(
    ctx.character.selectedAbilities,
    occSupernaturalGrantedAbilityIds(ctx.occ, ctx.character.occSpecializationId),
  )
  const requirements: ForgeTabRequirement[] = []
  if (budget.spellSlots > 0) {
    requirements.push({
      id: 'ability-spells',
      label: formatAbilityBudgetRequirementLabel(
        'spell',
        counts.spell,
        budget.spellSlots,
      ),
      satisfied: counts.spell >= budget.spellSlots,
    })
  }
  if (budget.psionicSlots > 0) {
    const gatePsionics = psychicGatePsionicRulesApply(
      ctx.occ,
      ctx.psychicTier,
      ctx.character.psychicGateBypassed === true,
    )
    if (gatePsionics) {
      if (
        ctx.psychicTier === 'major' &&
        !ctx.character.creationPsychicGateMajorAllocation
      ) {
        requirements.push({
          id: 'psychic-major-allocation',
          label:
            'Choose Major psionic allocation (8 from one category, or 6 mixed)',
          satisfied: false,
        })
      } else {
      const label = formatPsychicGateRequirementLabel(
        ctx.psychicTier,
        ctx.character.creationPsychicGateMajorAllocation,
        ctx.character.selectedAbilities,
        genreId,
      )
      const required =
        psychicGateRequiredPickCount(
          ctx.psychicTier,
          ctx.character.creationPsychicGateMajorAllocation,
        ) ?? budget.psionicSlots
      const gateTotal = listGatePsionicSelections(
        ctx.character.selectedAbilities,
        genreId,
      ).length
      const allocationChosen =
        ctx.psychicTier !== 'major' ||
        Boolean(ctx.character.creationPsychicGateMajorAllocation)
      requirements.push({
        id: 'ability-psionics',
        label,
        satisfied: allocationChosen && gateTotal >= required,
      })
      }
    } else {
      requirements.push({
        id: 'ability-psionics',
        label: formatAbilityBudgetRequirementLabel(
          'psionic',
          counts.psionic,
          budget.psionicSlots,
        ),
        satisfied: counts.psionic >= budget.psionicSlots,
      })
    }
  }
  if (budget.talentSlots > 0) {
    requirements.push({
      id: 'ability-talents',
      label: formatAbilityBudgetRequirementLabel(
        'talent',
        counts.talent,
        budget.talentSlots,
      ),
      satisfied: counts.talent >= budget.talentSlots,
    })
  }
  return requirements
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
    case 'tab5_finalize':
      return tab5Requirements(ctx)
    case 'tab6_traits':
      return tab6Requirements(ctx)
    case 'tab7_abilities':
      return tab7Requirements(ctx)
    default:
      return []
  }
}
