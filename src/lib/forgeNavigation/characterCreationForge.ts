import type {
  Character,
  CharacterCreationForgeTabId,
  CharacterRootState,
  PalladiumOcc,
  PsychicTier,
  Race,
} from '../../types'
import type { CreationPhase } from '../creationStep'
import {
  assessAttributesBlockers,
  assessConfiguratorBlockers,
  assessOccVariableBlockers,
} from '../creationStep'
import { assessCreationSpawnBlockers } from '../creationReadiness'
import {
  creationNeedsAbilitySelection,
  creationPsychicGateRequiresTierChoice,
  isCreationPsychicTierComplete,
} from '../creationPhases'
import {
  assessRelatedSkillSlotBlockers,
  assessSecondarySkillSlotBlockers,
  creationRelatedSkillCap,
} from '../creationPsychicSkills'
import {
  assessOccCoreVoucherBlockers,
  resolveOccCoreSkillPicks,
} from '../occCoreSkillVouchers'
import { resolveEffectivePalladiumOcc } from '../occComposition'
import { creationHandToHandReservedRelatedSlots } from '../creationHandToHandChoice'
import {
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
} from '../creationSkillPicks'
import { occSkillSlotPolicy } from '../occCatalogEngine'
import {
  occCreationAbilityBudget,
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
} from '../occCreationDerivation'
import { raceCanPickOcc, raceLineageFromDefinition } from '../raceEngine'
import { getAbilityById } from '../../data/abilityLibrary'
import {
  deriveForgeNavigation,
  invalidateForgeCompletionFrom,
  markForgeTabComplete,
  type ForgeCompletionState,
  type ForgeTabDefinition,
} from './engine'
import type { ForgeNavigationDerived } from './types'

export type { CharacterCreationForgeTabId }

export const CHARACTER_CREATION_TAB_ORDER: readonly CharacterCreationForgeTabId[] =
  [
    'tab1_configurator',
    'tab2_attributes',
    'tab3_psionic',
    'tab4_skills',
    'tab5_traits',
    'tab6_abilities',
    'tab7_review',
  ] as const

export const CHARACTER_CREATION_TAB_LABELS: Record<
  CharacterCreationForgeTabId,
  string
> = {
  tab1_configurator: 'Race & O.C.C.',
  tab2_attributes: 'Attributes',
  tab3_psionic: 'Psionic',
  tab4_skills: 'Skills',
  tab5_traits: 'Traits',
  tab6_abilities: 'Abilities',
  tab7_review: 'Review & Spawn',
}

/** In-tab page heading (paired with Continue in the top-right). */
export const CHARACTER_CREATION_TAB_PAGE_TITLES: Record<
  CharacterCreationForgeTabId,
  string
> = {
  tab1_configurator: 'Step 2: Race, O.C.C. & Alignment',
  tab2_attributes: 'Phase I: Attribute Pool & Allocation',
  tab3_psionic: 'Step 2.5: Psychic Gate',
  tab4_skills: 'Step 3: Skill Engine',
  tab5_traits: 'Character Trait Forge (stub)',
  tab6_abilities: 'Step 4: Supernatural Abilities',
  tab7_review: 'Phase IV: Review & Spawn',
}

export type CharacterCreationForgeContext = {
  character: Character & Pick<CharacterRootState, 'creationGenreId'>
  race: Race | undefined
  occ: PalladiumOcc | undefined
  psychicTier: PsychicTier
  supportsDualForm: boolean
}

function stableJson(value: unknown): string {
  return JSON.stringify(value)
}

function tab1Snapshot(c: Character): string {
  return stableJson({
    raceId: c.raceId,
    occId: c.occ.id,
    spec: c.occSpecializationId,
  })
}

function tab2Snapshot(c: Character): string {
  return stableJson({
    pool: c.creationAttributePool,
    assignments: c.creationAttributeAssignments,
    poolSlots: c.creationAttributePoolSlots,
    occVar: c.creationOccVariableResolutions,
  })
}

function tab3Snapshot(c: Character): string {
  return stableJson({
    tier: c.creationPsychicTier,
    chosen: c.creationPsychicTierChosen === true,
    bypassed: c.psychicGateBypassed,
  })
}

function tab4Snapshot(c: Character): string {
  return stableJson({
    occSkills: c.creationOccSkillIds,
    related: c.creationRelatedSkillPicks ?? c.creationRelatedSkillIds,
    secondary: c.creationSecondarySkillPicks ?? c.creationSecondarySkillIds,
    handToHand: c.creationHandToHandTier,
    vouchers: c.creationOccCoreVoucherPicks,
    tier: c.creationPsychicTier,
    raceId: c.raceId,
    occId: c.occ.id,
  })
}

function tab5Snapshot(c: Character): string {
  return stableJson({ traitStub: c.creationTraitForgeStubComplete === true })
}

function tab6Snapshot(c: Character): string {
  return stableJson({ abilities: c.selectedAbilities })
}

export function traitForgeTabApplicable(
  race: Race | undefined,
  _occ: PalladiumOcc | undefined,
): boolean {
  return raceLineageFromDefinition(race) === 'nightbane'
}

export function readForgeCompletion(
  character: Pick<
    CharacterRootState,
    'creationForgeCompleted' | 'creationForgeSnapshots' | 'creationForgeTab'
  >,
): ForgeCompletionState<CharacterCreationForgeTabId> {
  return {
    completed: character.creationForgeCompleted ?? {},
    snapshots: character.creationForgeSnapshots ?? {},
  }
}

export function resolveActiveForgeTab(
  character: CharacterRootState,
): CharacterCreationForgeTabId {
  if (character.creationForgeTab) return character.creationForgeTab
  return legacyPhaseToForgeTab(character.creationPhase)
}

export function legacyPhaseToForgeTab(
  phase: CreationPhase | undefined,
): CharacterCreationForgeTabId {
  switch (phase) {
    case 'configurator':
      return 'tab1_configurator'
    case 'attributes':
    case 'occVariableBonus':
      return 'tab2_attributes'
    case 'psychicGate':
      return 'tab3_psionic'
    case 'skills':
      return 'tab4_skills'
    case 'morphus':
      return 'tab5_traits'
    case 'abilities':
      return 'tab6_abilities'
    case 'review':
      return 'tab7_review'
    default:
      return 'tab1_configurator'
  }
}

export function forgeTabToLegacyPhase(
  tab: CharacterCreationForgeTabId,
): CreationPhase {
  switch (tab) {
    case 'tab1_configurator':
      return 'configurator'
    case 'tab2_attributes':
      return 'attributes'
    case 'tab3_psionic':
      return 'psychicGate'
    case 'tab4_skills':
      return 'skills'
    case 'tab5_traits':
      return 'morphus'
    case 'tab6_abilities':
      return 'abilities'
    case 'tab7_review':
      return 'review'
    default:
      return 'configurator'
  }
}

function assessPsychicTabBlockers(ctx: CharacterCreationForgeContext): string[] {
  if (
    !isCreationPsychicTierComplete(
      ctx.character,
      ctx.occ,
      ctx.character.creationGenreId,
    )
  ) {
    return ['Explicitly select None, Minor, or Major psionic potential.']
  }
  return []
}

function assessAbilitiesMinimumBlockers(
  ctx: CharacterCreationForgeContext,
): string[] {
  const occLib = ctx.occ
  const budget = occLib
    ? occCreationAbilityBudget(occLib)
    : ctx.character.creationAbilityBudget
  if (!creationNeedsAbilitySelection(budget, ctx.character.creationGenreId)) {
    return []
  }
  const abs = ctx.character.selectedAbilities ?? []
  if (abs.length < 1) {
    return ['Pick at least one supernatural ability.']
  }
  return []
}

export function abilitiesHaveOptionalPicksRemaining(
  ctx: CharacterCreationForgeContext,
): boolean {
  const budget = ctx.occ
    ? occCreationAbilityBudget(ctx.occ)
    : ctx.character.creationAbilityBudget
  if (!budget) return false
  const ids = ctx.character.selectedAbilities ?? []
  const spell = ids.filter((id) => getAbilityById(id)?.category === 'Spell').length
  const psionic = ids.filter((id) => getAbilityById(id)?.category === 'Psionic').length
  const talent = ids.filter((id) => getAbilityById(id)?.category === 'Talent').length
  return (
    spell < budget.spellSlots ||
    psionic < budget.psionicSlots ||
    talent < budget.talentSlots
  )
}

function assessSkillsTabBlockers(ctx: CharacterCreationForgeContext): string[] {
  const blockers: string[] = []
  const { character, race, occ } = ctx
  const picksOcc = raceCanPickOcc(race)

  if (picksOcc && occ) {
    const effectiveOcc = resolveEffectivePalladiumOcc(
      occ,
      character.occSpecializationId,
    )
    blockers.push(
      ...assessOccCoreVoucherBlockers(
        occ,
        character.occSpecializationId,
        character.creationOccCoreVoucherPicks ?? {},
        character.creationOccGrantPickDetails,
        character,
      ),
    )
    const relatedBase =
      character.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(occ)
    const relatedPicks = getCreationRelatedPicks(character)
    const occPicks = resolveOccCoreSkillPicks(
      occ,
      character.occSpecializationId,
      character.creationOccCoreVoucherPicks ?? {},
      character.creationOccGrantPickDetails,
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
    blockers.push(
      ...assessRelatedSkillSlotBlockers(
        relatedSelected,
        relatedBase,
        ctx.psychicTier,
        occ,
        handToHandReserved,
      ),
    )
    const secondaryBase = occSecondarySkillSlots(occ)
    blockers.push(
      ...assessSecondarySkillSlotBlockers(
        sumCreationSkillPickSlots(getCreationSecondaryPicks(character)),
        secondaryBase,
        occ,
      ),
    )
  }

  return blockers
}

function buildTabDefinitions(
  ctx: CharacterCreationForgeContext,
): ForgeTabDefinition<CharacterCreationForgeTabId>[] {
  const { character, race, occ } = ctx

  return CHARACTER_CREATION_TAB_ORDER.map((id) => {
    const label = CHARACTER_CREATION_TAB_LABELS[id]
    switch (id) {
      case 'tab1_configurator':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => ({
            ok: assessConfiguratorBlockers(character, race, occ).length === 0,
            blockers: assessConfiguratorBlockers(character, race, occ),
          }),
          snapshot: () => tab1Snapshot(character),
        }
      case 'tab2_attributes':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = [
              ...assessAttributesBlockers(character, occ, race),
              ...assessOccVariableBlockers(character, occ),
            ]
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab2Snapshot(character),
        }
      case 'tab3_psionic':
        return {
          id,
          label,
          isNa: () =>
            !creationPsychicGateRequiresTierChoice(
              character,
              occ,
              character.creationGenreId,
            ),
          validate: () => {
            const blockers = assessPsychicTabBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab3Snapshot(character),
        }
      case 'tab4_skills':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = assessSkillsTabBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab4Snapshot(character),
        }
      case 'tab5_traits':
        return {
          id,
          label,
          isNa: () => !traitForgeTabApplicable(race, occ),
          validate: () => {
            const ok = character.creationTraitForgeStubComplete === true
            return {
              ok,
              blockers: ok
                ? []
                : ['Complete the trait forge placeholder step.'],
            }
          },
          snapshot: () => tab5Snapshot(character),
        }
      case 'tab6_abilities':
        return {
          id,
          label,
          isNa: () => {
            const budget = occ
              ? occCreationAbilityBudget(occ)
              : character.creationAbilityBudget
            return !creationNeedsAbilitySelection(
              budget,
              character.creationGenreId,
            )
          },
          validate: () => {
            const blockers = assessAbilitiesMinimumBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab6Snapshot(character),
        }
      case 'tab7_review':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => ({ ok: true, blockers: [] }),
          snapshot: () => stableJson({ review: true }),
        }
      default:
        return {
          id,
          label,
          isNa: () => true,
          validate: () => ({ ok: true, blockers: [] }),
          snapshot: () => '',
        }
    }
  })
}

export function deriveCharacterCreationForgeNavigation(
  ctx: CharacterCreationForgeContext,
  activeTabId: CharacterCreationForgeTabId,
): ForgeNavigationDerived & { activeTabId: CharacterCreationForgeTabId } {
  const completion = readForgeCompletion(ctx.character)
  const tabDefs = buildTabDefinitions(ctx)

  return deriveForgeNavigation(tabDefs, activeTabId, completion, {
    terminalTabId: 'tab7_review',
    continueHint: (tabId, validation) => {
      if (tabId !== 'tab6_abilities' || !validation.ok) return false
      return abilitiesHaveOptionalPicksRemaining(ctx)
    },
  })
}

export function completeForgeTab(
  character: CharacterRootState,
  tabId: CharacterCreationForgeTabId,
  ctx: CharacterCreationForgeContext,
): Partial<CharacterRootState> {
  const tabDefs = buildTabDefinitions(ctx)
  const tab = tabDefs.find((t) => t.id === tabId)
  if (!tab) return {}
  const prev = readForgeCompletion(character)
  const next = markForgeTabComplete(tabId, tab.snapshot(), prev)
  return {
    creationForgeCompleted: next.completed,
    creationForgeSnapshots: next.snapshots,
  }
}

export function invalidateForgeFromConfiguratorChange(
  character: CharacterRootState,
): Partial<CharacterRootState> {
  const prev = readForgeCompletion(character)
  const next = invalidateForgeCompletionFrom(
    'tab1_configurator',
    CHARACTER_CREATION_TAB_ORDER,
    prev,
  )
  return {
    creationForgeCompleted: next.completed,
    creationForgeSnapshots: next.snapshots,
    creationTraitForgeStubComplete: false,
  }
}

export function assessTab7SpawnBlockers(
  ctx: CharacterCreationForgeContext,
): string[] {
  const alignment = ctx.character.facade.alignment?.trim()
  const blockers = assessCreationSpawnBlockers(ctx.character, {
    psychicTier: ctx.psychicTier,
    supportsDualForm: ctx.supportsDualForm,
  })
  if (!alignment) {
    blockers.push('Select an alignment on the Review tab before spawning.')
  }
  return blockers
}

export function buildCharacterCreationForgeContext(
  character: Character & Pick<CharacterRootState, 'creationGenreId'>,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  psychicTier: PsychicTier,
): CharacterCreationForgeContext {
  return {
    character,
    race,
    occ,
    psychicTier,
    supportsDualForm: raceLineageFromDefinition(race) === 'nightbane',
  }
}
