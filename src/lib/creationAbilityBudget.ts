import { getAbilityById } from '../data/abilityLibrary'
import { creationNeedsAbilitySelection } from './creationPhases'
import {
  occCreationAbilityBudget,
  type OccCreationAbilityBudget,
} from './occCreationDerivation'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import {
  assessPsychicGatePsionicBlockers,
  psychicGatePsionicRulesApply,
  resolveGateAwareCreationAbilityBudget,
  type PsychicGateMajorAllocation,
} from './psychicGatePsionicBudget'
import { assessOccEnginePsionicBlockers, occEnginePsionicRulesApply } from './occSupernaturalSelection'
import { occSupernaturalGrantedAbilityIds } from './occSupernaturalGrants'
import type { PalladiumOcc, PsychicTier } from '../types'

export type AbilityBudgetCounts = {
  spell: number
  psionic: number
  talent: number
}

export type AbilityBudgetKind = keyof AbilityBudgetCounts

export type AbilityBudgetShortfall = {
  kind: AbilityBudgetKind
  selected: number
  required: number
  remaining: number
}

export function countSelectedAbilitiesByBudgetCategory(
  selectedIds: readonly string[] | undefined | null,
  excludeGrantedIds?: readonly string[],
): AbilityBudgetCounts {
  const granted = new Set(excludeGrantedIds ?? [])
  const ids = (selectedIds ?? []).filter((id) => !granted.has(id))
  return {
    spell: ids.filter((id) => getAbilityById(id)?.category === 'Spell').length,
    psionic: ids.filter((id) => getAbilityById(id)?.category === 'Psionic').length,
    talent: ids.filter((id) => getAbilityById(id)?.category === 'Talent').length,
  }
}

export function listAbilityBudgetShortfalls(
  budget: OccCreationAbilityBudget,
  counts: AbilityBudgetCounts,
): AbilityBudgetShortfall[] {
  const out: AbilityBudgetShortfall[] = []
  const lanes: AbilityBudgetKind[] = ['spell', 'psionic', 'talent']
  for (const kind of lanes) {
    const required = budget[`${kind}Slots`]
    const selected = counts[kind]
    if (required > 0 && selected < required) {
      out.push({
        kind,
        selected,
        required,
        remaining: required - selected,
      })
    }
  }
  return out
}

export function formatAbilityBudgetShortfall(shortfall: AbilityBudgetShortfall): string {
  const { kind, remaining, selected, required } = shortfall
  const noun =
    kind === 'spell'
      ? remaining === 1
        ? 'spell'
        : 'spells'
      : kind === 'psionic'
        ? remaining === 1
          ? 'psionic power'
          : 'psionic powers'
        : remaining === 1
          ? 'talent'
          : 'talents'
  return `Select ${remaining} more ${noun} (${selected}/${required})`
}

export function formatAbilityBudgetRequirementLabel(
  kind: AbilityBudgetKind,
  selected: number,
  required: number,
): string {
  const satisfied = selected >= required
  if (satisfied) {
    const noun =
      kind === 'spell' ? 'Spells' : kind === 'psionic' ? 'Psionics' : 'Talents'
    return `${noun} selected (${selected}/${required})`
  }
  return formatAbilityBudgetShortfall({
    kind,
    selected,
    required,
    remaining: required - selected,
  })
}

export type ResolveCreationAbilityBudgetInput = {
  occ?: PalladiumOcc
  psychicTier?: PsychicTier
  psychicGateBypassed?: boolean
  majorAllocation?: PsychicGateMajorAllocation | null
  storedBudget?: OccCreationAbilityBudget | null
  creationGenreId?: string
}

/** O.C.C. engines plus Psychic Gate tier grants (Minor/Major). */
export function resolveEffectiveCreationAbilityBudget(
  input: ResolveCreationAbilityBudgetInput,
): OccCreationAbilityBudget {
  if (input.creationGenreId && isGenreSupernaturalAbilitiesDisallowed(input.creationGenreId)) {
    return { spellSlots: 0, psionicSlots: 0, talentSlots: 0 }
  }

  return resolveGateAwareCreationAbilityBudget(input)
}

export type AssessAbilitiesBudgetInput = {
  budget: OccCreationAbilityBudget | undefined | null
  creationGenreId?: string
  selectedIds?: readonly string[] | null
  occ?: PalladiumOcc
  psychicTier?: PsychicTier
  psychicGateBypassed?: boolean
  majorAllocation?: PsychicGateMajorAllocation | null
}

export function assessAbilitiesBudgetBlockers(
  input: AssessAbilitiesBudgetInput | OccCreationAbilityBudget | undefined | null,
  creationGenreId?: string,
  selectedIds?: readonly string[] | null,
): string[] {
  const resolved: AssessAbilitiesBudgetInput =
    input != null && typeof input === 'object' && 'budget' in input
      ? input
      : {
          budget: input as OccCreationAbilityBudget | undefined | null,
          creationGenreId,
          selectedIds,
        }

  const {
    budget,
    creationGenreId: genreId,
    selectedIds: picks,
    occ,
    psychicTier = 'none',
    psychicGateBypassed = false,
    majorAllocation,
  } = resolved

  if (!budget || !creationNeedsAbilitySelection(budget, genreId)) {
    return []
  }

  const gateBlockers = assessPsychicGatePsionicBlockers({
    occ,
    tier: psychicGateBypassed ? 'none' : psychicTier,
    psychicGateBypassed,
    majorAllocation,
    selectedIds: picks,
    genreId,
  })
  if (
    psychicGatePsionicRulesApply(
      occ,
      psychicGateBypassed ? 'none' : psychicTier,
      psychicGateBypassed,
    )
  ) {
    return gateBlockers
  }

  const occEngineBlockers = assessOccEnginePsionicBlockers({
    occ,
    selectedIds: picks,
    genreId,
  })
  if (occEnginePsionicRulesApply(occ)) {
    return occEngineBlockers
  }

  const grantedIds = occ
    ? occSupernaturalGrantedAbilityIds(occ, undefined)
    : []
  const counts = countSelectedAbilitiesByBudgetCategory(picks, grantedIds)
  return listAbilityBudgetShortfalls(budget, counts).map(formatAbilityBudgetShortfall)
}

export function abilitiesBudgetIsFull(
  budget: OccCreationAbilityBudget,
  counts: AbilityBudgetCounts,
): boolean {
  return listAbilityBudgetShortfalls(budget, counts).length === 0
}
