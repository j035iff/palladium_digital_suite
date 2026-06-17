import type { Character, CharacterRootState } from '../types'

type LegacyCharacterFields = {
  facade?: Character['primary']
  creationFacadeDiceFinalized?: boolean
}

/** Migrate persisted saves that used the legacy `facade` branch id. */
export function migrateCharacterFromLegacyFacade(
  input: CharacterRootState,
): CharacterRootState {
  const legacy = input as CharacterRootState & LegacyCharacterFields
  const primary = input.primary ?? legacy.facade
  if (!primary) return input

  const next = {
    ...input,
    primary,
    creationPrimaryDiceFinalized:
      input.creationPrimaryDiceFinalized ?? legacy.creationFacadeDiceFinalized,
  } as CharacterRootState & LegacyCharacterFields

  delete next.facade
  delete next.creationFacadeDiceFinalized
  return next
}
