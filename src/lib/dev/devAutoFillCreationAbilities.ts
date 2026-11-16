import type { CharacterRootState } from '../../types'
import {
  getLibraryOccById,
  getRaceById,
  listPalladiumPsionicsForGenre,
  listPalladiumTalentsForGameSystem,
  raceCatalogGenreId,
} from '../../data/library/registry'
import {
  assessAbilitiesBudgetBlockers,
  resolveEffectiveCreationAbilityBudget,
} from '../creationAbilityBudget'
import { creationNeedsAbilitySelection } from '../creationPhases'
import { creationTalentsAvailable } from '../creationChromeGates'
import { resolveCreationPsychicTier } from '../creationPsychicSkills'
import { nextCharacterIfAddAbility } from '../creationAbilityPick'
import { resolveMorphusForgeState } from '../morphusForgeNavigation'
import { occStartingSpellLevelCap } from '../occCreationDerivation'
import { resolveSpellsForOcc } from '../spellAccessResolver'
import {
  magicRowIsSelectable,
  psionicRowIsSelectable,
} from '../supernaturalAbilityDisplay'
import {
  assessTalentSelectionGate,
  collectCharacterMorphusTableIds,
  CREATION_CHARACTER_LEVEL,
} from '../talentSelectionGates'
import { resolveDevPsychicSetup } from './devFillThroughFacade'
import { shuffledCopy } from './devRandomPick'

const MAX_ABILITY_FILL_STEPS = 80

function ensureDevPsychicFields(prev: CharacterRootState): CharacterRootState {
  const occ = getLibraryOccById(prev.occ.id)
  const genreId = prev.creationGenreId ?? prev.hostGenreId ?? 'nightbane'
  const psychic = resolveDevPsychicSetup(prev, occ, genreId)
  return {
    ...prev,
    creationPsychicTier: psychic.tier,
    creationPsychicTierChosen: true,
    creationPsychicGateMajorAllocation:
      psychic.majorAllocation ?? prev.creationPsychicGateMajorAllocation,
  }
}

/**
 * Dev-only: fill spell / psionic / talent picks until ability budget blockers clear.
 * Picks randomly among currently legal candidates (same eligibility as manual selection).
 */
export function buildDevAutoFillCreationAbilitiesState(
  prev: CharacterRootState,
): CharacterRootState {
  let next = ensureDevPsychicFields(prev)
  const occ = getLibraryOccById(next.occ.id)
  if (!occ) return next

  const genreId = next.creationGenreId ?? next.hostGenreId ?? 'nightbane'
  const race = getRaceById(
    next.raceId,
    raceCatalogGenreId(next.hostGenreId, next.creationGenreId),
  )
  const tier = resolveCreationPsychicTier(next, next.creationPsychicTier ?? 'none')
  const budget = resolveEffectiveCreationAbilityBudget({
    occ,
    raceId: next.raceId,
    psychicTier: tier,
    psychicGateBypassed: next.psychicGateBypassed === true,
    majorAllocation: next.creationPsychicGateMajorAllocation,
    storedBudget: next.creationAbilityBudget,
    creationGenreId: genreId,
    hostGenreId: next.hostGenreId,
  })
  if (!creationNeedsAbilitySelection(budget, genreId)) return next

  const spellCap = occStartingSpellLevelCap(occ)
  const forgeState = resolveMorphusForgeState(next)
  const morphusTableIds = collectCharacterMorphusTableIds(
    forgeState,
    next.morphusForgeSlotState,
    next.morphusTraitSlotResolutions,
  )
  const talentsOpen = creationTalentsAvailable(race, occ)

  for (let step = 0; step < MAX_ABILITY_FILL_STEPS; step += 1) {
    const blockers = assessAbilitiesBudgetBlockers({
      budget,
      creationGenreId: genreId,
      selectedIds: next.selectedAbilities,
      occ,
      psychicTier: tier,
      psychicGateBypassed: next.psychicGateBypassed === true,
      majorAllocation: next.creationPsychicGateMajorAllocation,
    })
    if (blockers.length === 0) break

    const spellIds = resolveSpellsForOcc(occ, {
      gameSystem: genreId,
      characterLevel: CREATION_CHARACTER_LEVEL,
      spellCap,
      genreId,
    })
      .filter(
        (row) =>
          row.pickGate.allowed &&
          magicRowIsSelectable(row.spell, {
            activeOcc: occ,
            spellCap,
            genreId,
            selectedIds: next.selectedAbilities,
          }),
      )
      .map((row) => row.spell.id)

    const psionicIds = listPalladiumPsionicsForGenre(genreId)
      .filter((row) =>
        psionicRowIsSelectable(row, {
          activeOcc: occ,
          spellCap,
          genreId,
          psychicTier: tier,
          psychicGateBypassed: next.psychicGateBypassed === true,
          majorAllocation: next.creationPsychicGateMajorAllocation,
          selectedIds: next.selectedAbilities,
        }),
      )
      .map((row) => row.id)

    const talentIds = talentsOpen
      ? listPalladiumTalentsForGameSystem(genreId)
          .filter((talent) => {
            const gate = assessTalentSelectionGate(talent, {
              characterLevel: CREATION_CHARACTER_LEVEL,
              morphusTableIds,
              selectedTalentIds: next.selectedAbilities ?? [],
              activeOcc: occ,
              spellCap,
            })
            return gate.selectable && !gate.locked
          })
          .map((talent) => talent.id)
      : []

    const candidates = shuffledCopy([...spellIds, ...psionicIds, ...talentIds])
    let progressed = false
    for (const id of candidates) {
      const added = nextCharacterIfAddAbility(next, id)
      if (!added) continue
      next = added
      progressed = true
      break
    }
    if (!progressed) break
  }

  return next
}
