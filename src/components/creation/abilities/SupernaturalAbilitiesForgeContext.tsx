import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  allowedSupernaturalAbilityLanes,
  isSupernaturalAbilityLaneAllowed,
  type SupernaturalAbilityForgeLane,
} from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'
import { countSelectedAbilitiesByBudgetCategory } from '../../../lib/creationAbilityBudget'
import { resolveEffectiveCreationAbilityBudget } from '../../../lib/creationAbilityBudget'
import { occSupernaturalGrantedAbilityIds } from '../../../lib/occSupernaturalGrants'
import {
  SupernaturalAbilitiesForgeContext,
} from './supernaturalAbilitiesForgeCtx'

export function SupernaturalAbilitiesForgeProvider({
  children,
}: {
  children: ReactNode
}) {
  const {
    character,
    activeOcc,
    activeForm,
    occCreationDerived,
    supportsDualForm,
    psychicTier,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const isNightbane = character.lineage === 'nightbane'
  const genreId = character.creationGenreId ?? character.hostGenreId ?? 'nightbane'
  const occName = activeOcc?.name

  const budget = useMemo(
    () =>
      resolveEffectiveCreationAbilityBudget({
        occ: activeOcc,
        raceId: character.raceId,
        psychicTier,
        psychicGateBypassed: character.psychicGateBypassed === true,
        majorAllocation: character.creationPsychicGateMajorAllocation,
        storedBudget:
          occCreationDerived?.abilityBudget ?? character.creationAbilityBudget,
        creationGenreId: genreId,
        hostGenreId: character.hostGenreId,
      }),
    [
      activeOcc,
      character.raceId,
      psychicTier,
      character.psychicGateBypassed,
      character.creationPsychicGateMajorAllocation,
      occCreationDerived?.abilityBudget,
      character.creationAbilityBudget,
      genreId,
      character.hostGenreId,
    ],
  )
  const spellCap =
    occCreationDerived?.startingSpellLevelCap ??
    character.startingSpellLevelCap ??
    4

  const [activeLane, setActiveLane] = useState<SupernaturalAbilityForgeLane>(
    () => allowedSupernaturalAbilityLanes(budget)[0] ?? 'magic',
  )

  useEffect(() => {
    const allowed = allowedSupernaturalAbilityLanes(budget)
    if (allowed.length === 0) return
    setActiveLane((lane) =>
      isSupernaturalAbilityLaneAllowed(budget, lane) ? lane : allowed[0],
    )
  }, [budget])

  const selectedIds = useMemo(
    () => character.selectedAbilities ?? [],
    [character.selectedAbilities],
  )
  const counts = useMemo(() => {
    const grantedIds = occSupernaturalGrantedAbilityIds(
      activeOcc,
      character.occSpecializationId,
    )
    return countSelectedAbilitiesByBudgetCategory(selectedIds, grantedIds)
  }, [selectedIds, activeOcc, character.occSpecializationId])

  const activeLaneAllowed = isSupernaturalAbilityLaneAllowed(budget, activeLane)

  const value = useMemo(
    () => ({
      morphus,
      isNightbane,
      genreId,
      occName,
      activeOcc,
      occCreationDerived,
      budget,
      psychicTier,
      psychicGateBypassed: character.psychicGateBypassed === true,
      majorAllocation: character.creationPsychicGateMajorAllocation,
      spellCap,
      activeLane,
      setActiveLane,
      counts,
      selectedIds,
      activeLaneAllowed,
    }),
    [
      morphus,
      isNightbane,
      genreId,
      occName,
      activeOcc,
      occCreationDerived,
      budget,
      psychicTier,
      character.psychicGateBypassed,
      character.creationPsychicGateMajorAllocation,
      spellCap,
      activeLane,
      counts,
      selectedIds,
      activeLaneAllowed,
    ],
  )

  return (
    <SupernaturalAbilitiesForgeContext.Provider value={value}>
      {children}
    </SupernaturalAbilitiesForgeContext.Provider>
  )
}
