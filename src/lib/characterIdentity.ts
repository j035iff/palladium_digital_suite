import type {
  ActiveForm,
  CharacterIdentityFormFields,
  CharacterIdentityProfile,
  MorphusCharacteristic,
  MorphusPolymorphicModifier,
} from '../types'
import {
  normalizeIdentityPortraits,
  normalizePortraitWindows,
} from './characterPortraits'
import {
  formatPolymorphicModifier,
  hasPolymorphicPayload,
  resolveStatWithPolymorphicModifiers,
} from './morphusPolymorphicResolver'

export const CHARACTER_NAME_PLACEHOLDER = 'Enter Character Name'

/** Legacy default stored before placeholder-only name field. */
export const LEGACY_DEFAULT_CHARACTER_NAME = 'New Character'

/** Legacy placeholder text previously shown as the name field value. */
export const LEGACY_CHARACTER_NAME_PLACEHOLDER = 'New Character - Enter Character Name'

export const EMPTY_CHARACTER_IDENTITY_FORM_FIELDS: CharacterIdentityFormFields = {
  sex: '',
  age: '',
  heightFeet: '',
  heightInches: '',
  weightLbs: '',
  eyes: '',
  hair: '',
  description: '',
  personality: '',
}

export const EMPTY_CHARACTER_IDENTITY_PROFILE: CharacterIdentityProfile = {
  ...EMPTY_CHARACTER_IDENTITY_FORM_FIELDS,
  portraits: {},
}

const IDENTITY_FORM_FIELD_KEYS = [
  'sex',
  'age',
  'heightFeet',
  'heightInches',
  'weightLbs',
  'eyes',
  'hair',
  'description',
  'personality',
] as const satisfies readonly (keyof CharacterIdentityFormFields)[]

export type IdentityFormFieldKey = (typeof IDENTITY_FORM_FIELD_KEYS)[number]

export type IdentityTraitMeasureAxis = 'height' | 'weight'

export type IdentityTraitModifierSource = {
  axis: IdentityTraitMeasureAxis
  traitId: string
  traitName: string
  modifier: MorphusPolymorphicModifier
  /** True when the catalog mod includes a dice term (player fill-in; never auto-roll). */
  needsFillIn: boolean
  label: string
}

function identityTextSet(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeFormFields(
  fields?: Partial<CharacterIdentityFormFields> | null,
): CharacterIdentityFormFields {
  return {
    sex: typeof fields?.sex === 'string' ? fields.sex : '',
    age: typeof fields?.age === 'string' ? fields.age : '',
    heightFeet: typeof fields?.heightFeet === 'string' ? fields.heightFeet : '',
    heightInches:
      typeof fields?.heightInches === 'string' ? fields.heightInches : '',
    weightLbs: typeof fields?.weightLbs === 'string' ? fields.weightLbs : '',
    eyes: typeof fields?.eyes === 'string' ? fields.eyes : '',
    hair: typeof fields?.hair === 'string' ? fields.hair : '',
    description:
      typeof fields?.description === 'string' ? fields.description : '',
    personality:
      typeof fields?.personality === 'string' ? fields.personality : '',
  }
}

function normalizeMorphusOverlay(
  overlay?: Partial<CharacterIdentityFormFields> | null,
): Partial<CharacterIdentityFormFields> | undefined {
  if (!overlay || typeof overlay !== 'object') return undefined
  const out: Partial<CharacterIdentityFormFields> = {}
  let any = false
  for (const key of IDENTITY_FORM_FIELD_KEYS) {
    const raw = overlay[key]
    if (typeof raw !== 'string') continue
    out[key] = raw
    any = true
  }
  return any ? out : undefined
}

export function normalizeIdentityProfile(
  profile?: CharacterIdentityProfile,
): CharacterIdentityProfile {
  const facade = normalizeFormFields(profile)
  const morphus = normalizeMorphusOverlay(profile?.morphus)
  const portraitWindows = normalizePortraitWindows(profile?.portraitWindows)
  return {
    ...facade,
    portraits: normalizeIdentityPortraits(profile?.portraits),
    ...(Object.keys(portraitWindows).length > 0 ? { portraitWindows } : {}),
    ...(morphus ? { morphus } : {}),
  }
}

/** True when Morphus overlay explicitly stores a height pair (either part set). */
export function hasMorphusHeightOverride(
  profile?: CharacterIdentityProfile,
): boolean {
  const overlay = profile?.morphus
  if (!overlay) return false
  return (
    identityTextSet(overlay.heightFeet) || identityTextSet(overlay.heightInches)
  )
}

/** True when Morphus overlay explicitly stores weight. */
export function hasMorphusWeightOverride(
  profile?: CharacterIdentityProfile,
): boolean {
  return identityTextSet(profile?.morphus?.weightLbs)
}

/**
 * Resolve presentation identity for one form.
 * Morphus unset anthropometrics (sex/age/height/weight/eyes/hair) fall back to Facade.
 * Description + personality are **fully independent** per form (Joe 2026-10-15):
 * Morphus never inherits Facade prose — empty Morphus stays empty until filled.
 */
export function resolveIdentityFormFields(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
): CharacterIdentityFormFields {
  const facade = normalizeFormFields(normalizeIdentityProfile(profile))
  if (form !== 'morphus') return facade
  const overlay = profile?.morphus ?? {}
  return {
    sex: identityTextSet(overlay.sex) ? overlay.sex! : facade.sex,
    age: identityTextSet(overlay.age) ? overlay.age! : facade.age,
    heightFeet: hasMorphusHeightOverride(profile)
      ? (overlay.heightFeet ?? '')
      : facade.heightFeet,
    heightInches: hasMorphusHeightOverride(profile)
      ? (overlay.heightInches ?? '')
      : facade.heightInches,
    weightLbs: hasMorphusWeightOverride(profile)
      ? (overlay.weightLbs ?? '')
      : facade.weightLbs,
    eyes: identityTextSet(overlay.eyes) ? overlay.eyes! : facade.eyes,
    hair: identityTextSet(overlay.hair) ? overlay.hair! : facade.hair,
    // Independent Morphus prose — do not fall back to Facade text.
    description:
      typeof overlay.description === 'string' ? overlay.description : '',
    personality:
      typeof overlay.personality === 'string' ? overlay.personality : '',
  }
}

/**
 * Patch identity for the active form. Morphus writes go to the overlay only
 * (Facade root fields untouched). Facade / single-form patches root fields.
 */
export function patchIdentityProfileForForm(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  patch: Partial<CharacterIdentityFormFields>,
): CharacterIdentityProfile {
  const base = normalizeIdentityProfile(profile)
  if (form !== 'morphus') {
    return normalizeIdentityProfile({ ...base, ...patch })
  }
  const nextOverlay: Partial<CharacterIdentityFormFields> = {
    ...(base.morphus ?? {}),
  }
  for (const key of IDENTITY_FORM_FIELD_KEYS) {
    if (key in patch) {
      const value = patch[key]
      if (typeof value === 'string') nextOverlay[key] = value
    }
  }
  // Height pair: writing either part establishes Morphus override.
  if ('heightFeet' in patch || 'heightInches' in patch) {
    if (!identityTextSet(nextOverlay.heightFeet)) nextOverlay.heightFeet = ''
    if (!identityTextSet(nextOverlay.heightInches)) nextOverlay.heightInches = ''
  }
  return normalizeIdentityProfile({ ...base, morphus: nextOverlay })
}

export function formatHeightPartsFromInches(totalInches: number): {
  heightFeet: string
  heightInches: string
} {
  const safe = Math.max(0, Math.round(totalInches))
  return {
    heightFeet: String(Math.floor(safe / 12)),
    heightInches: String(safe % 12),
  }
}

/** Dice term on a Morphus polymorphic mod → player fill-in (Pillar 5). */
export function polymorphicModifierNeedsFillIn(
  mod?: MorphusPolymorphicModifier,
): boolean {
  return typeof mod?.dice === 'string' && mod.dice.trim().length > 0
}

export function collectIdentityTraitModifierSources(
  traits: readonly MorphusCharacteristic[],
): IdentityTraitModifierSource[] {
  const out: IdentityTraitModifierSource[] = []
  for (const trait of traits) {
    if (trait.heightModifier && hasPolymorphicPayload(trait.heightModifier)) {
      out.push({
        axis: 'height',
        traitId: trait.id,
        traitName: trait.name?.trim() || trait.id,
        modifier: trait.heightModifier,
        needsFillIn: polymorphicModifierNeedsFillIn(trait.heightModifier),
        label: formatPolymorphicModifier(trait.heightModifier),
      })
    }
    if (trait.weightModifier && hasPolymorphicPayload(trait.weightModifier)) {
      out.push({
        axis: 'weight',
        traitId: trait.id,
        traitName: trait.name?.trim() || trait.id,
        modifier: trait.weightModifier,
        needsFillIn: polymorphicModifierNeedsFillIn(trait.weightModifier),
        label: formatPolymorphicModifier(trait.weightModifier),
      })
    }
  }
  return out
}

/** Deterministic mods only — dice stripped (never auto-rolled for identity). */
export function deterministicIdentityModifiers(
  modifiers: readonly MorphusPolymorphicModifier[],
): MorphusPolymorphicModifier[] {
  return modifiers
    .map((m) => {
      if (!polymorphicModifierNeedsFillIn(m)) return m
      const { dice: _dice, ...rest } = m
      if (!hasPolymorphicPayload(rest)) return null
      return rest
    })
    .filter((m): m is MorphusPolymorphicModifier => m != null)
}

export type FormIdentityMeasureResolution = {
  /** Display / engine value after Facade fallback + deterministic trait mods. */
  totalInches?: number
  totalLbs?: number
  heightFeet: string
  heightInches: string
  weightLbs: string
  /** Trait source lines for UI indication. */
  traitSources: IdentityTraitModifierSource[]
  /** Dice mods that still need a player-entered Morphus value. */
  needsFillIn: boolean
  fillInLabels: string[]
  /** Value came from Morphus overlay (player edit), not pure fallback/auto. */
  isOverride: boolean
  /** Deterministic trait math changed the Facade base (when not overridden). */
  traitAltered: boolean
}

function axisFillInLabels(sources: IdentityTraitModifierSource[]): string[] {
  return sources
    .filter((s) => s.needsFillIn)
    .map((s) => `${s.label} from ${s.traitName}`)
}

/**
 * Morphus (or Facade) height for display + movement: Facade fallback, then
 * deterministic trait mods when Morphus height is unset; dice → fill-in callout.
 */
export function resolveFormIdentityHeight(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  traits: readonly MorphusCharacteristic[] = [],
): FormIdentityMeasureResolution {
  const facadeFields = resolveIdentityFormFields(profile, 'primary')
  const facadeInches = parseIdentityHeightInches(facadeFields)
  const sources =
    form === 'morphus'
      ? collectIdentityTraitModifierSources(traits).filter((s) => s.axis === 'height')
      : []
  const mods = sources.map((s) => s.modifier)
  const fillInLabels = axisFillInLabels(sources)
  const needsFillIn = fillInLabels.length > 0
  const isOverride = form === 'morphus' && hasMorphusHeightOverride(profile)

  if (form !== 'morphus') {
    const parts = facadeInches != null
      ? formatHeightPartsFromInches(facadeInches)
      : { heightFeet: facadeFields.heightFeet, heightInches: facadeFields.heightInches }
    return {
      totalInches: facadeInches,
      heightFeet: parts.heightFeet,
      heightInches: parts.heightInches,
      weightLbs: facadeFields.weightLbs,
      traitSources: [],
      needsFillIn: false,
      fillInLabels: [],
      isOverride: false,
      traitAltered: false,
    }
  }

  if (isOverride) {
    const fields = resolveIdentityFormFields(profile, 'morphus')
    const total = parseIdentityHeightInches(fields)
    return {
      totalInches: total,
      heightFeet: fields.heightFeet,
      heightInches: fields.heightInches,
      weightLbs: fields.weightLbs,
      traitSources: sources,
      needsFillIn: false,
      fillInLabels: [],
      isOverride: true,
      traitAltered: sources.length > 0,
    }
  }

  const base = facadeInches
  const deterministic = deterministicIdentityModifiers(mods)
  let total: number | undefined = base
  if (base != null && deterministic.length) {
    total = Math.max(
      1,
      resolveStatWithPolymorphicModifiers(base, deterministic, {
        rollDice: () => 0,
        applyFloors: true,
      }),
    )
  }
  const traitAltered = total != null && base != null && total !== base
  const parts =
    total != null
      ? formatHeightPartsFromInches(total)
      : { heightFeet: facadeFields.heightFeet, heightInches: facadeFields.heightInches }

  return {
    totalInches: total,
    heightFeet: parts.heightFeet,
    heightInches: parts.heightInches,
    weightLbs: facadeFields.weightLbs,
    traitSources: sources,
    needsFillIn,
    fillInLabels,
    isOverride: false,
    traitAltered,
  }
}

/**
 * Morphus (or Facade) weight for display + encumbrance — same fallback / fill-in rules as height.
 */
export function resolveFormIdentityWeight(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  traits: readonly MorphusCharacteristic[] = [],
): FormIdentityMeasureResolution {
  const facadeFields = resolveIdentityFormFields(profile, 'primary')
  const facadeLbs = parseIdentityWeightLbs(facadeFields)
  const sources =
    form === 'morphus'
      ? collectIdentityTraitModifierSources(traits).filter((s) => s.axis === 'weight')
      : []
  const mods = sources.map((s) => s.modifier)
  const fillInLabels = axisFillInLabels(sources)
  const needsFillIn = fillInLabels.length > 0
  const isOverride = form === 'morphus' && hasMorphusWeightOverride(profile)
  const heightRes = resolveFormIdentityHeight(profile, form, traits)

  if (form !== 'morphus') {
    return {
      totalLbs: facadeLbs,
      heightFeet: facadeFields.heightFeet,
      heightInches: facadeFields.heightInches,
      weightLbs: facadeFields.weightLbs,
      traitSources: [],
      needsFillIn: false,
      fillInLabels: [],
      isOverride: false,
      traitAltered: false,
    }
  }

  if (isOverride) {
    const fields = resolveIdentityFormFields(profile, 'morphus')
    return {
      totalLbs: parseIdentityWeightLbs(fields),
      heightFeet: heightRes.heightFeet,
      heightInches: heightRes.heightInches,
      weightLbs: fields.weightLbs,
      traitSources: sources,
      needsFillIn: false,
      fillInLabels: [],
      isOverride: true,
      traitAltered: sources.length > 0,
    }
  }

  const base = facadeLbs
  const deterministic = deterministicIdentityModifiers(mods)
  let total: number | undefined = base
  if (base != null && deterministic.length) {
    total = Math.max(
      1,
      resolveStatWithPolymorphicModifiers(base, deterministic, {
        rollDice: () => 0,
        applyFloors: true,
      }),
    )
  }
  const traitAltered = total != null && base != null && total !== base

  return {
    totalLbs: total,
    heightFeet: heightRes.heightFeet,
    heightInches: heightRes.heightInches,
    weightLbs: total != null ? String(Math.round(total)) : facadeFields.weightLbs,
    traitSources: sources,
    needsFillIn,
    fillInLabels,
    isOverride: false,
    traitAltered,
  }
}

/** Incomplete Morphus dice fill-ins to highlight on the sheet (never spawn-blocks). */
export function listMorphusIdentityFillInCallouts(
  profile: CharacterIdentityProfile | undefined,
  traits: readonly MorphusCharacteristic[],
): { axis: IdentityTraitMeasureAxis; message: string }[] {
  const height = resolveFormIdentityHeight(profile, 'morphus', traits)
  const weight = resolveFormIdentityWeight(profile, 'morphus', traits)
  const out: { axis: IdentityTraitMeasureAxis; message: string }[] = []
  if (height.needsFillIn) {
    out.push({
      axis: 'height',
      message: `Enter Morphus height (${height.fillInLabels.join('; ')}).`,
    })
  }
  if (weight.needsFillIn) {
    out.push({
      axis: 'weight',
      message: `Enter Morphus weight (${weight.fillInLabels.join('; ')}).`,
    })
  }
  return out
}

/** Display profile for Identity Expand fields (active form + trait auto-height/weight). */
export function resolveIdentityDisplayProfile(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  traits: readonly MorphusCharacteristic[] = [],
): CharacterIdentityFormFields & {
  heightTraitSources: IdentityTraitModifierSource[]
  weightTraitSources: IdentityTraitModifierSource[]
  heightNeedsFillIn: boolean
  weightNeedsFillIn: boolean
  heightFillInLabels: string[]
  weightFillInLabels: string[]
  heightTraitAltered: boolean
  weightTraitAltered: boolean
} {
  const fields = resolveIdentityFormFields(profile, form)
  if (form !== 'morphus') {
    return {
      ...fields,
      heightTraitSources: [],
      weightTraitSources: [],
      heightNeedsFillIn: false,
      weightNeedsFillIn: false,
      heightFillInLabels: [],
      weightFillInLabels: [],
      heightTraitAltered: false,
      weightTraitAltered: false,
    }
  }
  const height = resolveFormIdentityHeight(profile, 'morphus', traits)
  const weight = resolveFormIdentityWeight(profile, 'morphus', traits)
  return {
    ...fields,
    heightFeet: height.heightFeet,
    heightInches: height.heightInches,
    weightLbs: weight.weightLbs,
    heightTraitSources: height.traitSources,
    weightTraitSources: weight.traitSources,
    heightNeedsFillIn: height.needsFillIn,
    weightNeedsFillIn: weight.needsFillIn,
    heightFillInLabels: height.fillInLabels,
    weightFillInLabels: weight.fillInLabels,
    heightTraitAltered: height.traitAltered || height.isOverride,
    weightTraitAltered: weight.traitAltered || weight.isOverride,
  }
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

export function isLegacyCreationNameValue(name: string): boolean {
  const trimmed = name.trim()
  return (
    !trimmed ||
    trimmed === LEGACY_DEFAULT_CHARACTER_NAME ||
    trimmed === LEGACY_CHARACTER_NAME_PLACEHOLDER ||
    trimmed === CHARACTER_NAME_PLACEHOLDER
  )
}

export function creationForgeDisplayName(name: string): string {
  return isLegacyCreationNameValue(name) ? '' : name
}

export function isCharacterNameFilled(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (trimmed === LEGACY_DEFAULT_CHARACTER_NAME) return false
  if (trimmed === LEGACY_CHARACTER_NAME_PLACEHOLDER) return false
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

/** Keep inches input to digits only, clamped to 0–11 (empty allowed while editing). */
export function sanitizeIdentityHeightInchesInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value)) return ''
  return String(Math.min(11, Math.max(0, value)))
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
    blockers.push('Enter a character name in the character header.')
  }
  if (!hasTextField(p.sex)) {
    blockers.push('Enter sex in the character header Details section.')
  }
  if (!hasTextField(p.age)) {
    blockers.push('Enter age in the character header Details section.')
  }
  if (!hasValidIdentityHeight(p)) {
    blockers.push(
      'Enter height (feet and inches as numbers) in the character header Details section.',
    )
  }
  if (!hasValidIdentityWeight(p)) {
    blockers.push('Enter weight in pounds (numeric) in the character header Details section.')
  }
  if (!hasTextField(p.eyes)) {
    blockers.push('Enter eye color in the character header Details section.')
  }
  if (!hasTextField(p.hair)) {
    blockers.push('Enter hair in the character header Details section.')
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

/**
 * Base identity height with optional Morphus polymorphic modifiers applied.
 * Prefer {@link resolveFormIdentityHeight} for form-aware Facade/Morphus identity.
 */
export function resolveIdentityHeightInches(
  profile: CharacterIdentityProfile | undefined,
  heightModifiers: readonly MorphusPolymorphicModifier[] = [],
  fallbackInches = 72,
): number {
  const base = parseIdentityHeightInches(profile) ?? fallbackInches
  if (!heightModifiers.length) return base
  return Math.max(
    1,
    resolveStatWithPolymorphicModifiers(base, heightModifiers, {
      // Identity dice are player fill-ins — never auto-roll here (Pillar 5).
      rollDice: () => 0,
      applyFloors: true,
    }),
  )
}

/**
 * Base identity weight with optional Morphus polymorphic modifiers applied.
 * Prefer {@link resolveFormIdentityWeight} for form-aware Facade/Morphus identity.
 */
export function resolveIdentityWeightLbs(
  profile: CharacterIdentityProfile | undefined,
  weightModifiers: readonly MorphusPolymorphicModifier[] = [],
): number | undefined {
  const base = parseIdentityWeightLbs(profile)
  if (base == null) return undefined
  if (!weightModifiers.length) return base
  return Math.max(
    1,
    resolveStatWithPolymorphicModifiers(base, weightModifiers, {
      rollDice: () => 0,
      applyFloors: true,
    }),
  )
}

/**
 * Engine height for the active form (Facade fallback + Morphus trait auto-apply).
 * Dice trait mods do not change the number until the player fills Morphus height.
 */
export function resolveActiveFormIdentityHeightInches(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  traits: readonly MorphusCharacteristic[] = [],
  fallbackInches = 72,
): number {
  return (
    resolveFormIdentityHeight(profile, form, traits).totalInches ?? fallbackInches
  )
}

/** Engine weight for the active form; undefined when Facade weight is unset. */
export function resolveActiveFormIdentityWeightLbs(
  profile: CharacterIdentityProfile | undefined,
  form: ActiveForm,
  traits: readonly MorphusCharacteristic[] = [],
): number | undefined {
  return resolveFormIdentityWeight(profile, form, traits).totalLbs
}
