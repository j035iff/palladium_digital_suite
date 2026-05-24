import type { GenreId } from '../data/genres'
import { characterFixture } from '../data/characterFixture'
import type { Character, CharacterRootState } from '../types'

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
  const base = structuredClone(characterFixture)
  return toCharacterRoot(
    {
      ...base,
      name: 'New Character',
      isFinalized: false,
      creationVitalityCommitted: false,
      level: 1,
      xp: 0,
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
