import type {
  ActiveForm,
  Character,
  FeatureModifiers,
  MorphusCharacteristic,
  MorphusPolymorphicModifier,
  MorphusStatModifiers,
} from '../types'
import { getFormState } from '../types'
import { resolveMorphusCharacteristicsByIds } from '../data/library/morphusTableCatalogLoader'
import {
  aggregateHandCapacityFromTraits,
  aggregateMorphusSaveBonuses,
  collectMorphusSkillOverridesForSurface,
  resolveMorphusTerrainSpdMultiplier,
  sumRelativeArShiftFromTraits,
} from './morphusCharacteristicAggregation'
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

function collectModifiersForStat(
  traits: readonly MorphusCharacteristic[],
  key: keyof MorphusStatModifiers,
): MorphusPolymorphicModifier[] {
  const out: MorphusPolymorphicModifier[] = []
  for (const t of traits) {
    const m = t.statModifiers?.[key]
    if (m) out.push(m)
  }
  return out
}

export type MorphusPassiveBundle = {
  modifiers: FeatureModifiers
  /** Additive shift to equipped + natural A.R. (statModifiers.ar flat sum). */
  relativeArShift: number
  terrainSpdMultiplier: number
  terrainSkillOverrides: ReturnType<typeof collectMorphusSkillOverridesForSurface>
  handCapacity: ReturnType<typeof aggregateHandCapacityFromTraits>
}

export function resolveActiveMorphusTraits(
  character: Pick<Character, 'activeMorphusCharacteristicIds'>,
): MorphusCharacteristic[] {
  return resolveMorphusCharacteristicsByIds(
    character.activeMorphusCharacteristicIds ?? [],
  )
}

/**
 * Morphus-only passive bundle for sheet/combat engines (master_flow middleware).
 */
export function buildMorphusPassiveBundle(
  character: Character,
  activeForm: ActiveForm,
  surfaceType: import('../types').MorphusSurfaceType = 'hard_flat',
): MorphusPassiveBundle | null {
  if (activeForm !== 'morphus') return null
  const traits = resolveActiveMorphusTraits(character)
  if (!traits.length) return null

  const form = getFormState(character, activeForm)
  const attrs = form.attributes
  const modifiers: FeatureModifiers = {}

  for (const [statKey, passiveKey] of Object.entries(STAT_TO_PASSIVE)) {
    const key = statKey as keyof MorphusStatModifiers
    const pk = passiveKey as keyof FeatureModifiers
    const blocks = collectModifiersForStat(traits, key)
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

  for (const t of traits) {
    const wc = t.weaponClassBonuses
    if (!wc) continue
    if (wc.melee?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.melee.flat
    if (wc.thrown?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.thrown.flat
    if (wc.bow?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.bow.flat
    if (wc.guns?.flat) modifiers.strike = (modifiers.strike ?? 0) + wc.guns.flat
  }

  return {
    modifiers,
    relativeArShift: sumRelativeArShiftFromTraits(traits),
    terrainSpdMultiplier: resolveMorphusTerrainSpdMultiplier(traits, surfaceType),
    terrainSkillOverrides: collectMorphusSkillOverridesForSurface(
      traits,
      surfaceType,
    ),
    handCapacity: aggregateHandCapacityFromTraits(traits),
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
