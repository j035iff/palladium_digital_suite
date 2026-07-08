import type {
  CharacterIdentityProfile,
  MorphusCharacteristic,
  MorphusPolymorphicModifier,
} from '../types'
import { resolveStatWithPolymorphicModifiers } from './morphusPolymorphicResolver'

export const CHARACTER_NAME_PLACEHOLDER = 'New Character - Enter Character Name'

/** Legacy default stored before placeholder-only name field. */
export const LEGACY_DEFAULT_CHARACTER_NAME = 'New Character'

export const EMPTY_CHARACTER_IDENTITY_PROFILE: CharacterIdentityProfile = {
  sex: '',
  age: '',
  heightFeet: '',
  heightInches: '',
  weightLbs: '',
  eyes: '',
  hair: '',
}

export function normalizeIdentityProfile(
  profile?: CharacterIdentityProfile,
): CharacterIdentityProfile {
  return { ...EMPTY_CHARACTER_IDENTITY_PROFILE, ...profile }
}

export function collectMorphusHeightModifiers(
  traits: readonly MorphusCharacteristic[],
): MorphusPolymorphicModifier[] {
  const out: MorphusPolymorphicModifier[] = []
  for (const trait of traits) {
    if (trait.heightModifier) out.push(trait.heightModifier)
  }
  return out
}

export function collectMorphusWeightModifiers(
  traits: readonly MorphusCharacteristic[],
): MorphusPolymorphicModifier[] {
  const out: MorphusPolymorphicModifier[] = []
  for (const trait of traits) {
    if (trait.weightModifier) out.push(trait.weightModifier)
  }
  return out
}

export function isCharacterNameFilled(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (trimmed === LEGACY_DEFAULT_CHARACTER_NAME) return false
  if (trimmed === CHARACTER_NAME_PLACEHOLDER) return false
  return true
}

export const IDENTITY_WHOLE_NUMBER_ERROR = 'must be a whole number'

function parseHeightFieldInt(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (identityWholeNumberInputError(trimmed)) return undefined
  const value = Number.parseInt(trimmed, 10)
  return Number.isFinite(value) ? value : undefined
}

export function identityWholeNumberInputError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return IDENTITY_WHOLE_NUMBER_ERROR
  return null
}

export function identityHeightFeetError(raw: string): string | null {
  return identityWholeNumberInputError(raw)
}

export function identityHeightInchesError(raw: string): string | null {
  const wholeNumberError = identityWholeNumberInputError(raw)
  if (wholeNumberError) return wholeNumberError
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(value) || value < 0 || value > 11) {
    return 'must be a value from 0–11'
  }
  return null
}

export function identityWeightLbsError(raw: string): string | null {
  return identityWholeNumberInputError(raw)
}

export function hasValidIdentityHeight(
  profile: CharacterIdentityProfile | undefined,
): boolean {
  const p = normalizeIdentityProfile(profile)
  const ft = parseHeightFieldInt(p.heightFeet)
  const inches = parseHeightFieldInt(p.heightInches)
  if (ft == null || inches == null) return false
  if (identityHeightFeetError(p.heightFeet)) return false
  if (identityHeightInchesError(p.heightInches)) return false
  if (ft < 0 || inches < 0 || inches > 11) return false
  return ft > 0 || inches > 0
}

export function hasValidIdentityWeight(
  profile: CharacterIdentityProfile | undefined,
): boolean {
  const p = normalizeIdentityProfile(profile)
  if (identityWeightLbsError(p.weightLbs)) return false
  return parseIdentityWeightLbs(profile) != null
}

function hasTextField(value: string): boolean {
  return value.trim().length > 0
}

export type IdentitySpawnPrepRequirement = {
  id: string
  label: string
  satisfied: boolean
}

/** Informational spawn-profile checklist (does not gate Tab 1 Continue). */
export function listIdentitySpawnPrepRequirements(
  name: string,
  profile?: CharacterIdentityProfile,
): IdentitySpawnPrepRequirement[] {
  const p = normalizeIdentityProfile(profile)
  return [
    {
      id: 'spawn-name',
      label: 'Character name',
      satisfied: isCharacterNameFilled(name),
    },
    { id: 'spawn-sex', label: 'Sex', satisfied: hasTextField(p.sex) },
    { id: 'spawn-age', label: 'Age', satisfied: hasTextField(p.age) },
    {
      id: 'spawn-height',
      label: 'Height (ft and in.)',
      satisfied: hasValidIdentityHeight(p),
    },
    {
      id: 'spawn-weight',
      label: 'Weight (lbs.)',
      satisfied: hasValidIdentityWeight(p),
    },
    { id: 'spawn-eyes', label: 'Eyes', satisfied: hasTextField(p.eyes) },
    { id: 'spawn-hair', label: 'Hair', satisfied: hasTextField(p.hair) },
  ]
}

export function isIdentitySpawnPrepComplete(
  name: string,
  profile?: CharacterIdentityProfile,
): boolean {
  return listIdentitySpawnPrepRequirements(name, profile).every((item) => item.satisfied)
}

/** Tab 7 spawn gate — identity header must be complete before locking the record. */
export function assessIdentitySpawnBlockers(
  name: string,
  profile?: CharacterIdentityProfile,
): string[] {
  const p = normalizeIdentityProfile(profile)
  const blockers: string[] = []

  if (!isCharacterNameFilled(name)) {
    blockers.push('Enter a character name in the Identity header.')
  }
  if (!hasTextField(p.sex)) {
    blockers.push('Enter sex in the Identity header.')
  }
  if (!hasTextField(p.age)) {
    blockers.push('Enter age in the Identity header.')
  }
  if (!hasValidIdentityHeight(p)) {
    blockers.push('Enter height (feet and inches as numbers) in the Identity header.')
  }
  if (!hasValidIdentityWeight(p)) {
    blockers.push('Enter weight in pounds (numeric) in the Identity header.')
  }
  if (!hasTextField(p.eyes)) {
    blockers.push('Enter eye color in the Identity header.')
  }
  if (!hasTextField(p.hair)) {
    blockers.push('Enter hair in the Identity header.')
  }

  return blockers
}

export function parseIdentityHeightInches(
  profile: CharacterIdentityProfile | undefined,
): number | undefined {
  if (!profile) return undefined
  const ftRaw = profile.heightFeet.trim()
  const inRaw = profile.heightInches.trim()
  if (!ftRaw && !inRaw) return undefined

  const ft = ftRaw ? Number.parseInt(ftRaw, 10) : 0
  const inches = inRaw ? Number.parseInt(inRaw, 10) : 0
  const safeFt = Number.isFinite(ft) ? Math.max(0, ft) : 0
  const safeIn = Number.isFinite(inches) ? Math.max(0, Math.min(11, inches)) : 0
  if (safeFt === 0 && safeIn === 0) return undefined
  return safeFt * 12 + safeIn
}

export function parseIdentityWeightLbs(
  profile: CharacterIdentityProfile | undefined,
): number | undefined {
  const raw = profile?.weightLbs.trim()
  if (!raw) return undefined
  if (identityWeightLbsError(raw)) return undefined
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return undefined
  return value
}

/** Base identity height with optional Morphus polymorphic modifiers applied. */
export function resolveIdentityHeightInches(
  profile: CharacterIdentityProfile | undefined,
  heightModifiers: readonly MorphusPolymorphicModifier[] = [],
  fallbackInches = 72,
): number {
  const base = parseIdentityHeightInches(profile) ?? fallbackInches
  if (!heightModifiers.length) return base
  return Math.max(1, resolveStatWithPolymorphicModifiers(base, heightModifiers))
}

/** Base identity weight with optional Morphus polymorphic modifiers applied. */
export function resolveIdentityWeightLbs(
  profile: CharacterIdentityProfile | undefined,
  weightModifiers: readonly MorphusPolymorphicModifier[] = [],
): number | undefined {
  const base = parseIdentityWeightLbs(profile)
  if (base == null) return undefined
  if (!weightModifiers.length) return base
  return Math.max(1, resolveStatWithPolymorphicModifiers(base, weightModifiers))
}
