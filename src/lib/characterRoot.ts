import type { GenreId } from '../data/genres'
import { resolvePsychicGateBypassed } from './creationPhases'
import type { Character, CharacterOcc, CharacterRootState } from '../types'

/** Configurator Tab 1 — no O.C.C. chosen (`occ.id` empty). */
export const CREATION_PLACEHOLDER_OCC: CharacterOcc = {
  id: '',
  name: 'Select O.C.C.',
  category: 'standard',
  xpTable: { floors: [] },
}

function blankFormState(): Character['facade'] {
  return {
    alignment: '',
    hitPoints: { current: 0, maximum: 0, scaling: 'sdc_hp' },
    structuralDamageCapacity: {
      current: 0,
      maximum: 0,
      scaling: 'sdc_hp',
    },
    isp: { current: 0, maximum: 0 },
    attributes: {
      iq: 10,
      me: 10,
      ma: 10,
      ps: { score: 10, tier: 'standard' },
      pp: 10,
      pe: 10,
      pb: 10,
      spd: 10,
    },
    skills: [],
  }
}

export function newCharacterId(): string {
  return `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function toCharacterRoot(
  profile: Character,
  meta: {
    id?: string
    creationGenreId: string
    hostGenreId: string
  },
): CharacterRootState {
  return {
    ...profile,
    id: meta.id ?? newCharacterId(),
    creationGenreId: meta.creationGenreId,
    hostGenreId: meta.hostGenreId,
  }
}

export function createBlankCharacterForGenre(genreId: GenreId): CharacterRootState {
  const facade = blankFormState()
  return toCharacterRoot(
    {
      name: 'New Character',
      level: 1,
      xp: 0,
      ppe: { current: 0, maximum: 0 },
      occ: CREATION_PLACEHOLDER_OCC,
      raceId: undefined,
      lineage: 'megaversal',
      psychicGateBypassed: resolvePsychicGateBypassed(undefined, undefined, genreId),
      isFinalized: false,
      creationVitalityCommitted: false,
      selectedAbilities: [],
      creationAbilityBudget: {
        spellSlots: 0,
        psionicSlots: 0,
        talentSlots: 0,
      },
      creationOccSkillIds: [],
      creationRelatedSkillIds: [],
      creationPhase: 'configurator',
      creationForgeTab: 'tab1_configurator',
      creationForgeCompleted: {},
      creationForgeSnapshots: {},
      creationPsychicTierChosen: false,
      creationTraitForgeStubComplete: false,
      creationAttributePool: Array.from({ length: 8 }, () => null),
      creationAttributeAssignments: {},
      creationAttributePoolSlots: {},
      creationOccVariableResolutions: {},
      creationOccCoreVoucherPicks: {},
      creationPendingDiceResolutions: {},
      facade,
      morphus: structuredClone(facade),
    },
    { creationGenreId: genreId, hostGenreId: genreId },
  )
}

/** Re-attach immutable root stamps after helpers that return plain {@link Character}. */
export function retainCharacterRoot(
  prev: CharacterRootState,
  next: Character,
): CharacterRootState {
  return {
    ...next,
    id: prev.id,
    creationGenreId: prev.creationGenreId,
    hostGenreId: prev.hostGenreId,
  }
}

export function ensureCharacterRoot(
  state: Character | CharacterRootState,
  defaults?: { creationGenreId?: string; hostGenreId?: string },
): CharacterRootState {
  if ('creationGenreId' in state && 'hostGenreId' in state && 'id' in state) {
    return state as CharacterRootState
  }
  const c = state as Character
  return toCharacterRoot(c, {
    creationGenreId: defaults?.creationGenreId ?? 'nightbane',
    hostGenreId: defaults?.hostGenreId ?? 'nightbane',
  })
}
