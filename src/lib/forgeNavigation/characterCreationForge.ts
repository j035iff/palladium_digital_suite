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
import { assessIdentitySpawnBlockers } from '../characterIdentity'
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
  occRelatedSkillSlotBudget,
  occSecondarySkillSlots,
} from '../occCreationDerivation'
import { raceCanPickOcc, raceLineageFromDefinition } from '../raceEngine'
import {
  assessAbilitiesBudgetBlockers,
  resolveEffectiveCreationAbilityBudget,
} from '../creationAbilityBudget'
import {
  listPendingDiceBlocks,
  pendingDiceBlocksResolutionComplete,
} from '../pendingDiceLedger'
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
    'tab5_finalize',
    'tab6_traits',
    'tab7_abilities',
    'tab8_review',
  ] as const

export const CHARACTER_CREATION_TAB_LABELS: Record<
  CharacterCreationForgeTabId,
  string
> = {
  tab1_configurator: 'Race & O.C.C.',
  tab2_attributes: 'Attributes',
  tab3_psionic: 'Psionic',
  tab4_skills: 'Skills',
  tab5_finalize: 'Roll Pending',
  tab6_traits: 'Traits',
  tab7_abilities: 'Abilities',
  tab8_review: 'Review & Spawn',
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
  tab5_finalize: 'Phase II: Roll Pending Dice',
  tab6_traits: 'Character Trait Forge (stub)',
  tab7_abilities: 'Step 4: Supernatural Abilities',
  tab8_review: 'Phase IV: Review & Spawn',
}

const LEGACY_FORGE_TAB_IDS: Record<string, CharacterCreationForgeTabId> = {
  tab5_traits: 'tab6_traits',
  tab6_abilities: 'tab7_abilities',
  tab7_review: 'tab8_review',
}

function migrateForgeTabId(
  tab: string | undefined,
): CharacterCreationForgeTabId | undefined {
  if (!tab) return undefined
  return LEGACY_FORGE_TAB_IDS[tab] ?? (tab as CharacterCreationForgeTabId)
}

function migrateForgeCompletionState(
  completed: Readonly<Partial<Record<string, true>>>,
  snapshots: Readonly<Partial<Record<string, string>>>,
): ForgeCompletionState<CharacterCreationForgeTabId> {
  const nextCompleted: Partial<Record<CharacterCreationForgeTabId, true>> = {
    ...(completed as Partial<Record<CharacterCreationForgeTabId, true>>),
  }
  const nextSnapshots: Partial<Record<CharacterCreationForgeTabId, string>> = {
    ...(snapshots as Partial<Record<CharacterCreationForgeTabId, string>>),
  }

  const pairs: [string, CharacterCreationForgeTabId][] = [
    ['tab5_traits', 'tab6_traits'],
    ['tab6_abilities', 'tab7_abilities'],
    ['tab7_review', 'tab8_review'],
  ]
  for (const [legacy, modern] of pairs) {
    if (nextCompleted[legacy as CharacterCreationForgeTabId]) {
      nextCompleted[modern] = true
      delete nextCompleted[legacy as CharacterCreationForgeTabId]
    }
    if (nextSnapshots[legacy as CharacterCreationForgeTabId]) {
      nextSnapshots[modern] = nextSnapshots[legacy as CharacterCreationForgeTabId]
      delete nextSnapshots[legacy as CharacterCreationForgeTabId]
    }
  }

  return { completed: nextCompleted, snapshots: nextSnapshots }
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

/** Upstream inputs that change which facade / single-form dice blocks exist. */
function tab5Snapshot(c: Character): string {
  return stableJson({
    occSkills: c.creationOccSkillIds,
    related: c.creationRelatedSkillPicks ?? c.creationRelatedSkillIds,
    secondary: c.creationSecondarySkillPicks ?? c.creationSecondarySkillIds,
    handToHand: c.creationHandToHandTier,
    vouchers: c.creationOccCoreVoucherPicks,
    raceId: c.raceId,
    occId: c.occ.id,
    spec: c.occSpecializationId,
    assignments: c.creationAttributeAssignments,
    occVar: c.creationOccVariableResolutions,
    psychicTier: c.creationPsychicTier,
    bypassed: c.psychicGateBypassed,
  })
}

/** Morphus trait forge — upstream only; morphus dice live entirely on this tab. */
function tab6Snapshot(c: Character): string {
  return stableJson({
    traitStub: c.creationTraitForgeStubComplete === true,
    raceId: c.raceId,
    occId: c.occ.id,
    assignments: c.creationAttributeAssignments,
  })
}

function tab7Snapshot(c: Character): string {
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
  return migrateForgeCompletionState(
    character.creationForgeCompleted ?? {},
    character.creationForgeSnapshots ?? {},
  )
}

/** Gate for “Save for Later” — Race & O.C.C. Continue must be clicked first. */
export function canSaveCreationForLater(
  character: Pick<CharacterRootState, 'creationForgeCompleted'>,
): boolean {
  return character.creationForgeCompleted?.tab1_configurator === true
}

export function resolveActiveForgeTab(
  character: CharacterRootState,
): CharacterCreationForgeTabId {
  const migrated = migrateForgeTabId(character.creationForgeTab)
  if (migrated) return migrated
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
    case 'finalize':
      return 'tab5_finalize'
    case 'morphus':
      return 'tab6_traits'
    case 'abilities':
      return 'tab7_abilities'
    case 'review':
      return 'tab8_review'
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
    case 'tab5_finalize':
      return 'finalize'
    case 'tab6_traits':
      return 'morphus'
    case 'tab7_abilities':
      return 'abilities'
    case 'tab8_review':
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

function resolveCreationAbilityBudget(ctx: CharacterCreationForgeContext) {
  return resolveEffectiveCreationAbilityBudget({
    occ: ctx.occ,
    psychicTier: ctx.psychicTier,
    psychicGateBypassed: ctx.character.psychicGateBypassed === true,
    majorAllocation: ctx.character.creationPsychicGateMajorAllocation,
    storedBudget: ctx.character.creationAbilityBudget,
    creationGenreId: ctx.character.creationGenreId,
  })
}

function assessAbilitiesTabBlockers(ctx: CharacterCreationForgeContext): string[] {
  return assessAbilitiesBudgetBlockers({
    budget: resolveCreationAbilityBudget(ctx),
    creationGenreId: ctx.character.creationGenreId,
    selectedIds: ctx.character.selectedAbilities,
    occ: ctx.occ,
    psychicTier: ctx.psychicTier,
    psychicGateBypassed: ctx.character.psychicGateBypassed === true,
    majorAllocation: ctx.character.creationPsychicGateMajorAllocation,
  })
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

function finalizeDiceScope(ctx: CharacterCreationForgeContext) {
  return ctx.supportsDualForm ? ('facade' as const) : ('all' as const)
}

function assessFinalizeTabBlockers(ctx: CharacterCreationForgeContext): string[] {
  const blocks = listPendingDiceBlocks(ctx.character, ctx.race, ctx.occ, {
    supportsDualForm: ctx.supportsDualForm,
    psychicTier: ctx.psychicTier,
    scope: finalizeDiceScope(ctx),
  })
  if (blocks.length === 0) return []
  if (
    !pendingDiceBlocksResolutionComplete(
      blocks,
      ctx.character.creationPendingDiceResolutions ?? {},
    )
  ) {
    return ['Enter all physical die results before continuing.']
  }
  return []
}

function assessTraitsTabBlockers(ctx: CharacterCreationForgeContext): string[] {
  const blockers: string[] = []
  if (ctx.supportsDualForm && ctx.character.creationFacadeDiceFinalized !== true) {
    blockers.push('Complete Facade dice on the Roll Pending tab first.')
  }
  const morphusBlocks = listPendingDiceBlocks(ctx.character, ctx.race, ctx.occ, {
    supportsDualForm: ctx.supportsDualForm,
    psychicTier: ctx.psychicTier,
    scope: 'morphus',
  })
  if (
    morphusBlocks.length > 0 &&
    !pendingDiceBlocksResolutionComplete(
      morphusBlocks,
      ctx.character.creationPendingDiceResolutions ?? {},
    )
  ) {
    blockers.push('Enter all Morphus physical die results.')
  }
  if (ctx.character.creationTraitForgeStubComplete !== true) {
    blockers.push('Complete the trait forge placeholder step.')
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
      case 'tab5_finalize':
        return {
          id,
          label,
          isNa: () => false,
          validate: () => {
            const blockers = assessFinalizeTabBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab5Snapshot(character),
        }
      case 'tab6_traits':
        return {
          id,
          label,
          isNa: () => !traitForgeTabApplicable(race, occ),
          validate: () => {
            const blockers = assessTraitsTabBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab6Snapshot(character),
        }
      case 'tab7_abilities':
        return {
          id,
          label,
          isNa: () => {
            const budget = resolveEffectiveCreationAbilityBudget({
              occ,
              psychicTier: ctx.psychicTier,
              psychicGateBypassed: character.psychicGateBypassed === true,
              majorAllocation: character.creationPsychicGateMajorAllocation,
              storedBudget: character.creationAbilityBudget,
              creationGenreId: character.creationGenreId,
            })
            return !creationNeedsAbilitySelection(
              budget,
              character.creationGenreId,
            )
          },
          validate: () => {
            const blockers = assessAbilitiesTabBlockers(ctx)
            return { ok: blockers.length === 0, blockers }
          },
          snapshot: () => tab7Snapshot(character),
        }
      case 'tab8_review':
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
    terminalTabId: 'tab8_review',
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
    creationFacadeDiceFinalized: false,
    creationMorphusDiceFinalized: false,
  }
}

export function assessTab8SpawnBlockers(
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
  blockers.push(
    ...assessIdentitySpawnBlockers(
      ctx.character.name,
      ctx.character.identityProfile,
    ),
  )
  return blockers
}

/** @deprecated Use {@link assessTab8SpawnBlockers}. */
export const assessTab7SpawnBlockers = assessTab8SpawnBlockers

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
