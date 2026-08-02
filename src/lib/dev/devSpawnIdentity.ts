import type { CharacterIdentityProfile, CharacterRootState } from '../../types'
import { isCharacterNameFilled } from '../characterIdentity'
import { DEV_NIGHTBANE_MORPHUS_ALIGNMENT } from './devSkipToMorphusCreation'

/** Spawn-ready placeholder identity for Review & Spawn (DEV only). */
export const DEV_SKIP_TO_REVIEW_CHARACTER_NAME = 'Dev Character'

export const DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE: CharacterIdentityProfile = {
  sex: 'M',
  age: '28',
  heightFeet: '6',
  heightInches: '0',
  weightLbs: '185',
  eyes: 'Brown',
  hair: 'Black',
}

/** Fill name, identity profile, and alignment when missing (preserves filled fields). */
export function withDevSpawnIdentity(prev: CharacterRootState): CharacterRootState {
  const alignment =
    prev.primary.alignment?.trim() || DEV_NIGHTBANE_MORPHUS_ALIGNMENT
  const existing = prev.identityProfile
  const filled = (value: string | undefined) =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined

  return {
    ...prev,
    name: isCharacterNameFilled(prev.name)
      ? prev.name
      : DEV_SKIP_TO_REVIEW_CHARACTER_NAME,
    identityProfile: {
      sex: filled(existing?.sex) ?? DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.sex,
      age: filled(existing?.age) ?? DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.age,
      heightFeet:
        filled(existing?.heightFeet) ??
        DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.heightFeet,
      heightInches:
        filled(existing?.heightInches) ??
        DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.heightInches,
      weightLbs:
        filled(existing?.weightLbs) ??
        DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.weightLbs,
      eyes: filled(existing?.eyes) ?? DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.eyes,
      hair: filled(existing?.hair) ?? DEV_SKIP_TO_REVIEW_IDENTITY_PROFILE.hair,
    },
    primary: {
      ...prev.primary,
      alignment,
    },
  }
}
