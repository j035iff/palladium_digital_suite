import { getFeatureById, getLibraryOccById } from '../data/library/registry'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import { getAbilityById } from '../data/abilityLibrary'
import { resolveEffectiveCreationAbilityBudget } from './creationAbilityBudget'
import { creationNeedsAbilitySelection } from './creationPhases'
import { resolveCreationPsychicTier } from './creationPsychicSkills'
import { featureBudgetCategory } from './featureEngine'
import {
  abilityPassesOccSupernaturalRules,
  occStartingSpellLevelCap,
} from './occCreationDerivation'
import { occSupernaturalGrantedAbilityIds } from './occSupernaturalGrants'
import {
  listGatePsionicSelections,
  psychicGatePsionicPickAllowed,
  psychicGatePsionicRulesApply,
  psychicGateRequiredPickCount,
} from './psychicGatePsionicBudget'
import {
  occEnginePsionicPickAllowed,
  occEnginePsionicRulesApply,
} from './occSupernaturalSelection'
import type { CharacterRootState } from '../types'

/** Returns updated character if the pick is legal; otherwise null. */
export function nextCharacterIfAddAbility(
  prev: CharacterRootState,
  id: string,
): CharacterRootState | null {
  if (isGenreSupernaturalAbilitiesDisallowed(prev.creationGenreId)) return null
  const def = getFeatureById(id)
  if (!def) return null
  const selected = prev.selectedAbilities ?? []
  if (selected.includes(id)) return null

  const occRow = getLibraryOccById(prev.occ.id)
  const tier = resolveCreationPsychicTier(prev, prev.creationPsychicTier ?? 'none')
  const abilityBudget = resolveEffectiveCreationAbilityBudget({
    occ: occRow,
    raceId: prev.raceId,
    psychicTier: tier,
    psychicGateBypassed: prev.psychicGateBypassed === true,
    majorAllocation: prev.creationPsychicGateMajorAllocation,
    storedBudget: prev.creationAbilityBudget,
    creationGenreId: prev.creationGenreId ?? prev.hostGenreId,
    hostGenreId: prev.hostGenreId,
  })
  if (!creationNeedsAbilitySelection(abilityBudget, prev.creationGenreId)) {
    return null
  }
  const spellCap = occRow
    ? occStartingSpellLevelCap(occRow)
    : (prev.startingSpellLevelCap ?? 4)
  const cat = featureBudgetCategory(def)
  const spellLevel =
    typeof def.metadata?.level === 'number'
      ? def.metadata.level
      : typeof def.metadata?.spellLevel === 'number'
        ? def.metadata.spellLevel
        : undefined

  const genreId = prev.creationGenreId ?? prev.hostGenreId
  if (occRow) {
    const gate = abilityPassesOccSupernaturalRules(
      occRow,
      def,
      spellCap,
      genreId,
    )
    if (!gate.allowed) return null
  } else if (cat === 'Spell' && spellLevel != null && spellLevel > spellCap) {
    return null
  }

  const grantedIds = new Set(
    occSupernaturalGrantedAbilityIds(occRow, prev.occSpecializationId),
  )

  const countCat = (c: 'Spell' | 'Psionic' | 'Talent') =>
    selected.filter((x) => {
      if (grantedIds.has(x)) return false
      const f = getFeatureById(x)
      return f != null && featureBudgetCategory(f) === c
    }).length

  if (cat === 'Psionic') {
    const psychicGate = psychicGatePsionicPickAllowed({
      tier,
      majorAllocation: prev.creationPsychicGateMajorAllocation,
      psychicGateBypassed: prev.psychicGateBypassed === true,
      occ: occRow,
      selectedIds: selected,
      candidateId: id,
      genreId: genreId ?? 'nightbane',
    })
    if (psychicGate && !psychicGate.allowed) return null

    const occEngine = occEnginePsionicPickAllowed({
      occ: occRow,
      selectedIds: selected,
      candidateId: id,
      genreId: genreId ?? 'nightbane',
      grantedIds: [...grantedIds],
    })
    if (occEngine && !occEngine.allowed) return null
  }

  if (cat === 'Spell' && countCat('Spell') >= abilityBudget.spellSlots) return null
  if (cat === 'Psionic') {
    const gateApplies = psychicGatePsionicRulesApply(
      occRow,
      tier,
      prev.psychicGateBypassed === true,
    )
    if (gateApplies) {
      const required =
        psychicGateRequiredPickCount(tier, prev.creationPsychicGateMajorAllocation) ??
        abilityBudget.psionicSlots
      const gateTotal = listGatePsionicSelections(
        selected,
        genreId ?? 'nightbane',
      ).length
      if (gateTotal >= required) return null
    } else if (!occEnginePsionicRulesApply(occRow)) {
      if (countCat('Psionic') >= abilityBudget.psionicSlots) return null
    }
  }
  if (cat === 'Talent' && countCat('Talent') >= abilityBudget.talentSlots) return null
  if (!cat) return null

  return { ...prev, selectedAbilities: [...selected, id] }
}

/** True when `id` is already selected or is an O.C.C.-granted ability. */
export function isAbilityAlreadyAccountedFor(
  prev: CharacterRootState,
  id: string,
): boolean {
  if ((prev.selectedAbilities ?? []).includes(id)) return true
  const occRow = getLibraryOccById(prev.occ.id)
  return occSupernaturalGrantedAbilityIds(occRow, prev.occSpecializationId).includes(
    id,
  )
}

export function selectedAbilityIsCategory(
  id: string,
  category: 'Spell' | 'Psionic' | 'Talent',
): boolean {
  return getAbilityById(id)?.category === category
}
