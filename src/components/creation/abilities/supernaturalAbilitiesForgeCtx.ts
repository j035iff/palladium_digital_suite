import { createContext } from 'react'
import type { useCharacter } from '../../../context/CharacterContext'
import type { SupernaturalAbilityForgeLane } from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'
import type { OccCreationAbilityBudget } from '../../../lib/occCreationDerivation'

export type SupernaturalAbilitiesForgeContextValue = {
  morphus: boolean
  isNightbane: boolean
  genreId: string
  occName?: string
  activeOcc: ReturnType<typeof useCharacter>['activeOcc']
  occCreationDerived: ReturnType<typeof useCharacter>['occCreationDerived']
  budget: OccCreationAbilityBudget
  psychicTier: ReturnType<typeof useCharacter>['psychicTier']
  psychicGateBypassed: boolean
  majorAllocation?: ReturnType<
    typeof useCharacter
  >['character']['creationPsychicGateMajorAllocation']
  spellCap: number
  activeLane: SupernaturalAbilityForgeLane
  setActiveLane: (lane: SupernaturalAbilityForgeLane) => void
  counts: { spell: number; psionic: number; talent: number }
  selectedIds: readonly string[]
  activeLaneAllowed: boolean
}

export const SupernaturalAbilitiesForgeContext =
  createContext<SupernaturalAbilitiesForgeContextValue | null>(null)
