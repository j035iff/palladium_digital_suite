import type {
  ActiveForm,
  Character,
  FeatureModifiers,
  MorphusCharacteristic,
  MorphusBurrowingEngine,
  MorphusDisabledNaturalAttackTag,
  MorphusExternalSensoryObfuscation,
  MorphusStanceType,
  MorphusStatModifiers,
  MorphusSurfaceType,
  MorphusWeaponTrait,
} from '../types'
import { getFormState } from '../types'
import { resolveActiveMorphusTraitsFromCharacter } from './morphusCustomTrait'
import {
  aggregateHandCapacityFromTraits,
  aggregateMorphusSaveBonuses,
  collectAvailableMorphusStanceTypes,
  collectMorphusSkillOverridesForSurface,
  collectMorphusStatModifierBlocks,
  collectMorphusTraitNotes,
  aggregateMorphusJumpBonuses,
  aggregateMorphusSwimSpeedBonus,
  aggregateMorphusSwimSpeedModifiers,
  aggregateMorphusFlightEngine,
  aggregateMorphusSensoryFlags,
  type MorphusAggregatedFlightEngine,
  type MorphusAggregatedSensoryFlags,
  type MorphusAggregatedSwimSpeedModifiers,
  collectMorphusDamageAffinityNotes,
  collectMorphusVariableScaleNotes,
  collectPolymorphicTemplateTraits,
  flattenMorphusActivatedAbilities,
  flattenMorphusCombatInterceptions,
  flattenMorphusLimbComponents,
  type MorphusDerivedActivatedAbility,
  type MorphusDerivedCombatInterception,
  type MorphusDerivedLimbComponent,
  flattenMorphusGimmickInventory,
  flattenMorphusGimmickToySwitches,
  flattenMorphusNaturalWeapons,
  collectActiveGimmickToyEffects,
  applyGimmickToyFlatCombatBonuses,
  resolveActiveGimmickSpdMultiplier,
  stackNightvisionWithActiveGimmickSwitches,
  mergeMorphusBurrowingEngines,
  unionDisabledNaturalAttackTags,
  type MorphusAggregatedJumpBonuses,
  type MorphusDamageAffinityNote,
  type MorphusDerivedGimmickItem,
  type MorphusDerivedGimmickSwitch,
  type MorphusVariableScaleNote,
  resolveMorphusCompanionSnapshots,
  resolveMorphusCustomSystemRollSnapshots,
  unionExternalSensoryObfuscation,
  unionMorphusWeaponTraits,
  type MorphusDerivedCustomSystemRoll,
  type MorphusPolymorphicTemplateFlag,
  type MorphusDerivedCompanion,
  type MorphusDerivedNaturalWeapon,
  type MorphusTraitNote,
  resolveMorphusTerrainSpdMultiplier,
  sumRelativeArShiftFromTraits,
  buildMorphusCapabilitySummary,
  aggregateMorphusBalanceModifierPercent,
  aggregateMorphusReachPercentBonus,
  aggregateMorphusJumpMultiplier,
} from './morphusCharacteristicAggregation'
import type { MorphusCapabilitySummary } from '../types'
import { polymorphicDeltaFromBase } from './morphusPolymorphicResolver'

const STAT_TO_PASSIVE: Partial<
  Record<keyof MorphusStatModifiers, keyof FeatureModifiers | string>
> = {
  iq: 'iq',
  me: 'me',
  ma: 'ma',
  pp: 'pp',
  pe: 'pe',
  pb: 'pb',
  spd: 'spd',
  ps: 'ps',
  sdc: 'sdc',
  hp: 'hp',
  ppe: 'ppe',
  hf: 'horror_factor',
  perception: 'perception',
  apm: 'apm',
  initiative: 'initiative',
  strike: 'strike',
  parry: 'parry',
  dodge: 'dodge',
  rollWithPunch: 'rollWithImpact',
  pullPunch: 'pullPunch',
  entangle: 'entangle',
  disarm: 'disarm',
  strikeWithGuns: 'strike',
  bonusHthDamage: 'bonusHthDamage',
}

export type MorphusPassiveBundle = {
  modifiers: FeatureModifiers
  /** Additive shift to equipped + natural A.R. (statModifiers.ar flat sum). */
  relativeArShift: number
  terrainSpdMultiplier: number
  terrainSkillOverrides: ReturnType<typeof collectMorphusSkillOverridesForSurface>
  handCapacity: ReturnType<typeof aggregateHandCapacityFromTraits>
  stanceType?: MorphusStanceType
  naturalWeapons: readonly MorphusDerivedNaturalWeapon[]
  weaponTraits: readonly MorphusWeaponTrait[]
  companions: readonly MorphusDerivedCompanion[]
  traitNotes: readonly MorphusTraitNote[]
  availableStanceTypes: readonly MorphusStanceType[]
  customSystemRolls: readonly MorphusDerivedCustomSystemRoll[]
  burrowingEngine?: MorphusBurrowingEngine
  externalSensoryObfuscation: readonly MorphusExternalSensoryObfuscation[]
  polymorphicTemplates: readonly MorphusPolymorphicTemplateFlag[]
  gimmickInventory: readonly MorphusDerivedGimmickItem[]
  disabledNaturalAttackTags: readonly MorphusDisabledNaturalAttackTag[]
  variableScaleNotes: readonly MorphusVariableScaleNote[]
  jumpBonuses: MorphusAggregatedJumpBonuses
  swimSpeedModifiers: MorphusAggregatedSwimSpeedModifiers
  swimSpeedBonus: number
  damageAffinityNotes: readonly MorphusDamageAffinityNote[]
  limbComponents: readonly MorphusDerivedLimbComponent[]
  activatedAbilities: readonly MorphusDerivedActivatedAbility[]
  combatInterceptions: readonly MorphusDerivedCombatInterception[]
  nightvisionRangeFlatBonus: number
  sensoryFlags: MorphusAggregatedSensoryFlags
  flightEngine: MorphusAggregatedFlightEngine | null
  activeBurstKeys: readonly string[]
  gimmickToySwitches: readonly MorphusDerivedGimmickSwitch[]
  activeGimmickSwitchKeys: readonly string[]
  capabilitySummary: MorphusCapabilitySummary
  balanceModifierPercent: number
  reachPercentBonus: number
  jumpMultiplier: number
  minimumJumpFeet: number
}

export type MorphusDerivedSheetSlice = Pick<
  MorphusPassiveBundle,
  | 'naturalWeapons'
  | 'weaponTraits'
  | 'companions'
  | 'traitNotes'
  | 'availableStanceTypes'
  | 'stanceType'
  | 'customSystemRolls'
  | 'burrowingEngine'
  | 'externalSensoryObfuscation'
  | 'polymorphicTemplates'
  | 'gimmickInventory'
  | 'disabledNaturalAttackTags'
  | 'variableScaleNotes'
  | 'jumpBonuses'
  | 'swimSpeedModifiers'
  | 'swimSpeedBonus'
  | 'damageAffinityNotes'
  | 'limbComponents'
  | 'activatedAbilities'
  | 'combatInterceptions'
  | 'nightvisionRangeFlatBonus'
  | 'sensoryFlags'
  | 'flightEngine'
  | 'activeBurstKeys'
  | 'gimmickToySwitches'
  | 'activeGimmickSwitchKeys'
  | 'capabilitySummary'
  | 'balanceModifierPercent'
  | 'reachPercentBonus'
  | 'jumpMultiplier'
  | 'minimumJumpFeet'
>

export type MorphusPassiveBuildOptions = {
  surfaceType?: MorphusSurfaceType
  stanceType?: MorphusStanceType
  /** Keys from morphusBurstAbilityKey — burst statModifiers merge when listed. */
  activeBurstKeys?: readonly string[]
  /** Keys from morphusGimmickSwitchKey — switch effects merge when listed. */
  activeGimmickSwitchKeys?: readonly string[]
}

export function resolveActiveMorphusTraits(
  character: Pick<
    Character,
    'activeMorphusCharacteristicIds' | 'morphusTraitSlotResolutions'
  >,
): MorphusCharacteristic[] {
  return resolveActiveMorphusTraitsFromCharacter(character)
}

/**
 * Morphus-only passive bundle for sheet/combat engines (master_flow middleware).
 */
export function buildMorphusPassiveBundle(
  character: Character,
  activeForm: ActiveForm,
  options: MorphusPassiveBuildOptions = {},
): MorphusPassiveBundle | null {
  if (activeForm !== 'morphus') return null
  const traits = resolveActiveMorphusTraits(character)
  if (!traits.length) return null

  const surfaceType = options.surfaceType ?? 'hard_flat'
  const availableStanceTypes = collectAvailableMorphusStanceTypes(traits)
  const effectiveStance =
    options.stanceType && availableStanceTypes.includes(options.stanceType)
      ? options.stanceType
      : undefined
  const burstSet = new Set(options.activeBurstKeys ?? [])
  const gimmickSet = new Set(options.activeGimmickSwitchKeys ?? [])
  const activeGimmickEffects = collectActiveGimmickToyEffects(traits, gimmickSet)

  const form = getFormState(character, activeForm)
  const attrs = form.attributes
  const modifiers: FeatureModifiers = {}

  for (const [statKey, passiveKey] of Object.entries(STAT_TO_PASSIVE)) {
    const key = statKey as keyof MorphusStatModifiers
    const pk = passiveKey as keyof FeatureModifiers
    const blocks = collectMorphusStatModifierBlocks(
      traits,
      key,
      effectiveStance,
      burstSet,
      gimmickSet,
    )
    if (!blocks.length) continue

    let base = 0
    if (key === 'ps') base = attrs.ps.score
    else if (key === 'sdc') base = form.structuralDamageCapacity.maximum
    else if (key === 'hp') base = form.hitPoints.maximum
    else if (key === 'ppe') base = character.ppe.maximum
    else if (key in attrs) base = attrs[key as keyof typeof attrs] as number

    const delta = polymorphicDeltaFromBase(base, blocks)
    if (delta !== 0) modifiers[pk] = (modifiers[pk] ?? 0) + delta
  }

  for (const [k, v] of Object.entries(aggregateMorphusSaveBonuses(traits))) {
    modifiers[k as keyof FeatureModifiers] =
      (modifiers[k as keyof FeatureModifiers] ?? 0) + v
  }

  const gimmickCombat: Record<string, number> = {}
  applyGimmickToyFlatCombatBonuses(gimmickCombat, activeGimmickEffects)
  for (const [k, v] of Object.entries(gimmickCombat)) {
    modifiers[k as keyof FeatureModifiers] =
      (modifiers[k as keyof FeatureModifiers] ?? 0) + v
  }

  for (const t of traits) {
    const wc = t.weaponClassBonuses
    if (!wc) continue
    if (wc.melee?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.melee.flat
    if (wc.thrown?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.thrown.flat
    if (wc.bow?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.bow.flat
    if (wc.guns?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.guns.flat
  }

  const terrainSpd =
    resolveMorphusTerrainSpdMultiplier(traits, surfaceType) *
    resolveActiveGimmickSpdMultiplier(activeGimmickEffects)

  return {
    modifiers,
    relativeArShift: sumRelativeArShiftFromTraits(traits),
    terrainSpdMultiplier: terrainSpd,
    terrainSkillOverrides: collectMorphusSkillOverridesForSurface(
      traits,
      surfaceType,
    ),
    handCapacity: aggregateHandCapacityFromTraits(traits),
    stanceType: effectiveStance,
    disabledNaturalAttackTags: unionDisabledNaturalAttackTags(traits),
    naturalWeapons: flattenMorphusNaturalWeapons(
      traits,
      unionDisabledNaturalAttackTags(traits),
      gimmickSet,
    ),
    weaponTraits: unionMorphusWeaponTraits(traits),
    gimmickInventory: flattenMorphusGimmickInventory(traits),
    gimmickToySwitches: flattenMorphusGimmickToySwitches(traits),
    companions: resolveMorphusCompanionSnapshots(traits),
    traitNotes: collectMorphusTraitNotes(traits),
    availableStanceTypes,
    customSystemRolls: resolveMorphusCustomSystemRollSnapshots(
      traits,
      character.level,
      surfaceType,
    ),
    burrowingEngine: mergeMorphusBurrowingEngines(traits),
    externalSensoryObfuscation: unionExternalSensoryObfuscation(traits),
    polymorphicTemplates: collectPolymorphicTemplateTraits(traits),
    variableScaleNotes: collectMorphusVariableScaleNotes(traits),
    jumpBonuses: aggregateMorphusJumpBonuses(traits),
    swimSpeedModifiers: aggregateMorphusSwimSpeedModifiers(traits),
    swimSpeedBonus: aggregateMorphusSwimSpeedBonus(traits),
    damageAffinityNotes: collectMorphusDamageAffinityNotes(traits),
    limbComponents: flattenMorphusLimbComponents(traits),
    activatedAbilities: flattenMorphusActivatedAbilities(traits),
    combatInterceptions: flattenMorphusCombatInterceptions(traits),
    nightvisionRangeFlatBonus: stackNightvisionWithActiveGimmickSwitches(
      traits,
      gimmickSet,
    ),
    sensoryFlags: aggregateMorphusSensoryFlags(traits),
    flightEngine: aggregateMorphusFlightEngine(traits),
    activeBurstKeys: options.activeBurstKeys ?? [],
    activeGimmickSwitchKeys: options.activeGimmickSwitchKeys ?? [],
    capabilitySummary: buildMorphusCapabilitySummary(traits, character.level),
    balanceModifierPercent: aggregateMorphusBalanceModifierPercent(traits),
    reachPercentBonus: aggregateMorphusReachPercentBonus(traits),
    ...(() => {
      const j = aggregateMorphusJumpMultiplier(traits)
      return { jumpMultiplier: j.multiplier, minimumJumpFeet: j.minimumJumpFeet }
    })(),
  }
}

export function mergeMorphusIntoPassive(
  base: FeatureModifiers,
  bundle: MorphusPassiveBundle | null,
): FeatureModifiers {
  if (!bundle) return base
  const out = { ...base }
  for (const [k, v] of Object.entries(bundle.modifiers)) {
    const key = k as keyof FeatureModifiers
    out[key] = (out[key] ?? 0) + v
  }
  return out
}
