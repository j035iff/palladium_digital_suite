import type {
  MorphusCapabilityCategory,
  MorphusCapabilityPolarity,
  MorphusCapabilitySummary,
  MorphusCharacteristic,
  MorphusBurrowSubstrate,
  MorphusBurrowingEngine,
  MorphusCompanionBlueprint,
  MorphusCustomSystemRoll,
  MorphusDamageAffinityType,
  MorphusDerivedCapabilityLine,
  MorphusDisabledNaturalAttackTag,
  MorphusActivatedAbility,
  MorphusGimmickInventoryItem,
  MorphusGimmickToyAssignedSwitch,
  MorphusGimmickToyEffectKind,
  MorphusGimmickToySwitchBoard,
  MorphusGimmickToySwitchEffect,
  MorphusGimmickToySwitchLocation,
  MorphusJumpModifiers,
  MorphusLimbDurability,
  MorphusSpecialCombatInterception,
  MorphusExternalSensoryObfuscation,
  MorphusDamageAffinityMultiplier,
  MorphusHandCapacityConstraints,
  MorphusNaturalWeapon,
  MorphusPolymorphicModifier,
  MorphusSkillOverride,
  MorphusStanceType,
  MorphusStatModifiers,
  MorphusSurfaceType,
  MorphusWeaponDamageModifier,
  MorphusWeaponTrait,
} from '../types'
import { polymorphicDeltaFromBase } from './morphusPolymorphicResolver'

/**
 * Morphus multi-trait resolution engines (Nightbane Core Rulebook Morphus tables).
 *
 * When several active {@link MorphusCharacteristic} rows overlap on the same axis,
 * use these reducers instead of naive summation — several axes are non-linear.
 */

/**
 * A.R. stacking (natural armor from Morphus traits).
 *
 * 1. Take the **highest** standalone `naturalAr` among active traits as the absolute base.
 * 2. For every **other** active trait that also provides `naturalAr`, append a flat bonus:
 *    `1 + Math.floor((additionalTraitAr - 6) / 3)` when `additionalTraitAr > 5`, else `0`.
 *
 * Example: traits with A.R. 14, 10, and 8 → base 14 + bonus from 10 (1+floor(4/3)=2)
 * + bonus from 8 (1+floor(2/3)=1) → **17** total natural A.R.
 */
export function stackNaturalArmorFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'naturalAr'>[],
): number | undefined {
  const values = traits
    .map((t) => t.naturalAr)
    .filter((ar): ar is number => typeof ar === 'number' && ar > 0)
  if (values.length === 0) return undefined

  const sorted = [...values].sort((a, b) => b - a)
  const base = sorted[0]!
  let total = base

  for (const additional of sorted.slice(1)) {
    if (additional > 5) {
      total += 1 + Math.floor((additional - 6) / 3)
    }
  }

  return total
}

function additionalNaturalArBonus(ar: number): number {
  if (ar <= 5) return 0
  return 1 + Math.floor((ar - 6) / 3)
}

/** Exposed for unit tests and attribution UIs. */
export function naturalArBonusFromSecondaryTrait(ar: number): number {
  return additionalNaturalArBonus(ar)
}

/**
 * Nightvision range diminishing stacking.
 *
 * 1. The **largest** `sensory.nightvisionRangeFlatBonus` among traits is the absolute base range.
 * 2. Every **other** contributing bonus adds **half** of its printed value (rounded down).
 *
 * Example: 2000 ft base + 1000 ft secondary → 2000 + floor(1000/2) = **2500 ft**.
 */
export function stackNightvisionRangeFlatBonus(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'sensory'>[],
): number {
  const bonuses = traits
    .map((t) => t.sensory?.nightvisionRangeFlatBonus)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (bonuses.length === 0) return 0

  const sorted = [...bonuses].sort((a, b) => b - a)
  const base = sorted[0]!
  let total = base

  for (const extra of sorted.slice(1)) {
    total += Math.floor(extra / 2)
  }

  return total
}

/**
 * Damage affinity multiplier compounding.
 *
 * Overlapping `damageAffinities` for the same damage type **multiply** together — never add.
 * Example: double (2.0) × half (0.5) → **1.0** (normal damage).
 *
 * Traits with no entry for a type are treated as neutral (1.0) and omitted from the product.
 */
export function compoundDamageAffinityMultiplier(
  multipliers: readonly MorphusDamageAffinityMultiplier[],
): MorphusDamageAffinityMultiplier {
  if (multipliers.length === 0) return 1
  const product = multipliers.reduce<number>((acc, m) => acc * m, 1)
  return normalizeDamageAffinityMultiplier(product)
}

/** Collect affinity multipliers for one damage type across active traits. */
export function collectDamageAffinityMultipliers(
  traits: readonly Pick<MorphusCharacteristic, 'damageAffinities'>[],
  damageType: MorphusDamageAffinityType,
): MorphusDamageAffinityMultiplier[] {
  return traits
    .map((t) => t.damageAffinities?.[damageType])
    .filter((m): m is MorphusDamageAffinityMultiplier => m !== undefined)
}

export function resolveCompoundDamageAffinity(
  traits: readonly Pick<MorphusCharacteristic, 'damageAffinities'>[],
  damageType: MorphusDamageAffinityType,
): MorphusDamageAffinityMultiplier {
  return compoundDamageAffinityMultiplier(
    collectDamageAffinityMultipliers(traits, damageType),
  )
}

/** Map a computed product to the nearest canonical tier (schema enum). */
export function normalizeDamageAffinityMultiplier(
  value: number,
): MorphusDamageAffinityMultiplier {
  const tiers: MorphusDamageAffinityMultiplier[] = [0, 0.1, 0.25, 0.5, 1, 1.5, 2]
  let best: MorphusDamageAffinityMultiplier = 1
  let bestDelta = Number.POSITIVE_INFINITY
  for (const tier of tiers) {
    const delta = Math.abs(tier - value)
    if (delta < bestDelta) {
      bestDelta = delta
      best = tier
    }
  }
  return best
}

/** Sum relative A.R. shifts from statModifiers.ar (e.g. Streamlined −2, Protective Gear +1). */
export function sumRelativeArShiftFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'statModifiers'>[],
): number {
  let total = 0
  for (const t of traits) {
    const ar = t.statModifiers?.ar
    if (!ar) continue
    if (ar.isOverride === true) continue
    if (typeof ar.flat === 'number') total += ar.flat
    if (typeof ar.percent === 'number' && typeof ar.dice !== 'string') {
      /* percent on A.R. shift is uncommon — treat as flat equivalent omitted */
    }
    if (ar.dice) total += polymorphicDeltaFromBase(0, [ar])
  }
  return total
}

/** Morphus saveModifiers → passive save bonus keys (lowers roll target when positive). */
export function aggregateMorphusSaveBonuses(
  traits: readonly Pick<MorphusCharacteristic, 'saveModifiers'>[],
): Record<string, number> {
  const out: Record<string, number> = {}
  const map: Record<string, string> = {
    magic: 'save_magic',
    psionics: 'save_psionics',
    insanity: 'save_insanity',
    poison: 'save_poison',
    gas: 'save_poison',
    horrorFactor: 'save_horror',
    disease: 'save_disease',
    possession: 'save_possession',
    illusions: 'save_illusions',
    nightlordMagic: 'save_magic',
    allSaves: 'save_all',
    nauseaVomiting: 'save_nausea_vomiting',
  }
  for (const t of traits) {
    const s = t.saveModifiers
    if (!s) continue
    for (const [k, v] of Object.entries(s)) {
      if (k === 'comaDeath' || typeof v !== 'number') continue
      const key = map[k] ?? `save_${k}`
      out[key] = (out[key] ?? 0) + v
    }
  }
  return out
}

/** Multiply matching terrain rows; neutral 1 when none match. */
export function resolveMorphusTerrainSpdMultiplier(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
  surfaceType: MorphusSurfaceType,
): number {
  let product = 1
  let matched = false
  for (const t of traits) {
    const rows = t.mobility?.conditionalTerrainModifiers
    if (!rows?.length) continue
    for (const row of rows) {
      if (!row.surfaceTypes.includes(surfaceType)) continue
      matched = true
      product *= row.spdMultiplier
    }
  }
  return matched ? product : 1
}

/** Skill overrides from global trait skillModifiers + terrain-isolated blocks. */
export function collectMorphusSkillOverridesForSurface(
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers' | 'mobility'>[],
  surfaceType: MorphusSurfaceType,
): MorphusSkillOverride[] {
  const out: MorphusSkillOverride[] = []
  for (const t of traits) {
    const base = t.skillModifiers?.specificSkillOverrides
    if (base?.length) out.push(...base)
    const terrain = t.mobility?.conditionalTerrainModifiers
    if (!terrain) continue
    for (const row of terrain) {
      if (!row.surfaceTypes.includes(surfaceType)) continue
      const iso = row.skillModifiers?.specificSkillOverrides
      if (iso?.length) out.push(...iso)
    }
  }
  return out
}

export function aggregateHandCapacityFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'handCapacityConstraints'>[],
): MorphusHandCapacityConstraints {
  let occupiesHands = 0
  let blocksTwoHandedWeapons = false
  for (const t of traits) {
    const h = t.handCapacityConstraints
    if (!h) continue
    occupiesHands += Math.max(0, h.occupiesHands)
    if (h.blocksTwoHandedWeapons) blocksTwoHandedWeapons = true
  }
  return { occupiesHands, blocksTwoHandedWeapons }
}

/** Default 2 manipulators — free hands available for inventory rules. */
export function morphusFreeHandSlots(
  handCapacity: MorphusHandCapacityConstraints,
  totalHands = 2,
): number {
  return Math.max(0, totalHands - handCapacity.occupiesHands)
}

export function morphusBlocksTwoHandedWeapon(
  handCapacity: MorphusHandCapacityConstraints,
  weaponCategory: string,
): boolean {
  if (!handCapacity.blocksTwoHandedWeapons) return false
  const cat = weaponCategory.toLowerCase()
  if (cat.includes('heavy') || cat.includes('two')) return true
  return handCapacity.occupiesHands >= 1
}

/** Stance types declared on any active trait (for UI toggles). */
export function collectAvailableMorphusStanceTypes(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): MorphusStanceType[] {
  const set = new Set<MorphusStanceType>()
  for (const t of traits) {
    const rows = t.mobility?.conditionalStanceModifiers
    if (!rows?.length) continue
    for (const row of rows) set.add(row.stanceType)
  }
  return [...set]
}

export function morphusBurstAbilityKey(
  traitId: string,
  abilityName: string,
): string {
  return `${traitId}::${abilityName}`
}

/** Stat modifier blocks from traits + stance + bursts + active gimmick toy switches. */
export function collectMorphusStatModifierBlocks(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'statModifiers' | 'mobility' | 'activatedAbilities' | 'gimmickToySwitches'
  >[],
  key: keyof MorphusStatModifiers,
  stanceType?: MorphusStanceType,
  activeBurstKeys?: ReadonlySet<string>,
  activeGimmickSwitchKeys?: ReadonlySet<string>,
): MorphusPolymorphicModifier[] {
  const out: MorphusPolymorphicModifier[] = []
  for (const t of traits) {
    const base = t.statModifiers?.[key]
    if (base) out.push(base)
    if (stanceType) {
      const stanceRows = t.mobility?.conditionalStanceModifiers
      if (stanceRows?.length) {
        for (const row of stanceRows) {
          if (row.stanceType !== stanceType) continue
          const sm = row.statModifiers?.[key]
          if (sm) out.push(sm)
        }
      }
    }
    if (activeBurstKeys?.size) {
      for (const ab of t.activatedAbilities ?? []) {
        const bk = morphusBurstAbilityKey(t.id, ab.abilityName)
        if (!activeBurstKeys.has(bk)) continue
        const burst = ab.statModifiers?.[key]
        if (burst) out.push(burst)
      }
    }
  }
  for (const row of collectActiveGimmickToyEffects(traits, activeGimmickSwitchKeys)) {
    const whileActive = row.effect.statModifiersWhileActive?.[key]
    if (whileActive) out.push(whileActive)
  }
  return out
}

export function unionMorphusWeaponTraits(
  traits: readonly Pick<MorphusCharacteristic, 'naturalWeapons'>[],
): MorphusWeaponTrait[] {
  const set = new Set<MorphusWeaponTrait>()
  for (const t of traits) {
    for (const w of t.naturalWeapons ?? []) {
      for (const tr of w.weaponTraits ?? []) set.add(tr)
    }
  }
  return [...set]
}

export type MorphusDerivedNaturalWeapon = MorphusNaturalWeapon & {
  sourceTraitId: string
  sourceTraitName: string
  displayDamage: string
  /** True when a trait's disabledNaturalAttackTags blocks this limbType. */
  isLimbTypeDisabled: boolean
}

/** Human-readable damage line after optional percent/flat scaling and activation cost. */
export function formatMorphusWeaponDamageDisplay(
  damageFormula: string,
  modifier?: MorphusWeaponDamageModifier,
  activationCost?: MorphusNaturalWeapon['activationCost'],
): string {
  const parts: string[] = [damageFormula]
  if (modifier?.percent) parts.push(`+${modifier.percent}%`)
  if (modifier?.flat) parts.push(`${modifier.flat >= 0 ? '+' : ''}${modifier.flat}`)
  if (activationCost) {
    parts.push(`cost ${activationCost.value} ${activationCost.resourceType.toUpperCase()}`)
  }
  return parts.length > 1 ? parts.join(' · ') : damageFormula
}

export function unionDisabledNaturalAttackTags(
  traits: readonly Pick<MorphusCharacteristic, 'disabledNaturalAttackTags'>[],
): MorphusDisabledNaturalAttackTag[] {
  const set = new Set<MorphusDisabledNaturalAttackTag>()
  for (const t of traits) {
    for (const tag of t.disabledNaturalAttackTags ?? []) set.add(tag)
  }
  return [...set]
}

export type MorphusDerivedGimmickItem = MorphusGimmickInventoryItem & {
  sourceTraitId: string
  sourceTraitName: string
}

export function flattenMorphusGimmickInventory(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'gimmickInventory'
  >[],
): MorphusDerivedGimmickItem[] {
  const out: MorphusDerivedGimmickItem[] = []
  for (const t of traits) {
    for (const g of t.gimmickInventory ?? []) {
      out.push({
        ...g,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
      })
    }
  }
  return out
}

const GIMMICK_EFFECT_KIND_LABELS: Record<MorphusGimmickToyEffectKind, string> = {
  theme_music: 'Theme music',
  sings: 'Sings',
  whistles: 'Whistles',
  loud_barking: 'Loud barking',
  angry_growl: 'Angry growl',
  loud_siren: 'Loud siren',
  voice_change: 'Voice change',
  foreign_language: 'Foreign language',
  mechanical_voice: 'Mechanical voice',
  eyes_flashlight_yellow: 'Eyes: flashlight (yellow)',
  eyes_nightvision_green: 'Eyes: nightvision (green)',
  eyes_telescopic_white: 'Eyes: telescopic (white)',
  eyes_thermal_orange: 'Eyes: thermal (orange)',
  eyes_laser_red: 'Eyes: laser (red)',
  torso_blinking_lights: 'Torso blinking lights',
  quick_disguise_head_spin: 'Quick disguise (head spin)',
  secret_compartment: 'Secret compartment',
  pop_apart_body: 'Pop-apart body',
  missile_firing: 'Missile firing',
  squirt_gun_finger: 'Squirt gun finger',
  flying_fist: 'Flying fist',
  power_punch: 'Power punch',
  karate_chop: 'Karate chop',
  karate_kick: 'Karate kick',
  retractable_claws: 'Retractable claws',
  sword_arm: 'Sword arm',
  fire_fist: 'Fire fist',
  laser_fist: 'Laser fist',
  running_action: 'Running action',
  spinning_action: 'Spinning action',
  dancing_action: 'Dancing action',
  jumping_action: 'Jumping action',
  kung_fu_leaping: 'Kung-fu leaping',
  flying_action: 'Flying action',
  roller_blade_feet: 'Roller-blade feet',
  tank_tread_legs: 'Tank tread legs',
  motorcycle_legs: 'Motorcycle legs',
  custom: 'Custom switch',
}

export const GIMMICK_TOY_SWITCH_LOCATION_LABELS: Record<
  MorphusGimmickToySwitchLocation,
  string
> = {
  back_wind_up_key: 'Back (wind-up key)',
  chest: 'Chest',
  arm_left: 'Left arm',
  arm_right: 'Right arm',
  leg_left: 'Left leg',
  leg_right: 'Right leg',
  hand_back_left: 'Back of left hand',
  hand_back_right: 'Back of right hand',
  neck: 'Neck',
  head_side: 'Side of head',
  head_back: 'Back of head',
}

export function morphusGimmickSwitchKey(traitId: string, ref: string): string {
  return `${traitId}::gimmick::${ref}`
}

export function resolveGimmickToySwitchEffect(
  board: MorphusGimmickToySwitchBoard,
  assigned: Pick<MorphusGimmickToyAssignedSwitch, 'effect' | 'effectRef'>,
): MorphusGimmickToySwitchEffect {
  if (assigned.effect) return assigned.effect
  if (assigned.effectRef) {
    const preset = board.presetEffectCatalog.find((p) => p.id === assigned.effectRef)
    if (preset) return preset.effect
  }
  throw new Error(`Unresolved gimmick switch effectRef: ${assigned.effectRef ?? '(none)'}`)
}

export function formatGimmickToyEffectLabel(effect: MorphusGimmickToySwitchEffect): string {
  if (effect.displayName?.trim()) return effect.displayName.trim()
  return GIMMICK_EFFECT_KIND_LABELS[effect.effectKind] ?? effect.effectKind
}

export type MorphusDerivedGimmickSwitch = {
  switchKey: string
  sourceTraitId: string
  sourceTraitName: string
  label: string
  bodyLocation?: MorphusGimmickToySwitchLocation
  effect: MorphusGimmickToySwitchEffect
  /** True when row comes from presetEffectCatalog (not a fixed assigned switch). */
  isPresetCatalog: boolean
}

export function flattenMorphusGimmickToySwitches(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'gimmickToySwitches'
  >[],
): MorphusDerivedGimmickSwitch[] {
  const out: MorphusDerivedGimmickSwitch[] = []
  for (const t of traits) {
    const board = t.gimmickToySwitches
    if (!board) continue

    const assigned = board.assignedSwitches ?? []
    for (let i = 0; i < assigned.length; i++) {
      const sw = assigned[i]!
      const ref = sw.label?.trim() || `${sw.bodyLocation}:${i}`
      const effect = resolveGimmickToySwitchEffect(board, sw)
      out.push({
        switchKey: morphusGimmickSwitchKey(t.id, ref),
        sourceTraitId: t.id,
        sourceTraitName: t.name,
        label: sw.label?.trim() || formatGimmickToyEffectLabel(effect),
        bodyLocation: sw.bodyLocation,
        effect,
        isPresetCatalog: false,
      })
    }

    if (assigned.length === 0) {
      for (const preset of board.presetEffectCatalog) {
        out.push({
          switchKey: morphusGimmickSwitchKey(t.id, `preset:${preset.id}`),
          sourceTraitId: t.id,
          sourceTraitName: t.name,
          label: formatGimmickToyEffectLabel(preset.effect),
          effect: preset.effect,
          isPresetCatalog: true,
        })
      }
    }
  }
  return out
}

export type ActiveGimmickToyEffectRow = {
  sourceTraitId: string
  effect: MorphusGimmickToySwitchEffect
}

/** Effects for switches currently toggled on (assigned + preset catalog keys). */
export function collectActiveGimmickToyEffects(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'name' | 'gimmickToySwitches'>[],
  activeGimmickSwitchKeys?: ReadonlySet<string>,
): ActiveGimmickToyEffectRow[] {
  if (!activeGimmickSwitchKeys?.size) return []
  const switches = flattenMorphusGimmickToySwitches(traits)
  const out: ActiveGimmickToyEffectRow[] = []
  for (const sw of switches) {
    if (!activeGimmickSwitchKeys.has(sw.switchKey)) continue
    out.push({ sourceTraitId: sw.sourceTraitId, effect: sw.effect })
  }
  return out
}

export function stackNightvisionWithActiveGimmickSwitches(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'name' | 'sensory' | 'gimmickToySwitches'>[],
  activeGimmickSwitchKeys?: ReadonlySet<string>,
): number {
  const rows: Pick<MorphusCharacteristic, 'id' | 'sensory'>[] = [...traits]
  for (const row of collectActiveGimmickToyEffects(traits, activeGimmickSwitchKeys)) {
    const bonus = row.effect.sensoryWhileActive?.nightvisionRangeFlatBonus
    if (typeof bonus === 'number' && bonus > 0) {
      rows.push({
        id: row.sourceTraitId,
        sensory: { nightvisionRangeFlatBonus: bonus },
      })
    }
  }
  return stackNightvisionRangeFlatBonus(rows)
}

export function resolveActiveGimmickSpdMultiplier(
  activeEffects: readonly ActiveGimmickToyEffectRow[],
): number {
  let product = 1
  for (const row of activeEffects) {
    const mult = row.effect.spdMultiplierWhileActive
    if (typeof mult === 'number' && mult > 0) product *= mult
  }
  return product
}

export function applyGimmickToyFlatCombatBonuses(
  modifiers: Record<string, number>,
  activeEffects: readonly ActiveGimmickToyEffectRow[],
): void {
  for (const row of activeEffects) {
    const e = row.effect
    if (e.strikeBonus) modifiers.strike = (modifiers.strike ?? 0) + e.strikeBonus
    if (e.parryBonus) modifiers.parry = (modifiers.parry ?? 0) + e.parryBonus
    if (e.dodgeBonus) modifiers.dodge = (modifiers.dodge ?? 0) + e.dodgeBonus
    if (e.disarmBonus) modifiers.disarm = (modifiers.disarm ?? 0) + e.disarmBonus
  }
}

export type MorphusVariableScaleNote = {
  traitId: string
  traitName: string
  statKey: keyof MorphusStatModifiers
  conditions: readonly string[]
}

export function collectMorphusVariableScaleNotes(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'name' | 'statModifiers'>[],
): MorphusVariableScaleNote[] {
  const out: MorphusVariableScaleNote[] = []
  for (const t of traits) {
    const sm = t.statModifiers
    if (!sm) continue
    for (const key of Object.keys(sm) as (keyof MorphusStatModifiers)[]) {
      const block = sm[key]
      const conditions = block?.variableScaleConditions
      if (!conditions?.length) continue
      out.push({
        traitId: t.id,
        traitName: t.name,
        statKey: key,
        conditions,
      })
    }
  }
  return out
}

export type MorphusAggregatedJumpBonuses = {
  standingHeight: number
  standingDistance: number
  runningHeight: number
  runningDistance: number
}

export function aggregateMorphusJumpBonuses(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): MorphusAggregatedJumpBonuses {
  const sumAxis = (axis: keyof MorphusJumpModifiers): number => {
    let total = 0
    for (const t of traits) {
      const block = t.mobility?.jumpModifiers?.[axis]
      if (!block) continue
      total += polymorphicDeltaFromBase(0, [block])
    }
    return total
  }
  return {
    standingHeight: sumAxis('standingHeight'),
    standingDistance: sumAxis('standingDistance'),
    runningHeight: sumAxis('runningHeight'),
    runningDistance: sumAxis('runningDistance'),
  }
}

/** Flat/dice swim speed bonus from Morphus mobility (Clown shoes, etc.). */
export function aggregateMorphusSwimSpeedBonus(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): number {
  let total = 0
  for (const t of traits) {
    const block = t.mobility?.swimSpeedBonus
    if (!block) continue
    total += polymorphicDeltaFromBase(0, [block])
  }
  return total
}

export type MorphusAggregatedFlightEngine = {
  maxSpeedMph: number
  maxAltitudeFeet?: number
  strikeBonus: number
  parryBonus: number
  dodgeBonus: number
}

/** Highest listed flight speed; highest altitude cap; flight combat bonuses sum. */
export function aggregateMorphusFlightEngine(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): MorphusAggregatedFlightEngine | null {
  let maxSpeedMph = 0
  let maxAltitudeFeet: number | undefined
  let strikeBonus = 0
  let parryBonus = 0
  let dodgeBonus = 0

  for (const t of traits) {
    const engine = t.mobility?.flightEngine
    if (!engine) continue
    if (engine.maxSpeedMph != null && engine.maxSpeedMph > maxSpeedMph) {
      maxSpeedMph = engine.maxSpeedMph
    }
    if (engine.maxAltitudeFeet != null) {
      maxAltitudeFeet = Math.max(maxAltitudeFeet ?? 0, engine.maxAltitudeFeet)
    }
    const fcb = engine.flightCombatBonuses
    if (fcb?.strike) strikeBonus += polymorphicDeltaFromBase(0, [fcb.strike])
    if (fcb?.parry) parryBonus += polymorphicDeltaFromBase(0, [fcb.parry])
    if (fcb?.dodge) dodgeBonus += polymorphicDeltaFromBase(0, [fcb.dodge])
  }

  if (
    maxSpeedMph === 0 &&
    maxAltitudeFeet == null &&
    strikeBonus === 0 &&
    parryBonus === 0 &&
    dodgeBonus === 0
  ) {
    return null
  }

  return {
    maxSpeedMph,
    maxAltitudeFeet,
    strikeBonus,
    parryBonus,
    dodgeBonus,
  }
}

export type MorphusAggregatedSensoryFlags = {
  telescopicVision: boolean
  seeInvisible: boolean
}

export function aggregateMorphusSensoryFlags(
  traits: readonly Pick<MorphusCharacteristic, 'sensory'>[],
): MorphusAggregatedSensoryFlags {
  return {
    telescopicVision: traits.some((t) => t.sensory?.telescopicVision === true),
    seeInvisible: traits.some((t) => t.sensory?.seeInvisible === true),
  }
}

export type MorphusDamageAffinityNote = {
  damageType: MorphusDamageAffinityType
  multiplier: number
  label: string
}

const DAMAGE_AFFINITY_LABELS: Partial<Record<MorphusDamageAffinityType, string>> = {
  explosives: 'Explosives / impact objects',
  falling: 'Falls',
  fire: 'Fire',
  heat: 'Heat',
  cold: 'Cold',
  ice: 'Ice',
  electricity: 'Electricity',
  lasers: 'Lasers',
  light: 'Light',
  kinetic: 'Kinetic',
}

export function formatMorphusDamageAffinityMultiplier(multiplier: number): string {
  if (multiplier === 0) return 'immune'
  if (multiplier === 0.1) return '10% damage'
  if (multiplier === 0.25) return '¼ damage'
  if (multiplier === 0.5) return '½ damage'
  if (multiplier === 1.5) return '×1.5 damage'
  if (multiplier === 2) return '×2 damage'
  return `×${multiplier}`
}

export type MorphusDerivedLimbComponent = MorphusLimbDurability & {
  sourceTraitId: string
  sourceTraitName: string
}

export function flattenMorphusLimbComponents(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'limbDurability'
  >[],
): MorphusDerivedLimbComponent[] {
  const out: MorphusDerivedLimbComponent[] = []
  for (const t of traits) {
    for (const limb of t.limbDurability ?? []) {
      out.push({
        ...limb,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
      })
    }
  }
  return out
}

export type MorphusDerivedActivatedAbility = MorphusActivatedAbility & {
  sourceTraitId: string
  sourceTraitName: string
  burstKey: string
}

export function flattenMorphusActivatedAbilities(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'activatedAbilities'
  >[],
): MorphusDerivedActivatedAbility[] {
  const out: MorphusDerivedActivatedAbility[] = []
  for (const t of traits) {
    for (const ab of t.activatedAbilities ?? []) {
      out.push({
        ...ab,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
        burstKey: morphusBurstAbilityKey(t.id, ab.abilityName),
      })
    }
  }
  return out
}

const INTERCEPT_ACTION_LABELS: Record<
  MorphusSpecialCombatInterception['interceptAction'],
  string
> = {
  parry_shadow_darkness: 'Parry shadow / darkness',
  parry_lasers_light: 'Parry lasers / light',
  bare_handed_melee_parry: 'Bare-handed melee parry',
}

export type MorphusDerivedCombatInterception = MorphusSpecialCombatInterception & {
  sourceTraitId: string
  sourceTraitName: string
  label: string
}

export function flattenMorphusCombatInterceptions(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'specialCombatInterceptions'
  >[],
): MorphusDerivedCombatInterception[] {
  const out: MorphusDerivedCombatInterception[] = []
  for (const t of traits) {
    for (const row of t.specialCombatInterceptions ?? []) {
      out.push({
        ...row,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
        label: INTERCEPT_ACTION_LABELS[row.interceptAction] ?? row.interceptAction,
      })
    }
  }
  return out
}

export function collectMorphusDamageAffinityNotes(
  traits: readonly Pick<MorphusCharacteristic, 'damageAffinities'>[],
): MorphusDamageAffinityNote[] {
  const types = new Set<MorphusDamageAffinityType>()
  for (const t of traits) {
    if (!t.damageAffinities) continue
    for (const k of Object.keys(t.damageAffinities) as MorphusDamageAffinityType[]) {
      types.add(k)
    }
  }
  const out: MorphusDamageAffinityNote[] = []
  for (const damageType of types) {
    const multiplier = resolveCompoundDamageAffinity(traits, damageType)
    if (multiplier === 1) continue
    out.push({
      damageType,
      multiplier,
      label: DAMAGE_AFFINITY_LABELS[damageType] ?? damageType,
    })
  }
  return out
}

export function flattenMorphusNaturalWeapons(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'naturalWeapons' | 'disabledNaturalAttackTags' | 'gimmickToySwitches'
  >[],
  disabledTags: readonly MorphusDisabledNaturalAttackTag[] = unionDisabledNaturalAttackTags(
    traits,
  ),
  activeGimmickSwitchKeys?: ReadonlySet<string>,
): MorphusDerivedNaturalWeapon[] {
  const disabled = new Set(disabledTags)
  const out: MorphusDerivedNaturalWeapon[] = []
  for (const t of traits) {
    for (const w of t.naturalWeapons ?? []) {
      const limbDisabled =
        w.limbType !== 'misc_limbs' &&
        w.limbType !== 'pincers' &&
        w.limbType !== 'talons' &&
        w.limbType !== 'stomp' &&
        w.limbType !== 'beak' &&
        disabled.has(w.limbType as MorphusDisabledNaturalAttackTag)
      out.push({
        ...w,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
        displayDamage: formatMorphusWeaponDamageDisplay(
          w.damageFormula,
          w.damageModifier,
          w.activationCost,
        ),
        isLimbTypeDisabled: limbDisabled,
      })
    }
  }
  for (const row of collectActiveGimmickToyEffects(traits, activeGimmickSwitchKeys)) {
    const w = row.effect.naturalWeaponWhileActive
    if (!w) continue
    const trait = traits.find((t) => t.id === row.sourceTraitId)
    out.push({
      ...w,
      sourceTraitId: row.sourceTraitId,
      sourceTraitName: trait?.name ?? row.sourceTraitId,
      displayDamage: formatMorphusWeaponDamageDisplay(
        w.damageFormula,
        w.damageModifier,
        w.activationCost,
      ),
      isLimbTypeDisabled: false,
    })
  }
  return out
}

export type MorphusDerivedCompanion = {
  sourceTraitId: string
  sourceTraitName: string
  entityName: string
  poolSharingRule: MorphusCompanionBlueprint['poolSharingRule']
  attributeDeltas: Partial<Record<keyof MorphusStatModifiers, number>>
}

export function resolveMorphusCompanionSnapshots(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'companionBlueprint'
  >[],
): MorphusDerivedCompanion[] {
  const out: MorphusDerivedCompanion[] = []
  for (const t of traits) {
    const bp = t.companionBlueprint
    if (!bp) continue
    const attributeDeltas: MorphusDerivedCompanion['attributeDeltas'] = {}
    const sm = bp.statModifiers
    if (sm) {
      for (const key of Object.keys(sm) as (keyof MorphusStatModifiers)[]) {
        const blocks = sm[key]
        if (!blocks) continue
        attributeDeltas[key] = polymorphicDeltaFromBase(0, [blocks])
      }
    }
    out.push({
      sourceTraitId: t.id,
      sourceTraitName: t.name,
      entityName: bp.entityName,
      poolSharingRule: bp.poolSharingRule,
      attributeDeltas,
    })
  }
  return out
}

export type MorphusTraitNote = {
  traitId: string
  traitName: string
  lines: readonly string[]
}

export function collectMorphusTraitNotes(
  traits: readonly Pick<
    MorphusCharacteristic,
    | 'id'
    | 'name'
    | 'customOneOffs'
    | 'gimmickToySwitches'
    | 'variantPercentiles'
    | 'crossTableRoll'
    | 'morphusRules'
    | 'entryRole'
    | 'atWillAbilities'
    | 'playerChoices'
  >[],
): MorphusTraitNote[] {
  const out: MorphusTraitNote[] = []
  for (const t of traits) {
    const lines: string[] = [...(t.customOneOffs ?? [])]
    if (t.entryRole === 'table_router') {
      lines.unshift(`[Router] ${t.name} — follow table instructions; not a final Morphus look.`)
    }
    for (const v of t.variantPercentiles ?? []) {
      lines.push(`[${v.roll}] ${v.label}${v.description ? `: ${v.description}` : ''}`)
      if (v.customOneOffs?.length) lines.push(...v.customOneOffs)
    }
    if (t.crossTableRoll) {
      const ref = t.crossTableRoll.targetTableName ?? t.crossTableRoll.targetTableId
      lines.push(`Also roll on: ${ref}${t.crossTableRoll.note ? ` (${t.crossTableRoll.note})` : ''}`)
    }
    for (const rule of t.morphusRules ?? []) {
      lines.push(`[${rule.kind}] ${rule.summary}`)
    }
    for (const aw of t.atWillAbilities ?? []) {
      lines.push(`[ability] ${aw.label}${aw.note ? `: ${aw.note}` : ''}`)
    }
    for (const pc of t.playerChoices ?? []) {
      lines.push(`[choice] ${pc.label}: ${pc.options.join(' · ')}`)
    }
    const board = t.gimmickToySwitches
    if (board) {
      if (board.disguiseImpossible) lines.push('Disguise impossible while this Morphus is active.')
      if (board.customClothingRequired) {
        lines.push('Custom Morphus clothing required.')
      }
      if (board.gmApprovalRequiredForCustom) {
        lines.push('Player-suggested custom switch effects require G.M. approval.')
      }
      if ((board.assignedSwitches?.length ?? 0) === 0) {
        lines.push(
          'No switches assigned on this table row — toggle preset catalog effects below for play, or assign fixed switches at character creation.',
        )
      }
    }
    if (lines.length) {
      out.push({ traitId: t.id, traitName: t.name, lines })
    }
  }
  return out
}

/** Flatten narrative percentile checks from trait skillModifiers (+ terrain-isolated rows). */
export function collectMorphusCustomSystemRolls(
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers' | 'mobility'>[],
  surfaceType: MorphusSurfaceType,
): MorphusCustomSystemRoll[] {
  const out: MorphusCustomSystemRoll[] = []
  for (const t of traits) {
    const base = t.skillModifiers?.customSystemRolls
    if (base?.length) out.push(...base)
    const terrain = t.mobility?.conditionalTerrainModifiers
    if (!terrain) continue
    for (const row of terrain) {
      if (!row.surfaceTypes.includes(surfaceType)) continue
      const iso = row.skillModifiers?.customSystemRolls
      if (iso?.length) out.push(...iso)
    }
  }
  return out
}

export type MorphusDerivedCustomSystemRoll = MorphusCustomSystemRoll & {
  sourceTraitId: string
  sourceTraitName: string
  resolvedChance: number
}

export function resolveCustomSystemRollChance(
  roll: MorphusCustomSystemRoll,
  characterLevel: number,
): number {
  const level = Math.max(1, Math.floor(characterLevel))
  let chance = roll.baseSuccessChance
  const scaling = roll.levelIntervalScaling
  if (scaling && scaling.levelInterval > 0) {
    const intervals = Math.floor((level - 1) / scaling.levelInterval)
    chance += intervals * scaling.chanceBonus
  }
  return Math.min(98, Math.max(0, chance))
}

export function resolveMorphusCustomSystemRollSnapshots(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'skillModifiers' | 'mobility'
  >[],
  characterLevel: number,
  surfaceType: MorphusSurfaceType = 'hard_flat',
): MorphusDerivedCustomSystemRoll[] {
  const out: MorphusDerivedCustomSystemRoll[] = []
  for (const t of traits) {
    const rolls: MorphusCustomSystemRoll[] = []
    const base = t.skillModifiers?.customSystemRolls
    if (base?.length) rolls.push(...base)
    const terrain = t.mobility?.conditionalTerrainModifiers
    if (terrain) {
      for (const row of terrain) {
        if (!row.surfaceTypes.includes(surfaceType)) continue
        const iso = row.skillModifiers?.customSystemRolls
        if (iso?.length) rolls.push(...iso)
      }
    }
    for (const roll of rolls) {
      out.push({
        ...roll,
        sourceTraitId: t.id,
        sourceTraitName: t.name,
        resolvedChance: resolveCustomSystemRollChance(roll, characterLevel),
      })
    }
  }
  return out
}

/** Merge burrow profiles: max speed, union of allowed substrates. */
export function mergeMorphusBurrowingEngines(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): MorphusBurrowingEngine | undefined {
  let feet = 0
  const substrates = new Set<MorphusBurrowSubstrate>()
  for (const t of traits) {
    const b = t.mobility?.burrowingEngine
    if (!b) continue
    feet = Math.max(feet, b.feetPerMeleeRound)
    for (const s of b.allowedSubstrates) substrates.add(s)
  }
  if (feet === 0 && substrates.size === 0) return undefined
  return {
    feetPerMeleeRound: feet,
    allowedSubstrates: [...substrates],
  }
}

export function unionExternalSensoryObfuscation(
  traits: readonly Pick<MorphusCharacteristic, 'sensory'>[],
): MorphusExternalSensoryObfuscation[] {
  const set = new Set<MorphusExternalSensoryObfuscation>()
  for (const t of traits) {
    for (const o of t.sensory?.externalSensoryObfuscation ?? []) set.add(o)
  }
  return [...set]
}

export type MorphusPolymorphicTemplateFlag = {
  traitId: string
  traitName: string
}

export function collectPolymorphicTemplateTraits(
  traits: readonly Pick<
    MorphusCharacteristic,
    'id' | 'name' | 'isPolymorphicTemplate'
  >[],
): MorphusPolymorphicTemplateFlag[] {
  return traits
    .filter((t) => t.isPolymorphicTemplate === true)
    .map((t) => ({ traitId: t.id, traitName: t.name }))
}

/** Sum balance % bonuses from mobility (Disproportion feet/legs). */
export function aggregateMorphusBalanceModifierPercent(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): number {
  let total = 0
  for (const t of traits) {
    const v = t.mobility?.balanceModifierPercent
    if (typeof v === 'number') total += v
  }
  return total
}

/** Highest reach extension among active traits. */
export function aggregateMorphusReachPercentBonus(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): number {
  let max = 0
  for (const t of traits) {
    const v = t.mobility?.reachPercentBonus
    if (typeof v === 'number' && v > max) max = v
  }
  return max
}

/** Product of jump multipliers (default 1). */
export function aggregateMorphusJumpMultiplier(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
): { multiplier: number; minimumJumpFeet: number } {
  let multiplier = 1
  let minimumJumpFeet = 0
  for (const t of traits) {
    const m = t.mobility?.jumpMultiplier
    if (typeof m === 'number' && m > 0) multiplier *= m
    const min = t.mobility?.minimumJumpFeet
    if (typeof min === 'number' && min > minimumJumpFeet) minimumJumpFeet = min
  }
  return { multiplier, minimumJumpFeet }
}

function pushCapabilityLine(
  lines: MorphusDerivedCapabilityLine[],
  category: MorphusCapabilityCategory,
  label: string,
  detail: string,
  trait: { id: string; name: string },
  polarity: MorphusCapabilityPolarity = 'neutral',
): void {
  lines.push({
    category,
    label,
    detail,
    sourceTraitId: trait.id,
    sourceTraitName: trait.name,
    polarity,
  })
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function formatCombatAdjust(strike?: number, parry?: number, dodge?: number): string {
  const parts: string[] = []
  if (strike != null) parts.push(`${formatSigned(strike)} strike`)
  if (parry != null) parts.push(`${formatSigned(parry)} parry`)
  if (dodge != null) parts.push(`${formatSigned(dodge)} dodge`)
  return parts.join(', ')
}

/**
 * Player-facing digest of Morphus capabilities — structured fields from active traits,
 * grouped for character sheet presentation.
 */
export function buildMorphusCapabilitySummary(
  traits: readonly MorphusCharacteristic[],
  characterLevel = 1,
): MorphusCapabilitySummary {
  const lines: MorphusDerivedCapabilityLine[] = []
  const level = Math.max(1, Math.floor(characterLevel))

  for (const t of traits) {
    if (t.entryRole === 'table_router') {
      pushCapabilityLine(
        lines,
        'workflow',
        'Table router',
        t.description ?? `Roll on the ${t.name} sub-table.`,
        t,
        'neutral',
      )
      continue
    }

    const sensory = t.sensory
    if (sensory?.peripheralVisionDegrees != null) {
      pushCapabilityLine(
        lines,
        'senses',
        'Peripheral vision',
        `${sensory.peripheralVisionDegrees}° arc`,
        t,
        sensory.peripheralVisionDegrees >= 180 ? 'bonus' : 'penalty',
      )
    }
    if (sensory?.lightSensitivity) {
      const ls = sensory.lightSensitivity
      const bits: string[] = []
      if (ls.daylightVisionMultiplier != null) {
        bits.push(`daylight vision ×${ls.daylightVisionMultiplier}`)
      }
      if (ls.perceptionVisionPenalty != null) {
        bits.push(`${formatSigned(ls.perceptionVisionPenalty)} Perception (vision) in bright light`)
      }
      if (bits.length) {
        pushCapabilityLine(lines, 'senses', 'Light sensitive', bits.join('; '), t, 'penalty')
      }
    }
    if (sensory?.invisibleToThermalImaging) {
      pushCapabilityLine(
        lines,
        'senses',
        'Thermal imaging',
        'Does not register on heat sensors',
        t,
        'bonus',
      )
    }
    if (sensory?.prowlUnderwaterModifierPercent != null) {
      pushCapabilityLine(
        lines,
        'skills',
        'Prowl underwater',
        `${formatSigned(sensory.prowlUnderwaterModifierPercent)}% hide/Prowl underwater`,
        t,
        sensory.prowlUnderwaterModifierPercent >= 0 ? 'bonus' : 'penalty',
      )
    }
    const scent = sensory?.scentTracking
    if (scent) {
      if (scent.enabled === false) {
        pushCapabilityLine(lines, 'senses', 'Scent tracking', 'Cannot track by scent', t, 'penalty')
      } else if (scent.baseSuccessPercent != null) {
        const perLvl = scent.perLevelIncrement ?? 0
        const resolved = Math.min(
          98,
          scent.baseSuccessPercent + Math.max(0, level - 1) * perLvl,
        )
        pushCapabilityLine(
          lines,
          'senses',
          'Scent tracking',
          `${resolved}% at level ${level} (${scent.baseSuccessPercent}% + ${perLvl}%/level)`,
          t,
          'bonus',
        )
      }
      if (scent.identifyOdorsModifierPercent != null) {
        pushCapabilityLine(
          lines,
          'senses',
          'Identify odors',
          `${formatSigned(scent.identifyOdorsModifierPercent)}%`,
          t,
          scent.identifyOdorsModifierPercent >= 0 ? 'bonus' : 'penalty',
        )
      }
    }

    const mob = t.mobility
    if (mob?.balanceModifierPercent != null) {
      pushCapabilityLine(
        lines,
        'movement',
        'Balance',
        `${formatSigned(mob.balanceModifierPercent)}%`,
        t,
        mob.balanceModifierPercent >= 0 ? 'bonus' : 'penalty',
      )
    }
    if (mob?.reachPercentBonus != null) {
      pushCapabilityLine(
        lines,
        'combat',
        'Reach',
        `${mob.reachPercentBonus}% longer than usual`,
        t,
        'bonus',
      )
    }
    if (mob?.jumpMultiplier != null && mob.jumpMultiplier !== 1) {
      const min =
        mob.minimumJumpFeet != null ? ` (${mob.minimumJumpFeet} ft minimum)` : ''
      pushCapabilityLine(
        lines,
        'movement',
        'Jumping',
        `×${mob.jumpMultiplier} distance and height${min}`,
        t,
        'bonus',
      )
    }
    if (mob?.waterlogMinutesDice) {
      pushCapabilityLine(
        lines,
        'recovery',
        'Waterlogging',
        `Sinks after ${mob.waterlogMinutesDice} minutes in water`,
        t,
        'penalty',
      )
    }
    if (mob?.aquaticTraits?.buoyancy === 'sink') {
      pushCapabilityLine(lines, 'movement', 'Aquatic', 'Cannot swim (sinks)', t, 'penalty')
    } else if (mob?.aquaticTraits?.buoyancy === 'float') {
      pushCapabilityLine(lines, 'movement', 'Aquatic', 'Floats on water', t, 'bonus')
    }

    for (const limb of t.limbDurability ?? []) {
      if (limb.requiresCalledShot) {
        const pen =
          limb.calledShotPenalty != null
            ? `; ${formatSigned(limb.calledShotPenalty)} to strike when called`
            : ''
        pushCapabilityLine(
          lines,
          'defense',
          limb.limbName,
          `Called Shot required to target${pen}`,
          t,
          'bonus',
        )
      } else if (limb.calledShotPenalty != null && limb.calledShotPenalty !== 0) {
        pushCapabilityLine(
          lines,
          'defense',
          `Called shot: ${limb.limbName}`,
          `${formatSigned(limb.calledShotPenalty)} to strike`,
          t,
          limb.calledShotPenalty < 0 ? 'bonus' : 'penalty',
        )
      }
    }

    for (const cm of t.combatContextModifiers ?? []) {
      if (cm.grapplingAffordance === 'rope_grip_with_teeth') {
        pushCapabilityLine(
          lines,
          'combat',
          'Grappling',
          cm.note ?? 'Hold rope with teeth at hand strength without neck injury',
          t,
          'bonus',
        )
        continue
      }
      const who = cm.target === 'self' ? 'You' : 'Opponents'
      const adj = formatCombatAdjust(cm.strike, cm.parry, cm.dodge)
      const cond =
        cm.condition === 'bright_light'
          ? 'in bright light'
          : cm.condition === 'surprise_from_behind_or_side'
            ? 'on surprise from behind/side'
            : 'in grappling'
      if (adj) {
        const pol =
          (cm.strike ?? 0) + (cm.parry ?? 0) + (cm.dodge ?? 0) >= 0 ? 'bonus' : 'penalty'
        pushCapabilityLine(lines, 'combat', cond, `${who}: ${adj}`, t, pol)
      }
    }

    for (const rb of t.recoveryBehaviors ?? []) {
      const bits: string[] = []
      if (rb.reformMinutesDice) bits.push(`reform in ${rb.reformMinutesDice} min`)
      if (rb.residualSdcPercent != null) bits.push(`${rb.residualSdcPercent}% S.D.C./H.P. after reform`)
      if (rb.lockoutHoursDice) bits.push(`Facade lockout ${rb.lockoutHoursDice} hr`)
      if (rb.globCountDice) bits.push(`${rb.globCountDice} fragments`)
      if (rb.dryHoursDice) bits.push(`dry out in ${rb.dryHoursDice} hr`)
      if (rb.gardenHoseDamage) bits.push(`garden hose ${rb.gardenHoseDamage}`)
      if (rb.fireHoseDamage) bits.push(`fire hose ${rb.fireHoseDamage}`)
      if (rb.note) bits.push(rb.note)
      pushCapabilityLine(
        lines,
        'recovery',
        rb.trigger.replace(/_/g, ' '),
        bits.join('; ') || rb.trigger,
        t,
        'neutral',
      )
    }

    for (const cp of t.conditionalPenalties ?? []) {
      const bits: string[] = []
      if (cp.apmMultiplier != null) bits.push(`APM ×${cp.apmMultiplier}`)
      if (cp.spdMultiplier != null) bits.push(`Spd ×${cp.spdMultiplier}`)
      if (cp.note) bits.push(cp.note)
      pushCapabilityLine(
        lines,
        'combat',
        cp.trigger.replace(/_/g, ' '),
        bits.join('; '),
        t,
        'penalty',
      )
    }

    const ac = t.appearanceConstraints
    if (ac) {
      if (ac.clothingFit) {
        const fitLabel: Record<string, string> = {
          oversized_required: 'Oversized clothing required',
          custom_required: 'Custom clothing required',
          loose_required: 'Loose/oversized clothing required',
          baggy_appearance: 'Clothing appears baggy/frumpy',
        }
        pushCapabilityLine(lines, 'appearance', 'Clothing', fitLabel[ac.clothingFit] ?? ac.clothingFit, t, 'penalty')
      }
      if (ac.narrowOpeningAccess === 'restricted') {
        pushCapabilityLine(
          lines,
          'appearance',
          'Narrow spaces',
          'Trouble fitting through narrow openings',
          t,
          'penalty',
        )
      } else if (ac.narrowOpeningAccess === 'enhanced') {
        pushCapabilityLine(
          lines,
          'appearance',
          'Narrow spaces',
          'Fits through small openings easily',
          t,
          'bonus',
        )
      }
      if (ac.hideAmongContext) {
        pushCapabilityLine(
          lines,
          'appearance',
          'Hide',
          `Indistinguishable among ${ac.hideAmongContext}`,
          t,
          'bonus',
        )
      }
      if (ac.standMotionlessIndefinitely) {
        pushCapabilityLine(
          lines,
          'abilities',
          'Stand motionless',
          'Can hold perfectly still indefinitely',
          t,
          'bonus',
        )
      }
      if (ac.customFootwearRequired) {
        pushCapabilityLine(lines, 'appearance', 'Footwear', 'Custom shoes may be required', t, 'penalty')
      }
      if (ac.customClothingNote) {
        pushCapabilityLine(lines, 'appearance', 'Clothing note', ac.customClothingNote, t, 'neutral')
      }
    }

    for (const aw of t.atWillAbilities ?? []) {
      pushCapabilityLine(
        lines,
        'abilities',
        aw.label,
        aw.note ?? 'At will',
        t,
        'bonus',
      )
    }

    for (const pc of t.playerChoices ?? []) {
      pushCapabilityLine(
        lines,
        'choices',
        pc.label,
        pc.options.join(' · '),
        t,
        'choice',
      )
    }

    if (t.tableWorkflow?.stepOneRollCount != null) {
      pushCapabilityLine(
        lines,
        'workflow',
        'Multi-area disproportion',
        `Roll Step One ${t.tableWorkflow.stepOneRollCount} times, then each sub-table`,
        t,
        'neutral',
      )
    }

    if (t.crossTableRoll) {
      const ref = t.crossTableRoll.targetTableName ?? t.crossTableRoll.targetTableId
      pushCapabilityLine(
        lines,
        'workflow',
        'Cross-table',
        `Also roll ${ref}${t.crossTableRoll.note ? ` — ${t.crossTableRoll.note}` : ''}`,
        t,
        'neutral',
      )
    }

    const lw = t.livingWeaponRules
    if (lw) {
      const bits: string[] = []
      if (lw.sdcPerLevel != null) bits.push(`+${lw.sdcPerLevel} S.D.C./level`)
      if (lw.onlyDamagedWhenTargeted) bits.push('only damaged when targeted')
      if (lw.vanishesWhenBothZero) bits.push('vanishes if weapon and body S.D.C. both 0')
      if (lw.preferredWeapon) bits.push('prefers this weapon')
      if (lw.hardToConceal) bits.push('hard to conceal')
      pushCapabilityLine(lines, 'combat', 'Living weapon', bits.join('; '), t, 'neutral')
    }

    for (const scm of t.skillContextModifiers ?? []) {
      const ctx = scm.context.replace(/_/g, ' ')
      pushCapabilityLine(
        lines,
        'skills',
        scm.skillId.replace(/^skill_/, '').replace(/_/g, ' '),
        `${formatSigned(scm.modifierPercent)}% (${ctx})`,
        t,
        scm.modifierPercent >= 0 ? 'bonus' : 'penalty',
      )
    }

    const dl = t.disguiseLimits
    if (dl) {
      const bits: string[] = []
      if (dl.similarSizeWeightOnly) bits.push('similar size/weight only')
      if (dl.cannotImpersonateIndividuals) bits.push('cannot impersonate specific people')
      if (dl.skinColorRequiresMakeup) bits.push('skin color needs makeup')
      if (dl.note) bits.push(dl.note)
      if (bits.length) {
        pushCapabilityLine(lines, 'skills', 'Disguise limits', bits.join('; '), t, 'penalty')
      }
    }

    if (t.saveModifiers?.nauseaVomiting != null) {
      pushCapabilityLine(
        lines,
        'defense',
        'Save vs nausea',
        formatSigned(t.saveModifiers.nauseaVomiting),
        t,
        t.saveModifiers.nauseaVomiting >= 0 ? 'bonus' : 'penalty',
      )
    }

    // Legacy morphusRules until rows are migrated
    for (const rule of t.morphusRules ?? []) {
      const pol: MorphusCapabilityPolarity =
        rule.kind === 'player_choice'
          ? 'choice'
          : rule.kind === 'environmental_vulnerability' ||
              rule.kind === 'immobilization'
            ? 'penalty'
            : 'neutral'
      pushCapabilityLine(lines, 'abilities', rule.kind.replace(/_/g, ' '), rule.summary, t, pol)
    }

    for (const note of t.customOneOffs ?? []) {
      pushCapabilityLine(lines, 'abilities', 'Note', note, t, 'neutral')
    }
  }

  const byCategory: Partial<Record<MorphusCapabilityCategory, MorphusDerivedCapabilityLine[]>> =
    {}
  for (const line of lines) {
    const bucket = byCategory[line.category] ?? []
    bucket.push(line)
    byCategory[line.category] = bucket
  }

  return { lines, byCategory }
}
