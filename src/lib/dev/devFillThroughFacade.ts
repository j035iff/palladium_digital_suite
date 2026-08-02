import type { CharacterCreationForgeTabId } from '../../types'
import type {
  CharacterRootState,
  PalladiumOcc,
  PsychicGateMajorAllocation,
  PsychicTier,
  Race,
} from '../../types'
import {
  creationPsychicGateRequiresTierChoice,
  occIsNaturalPsychicClass,
  resolvePsychicGateBypassed,
} from '../creationPhases'
import { resolveCreationPsychicTier } from '../creationPsychicSkills'
import { syncCreationAttributeBranches } from '../creationAttributeSync'
import { retainCharacterRoot } from '../characterRoot'
import { creationInvalidationPatch } from '../creationInvalidate'
import { syncRaceOccPrimarySdc } from '../creationRaceOccSync'
import { rollDiceNotation } from '../diceNotation'
import {
  buildCharacterCreationForgeContext,
  completeForgeTab,
  morphusLedgerUnlockPatchIfEligible,
} from '../forgeNavigation/characterCreationForge'
import { defaultMorphusForgeState } from '../morphusForgeNavigation'
import { getOccSpecialization } from '../occComposition'
import {
  applyOccStartingSkillPicks,
  patchCharacterCreationFromOcc,
} from '../occCreationDerivation'
import { listOccVariableAttributeBonusTasks } from '../occVariableBonus'
import { raceLineageFromDefinition } from '../raceEngine'
import { traitForgeTabApplicable } from '../creationSubForge'
import { applyPrimaryPendingDiceResolutions } from '../spawnVitalityManual'
import { buildDevAutoAttributeCreationState } from './devAutoAssignCreationAttributes'
import { buildDevAutoFillCreationSkillsState } from './devAutoFillCreationSkills'
import { buildAutoRolledPendingDiceResolutions } from './devAutoRollPendingDice'
import { DEV_NIGHTBANE_MORPHUS_ALIGNMENT } from './devSkipToMorphusCreation'

const FACADE_TABS: readonly CharacterCreationForgeTabId[] = [
  'tab1_configurator',
  'tab2_attributes',
  'tab3_psionic',
  'tab4_skills',
  'tab5_finalize',
] as const

export type DevPsychicSetup = {
  tier: PsychicTier
  majorAllocation?: PsychicGateMajorAllocation | null
}

export function resolveDevPsychicSetup(
  prev: CharacterRootState,
  occ: PalladiumOcc | undefined,
  genreId: string,
): DevPsychicSetup {
  if (occIsNaturalPsychicClass(occ)) {
    return { tier: 'master' }
  }

  if (creationPsychicGateRequiresTierChoice(prev, occ, genreId)) {
    if (prev.creationPsychicTierChosen === true) {
      const tier = prev.creationPsychicTier ?? 'none'
      if (tier === 'major') {
        return {
          tier,
          majorAllocation:
            prev.creationPsychicGateMajorAllocation ?? 'mixed_pools',
        }
      }
      return {
        tier,
        majorAllocation: prev.creationPsychicGateMajorAllocation,
      }
    }
    return { tier: 'none' }
  }

  return {
    tier: resolveCreationPsychicTier(prev, 'none'),
    majorAllocation: prev.creationPsychicGateMajorAllocation,
  }
}

/** When the O.C.C. requires a specialization and none is chosen, pick the first. */
export function ensureDevOccSpecialization(
  prev: CharacterRootState,
  occ: PalladiumOcc,
): CharacterRootState {
  const specs = occ.specializations ?? []
  if (!specs.length) return prev
  if (
    prev.occSpecializationId &&
    getOccSpecialization(occ, prev.occSpecializationId)
  ) {
    return prev
  }
  const specializationId = specs[0]!.id
  const withSpec: CharacterRootState = {
    ...prev,
    ...creationInvalidationPatch(prev, 'specialization'),
    occSpecializationId: specializationId,
  }
  return syncRaceOccPrimarySdc(
    syncCreationAttributeBranches(
      retainCharacterRoot(
        prev,
        applyOccStartingSkillPicks(
          patchCharacterCreationFromOcc(withSpec, occ),
          occ,
        ),
      ),
      occ,
    ),
  )
}

function rollOccVariableAttributeBonuses(
  prev: CharacterRootState,
  occ: PalladiumOcc,
): CharacterRootState {
  const tasks = listOccVariableAttributeBonusTasks(
    occ,
    prev.occSpecializationId,
  )
  if (!tasks.length) return prev
  const resolutions = { ...(prev.creationOccVariableResolutions ?? {}) }
  let changed = false
  for (const task of tasks) {
    const existing = resolutions[task.id]
    if (
      typeof existing === 'number' &&
      Number.isFinite(existing) &&
      existing >= task.min &&
      existing <= task.max
    ) {
      continue
    }
    try {
      const rolled = rollDiceNotation(task.notation)
      resolutions[task.id] = Math.max(task.min, Math.min(task.max, rolled))
    } catch {
      resolutions[task.id] = task.min
    }
    changed = true
  }
  if (!changed) return prev
  return {
    ...prev,
    creationOccVariableResolutions: resolutions,
  }
}

function markFacadeTabsComplete(
  state: CharacterRootState,
  race: Race,
  occ: PalladiumOcc,
  psychicTier: PsychicTier,
): CharacterRootState {
  const ctx = buildCharacterCreationForgeContext(
    { ...state, creationGenreId: state.creationGenreId },
    race,
    occ,
    psychicTier,
  )
  let next = state
  for (const tabId of FACADE_TABS) {
    next = { ...next, ...completeForgeTab(next, tabId, ctx) }
  }
  return next
}

export type DevFillThroughFacadeOpts = {
  /** Open Morphus Sub-Forge after facade dice, or stop after Roll Pending. */
  endAt: 'morphus' | 'finalize'
}

/**
 * Dev-only: keep current race/O.C.C., fill attributes/skills/pending dice through
 * facade finalize (and optionally park on Morphus Traits).
 */
export function buildDevFillThroughFacadeState(
  prev: CharacterRootState,
  race: Race,
  occ: PalladiumOcc,
  opts: DevFillThroughFacadeOpts,
): CharacterRootState {
  const genreId = prev.creationGenreId ?? prev.hostGenreId ?? 'nightbane'
  let next = ensureDevOccSpecialization(prev, occ)
  const psychic = resolveDevPsychicSetup(next, occ, genreId)
  const supportsDualForm = raceLineageFromDefinition(race) === 'nightbane'
  const openMorphus =
    opts.endAt === 'morphus' && traitForgeTabApplicable(race, occ)

  next = {
    ...next,
    lineage: raceLineageFromDefinition(race),
    psychicGateBypassed: resolvePsychicGateBypassed(next.raceId, occ, genreId),
    creationPsychicTier: psychic.tier,
    creationPsychicTierChosen: true,
    creationPsychicGateMajorAllocation: psychic.majorAllocation ?? undefined,
    primary: {
      ...next.primary,
      alignment: next.primary.alignment?.trim() || DEV_NIGHTBANE_MORPHUS_ALIGNMENT,
    },
  }

  next = buildDevAutoAttributeCreationState(next, race.attributes, occ)
  next = rollOccVariableAttributeBonuses(next, occ)
  next = syncRaceOccPrimarySdc(syncCreationAttributeBranches(next, occ))

  next = buildDevAutoFillCreationSkillsState(
    next,
    occ,
    next.hostGenreId ?? next.creationGenreId,
    psychic.tier,
  )

  const resolutions = buildAutoRolledPendingDiceResolutions(next, race, occ, {
    supportsDualForm,
    psychicTier: psychic.tier,
    scope: supportsDualForm ? 'primary' : 'all',
  })
  next = {
    ...next,
    creationPendingDiceResolutions: {
      ...(next.creationPendingDiceResolutions ?? {}),
      ...resolutions,
    },
  }

  next = applyPrimaryPendingDiceResolutions(next, race, occ, {
    supportsDualForm,
    psychicTier: psychic.tier,
  })

  next = markFacadeTabsComplete(next, race, occ, psychic.tier)

  if (!openMorphus) {
    return {
      ...next,
      creationForgeTab: 'tab5_finalize',
      creationPhase: 'finalize',
    }
  }

  return {
    ...next,
    morphusForgeState: defaultMorphusForgeState(),
    creationTraitForgeStubComplete: false,
    creationMorphusDiceFinalized: false,
    creationForgeTab: 'tab6_traits',
    creationPhase: 'morphus',
    ...morphusLedgerUnlockPatchIfEligible(
      next,
      'tab6_traits',
      race,
      occ,
      psychic.tier,
    ),
  }
}
