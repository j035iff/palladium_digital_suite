import type {
  MorphusCharacteristic,
  MorphusPolymorphicModifier,
  MorphusStatModifiers,
} from '../types'
import { rollDiceNotation } from './diceNotation'

export type PolymorphicResolveOptions = {
  rollDice?: (notation: string) => number
  /**
   * When false, minValue/maxValue are deferred (creation preview until Finalize Morphus).
   * Defaults to true.
   */
  applyFloors?: boolean
}

/** During Trait Forge preview, apply flats/percents but defer dice to Spawn rolls. */
export function morphusCreationPreviewResolveOptions(
  finalized: boolean,
): PolymorphicResolveOptions {
  if (finalized) return { applyFloors: true }
  return { applyFloors: false, rollDice: () => 0 }
}

function normalizeResolveOptions(
  opts?: PolymorphicResolveOptions | ((notation: string) => number),
): { rollDice: (notation: string) => number; applyFloors: boolean } {
  if (typeof opts === 'function') {
    return { rollDice: opts, applyFloors: true }
  }
  return {
    rollDice: opts?.rollDice ?? evaluatePolymorphicDice,
    applyFloors: opts?.applyFloors ?? true,
  }
}

/**
 * Evaluate one Morphus polymorphic block (flat / dice / percent).
 * Dice strings support Palladium forms and leading minus (e.g. "-1D6", "2D4x10+40").
 */
export function evaluatePolymorphicDice(notation: string): number {
  const trimmed = notation.trim().replace(/\s+/g, '')
  const neg = /^-/.test(trimmed)
  let core = neg ? trimmed.slice(1) : trimmed
  if (neg && core.startsWith('(') && core.endsWith(')')) {
    core = core.slice(1, -1)
  }
  const rolled = rollDiceNotation(core)
  return neg ? -rolled : rolled
}

/** Human-readable label for UI (dice formula or flat value). */
export function formatPolymorphicModifier(mod?: MorphusPolymorphicModifier): string {
  if (!mod) return '—'
  if (mod.dice) return mod.dice
  if (mod.flat != null) return String(mod.flat)
  if (mod.percent != null) return `${mod.percent >= 0 ? '+' : ''}${mod.percent}%`
  return '—'
}

export function hasPolymorphicPayload(mod?: MorphusPolymorphicModifier): boolean {
  if (!mod) return false
  return (
    mod.flat != null ||
    mod.dice != null ||
    mod.percent != null ||
    mod.isOverride === true
  )
}

/** Highest minValue floor declared on active traits for one attribute axis. */
export function collectMorphusAttributeMinFloor(
  traits: readonly Pick<MorphusCharacteristic, 'statModifiers'>[],
  key: keyof MorphusStatModifiers,
): number | undefined {
  let min: number | undefined
  for (const trait of traits) {
    const block = trait.statModifiers?.[key]
    if (typeof block?.minValue !== 'number') continue
    min = min == null ? block.minValue : Math.max(min, block.minValue)
  }
  return min
}

function applyModifierFloors(
  value: number,
  modifiers: readonly MorphusPolymorphicModifier[],
): number {
  let minFloor: number | undefined
  let maxCeil: number | undefined
  for (const m of modifiers) {
    if (typeof m.minValue === 'number') {
      minFloor = minFloor == null ? m.minValue : Math.max(minFloor, m.minValue)
    }
    if (typeof m.maxValue === 'number') {
      maxCeil = maxCeil == null ? m.maxValue : Math.min(maxCeil, m.maxValue)
    }
  }
  if (minFloor != null) value = Math.max(value, minFloor)
  if (maxCeil != null) value = Math.min(value, maxCeil)
  return value
}

/**
 * Resolve a single stat from base + stacked modifiers on one axis.
 * Override blocks (last override wins) replace the pipeline; otherwise flat → percent → dice.
 */
export function resolveStatWithPolymorphicModifiers(
  base: number,
  modifiers: readonly MorphusPolymorphicModifier[],
  opts?: PolymorphicResolveOptions | ((notation: string) => number),
): number {
  if (!modifiers.length) return base

  const { rollDice, applyFloors } = normalizeResolveOptions(opts)

  const overrides = modifiers.filter(
    (m) => m.isOverride === true && hasPolymorphicPayload(m),
  )
  if (overrides.length > 0) {
    const resolved = resolveOverrideValue(
      base,
      overrides[overrides.length - 1]!,
      rollDice,
    )
    return applyFloors ? applyModifierFloors(resolved, modifiers) : resolved
  }

  let value = base
  let flatSum = 0
  let percentSum = 0
  for (const m of modifiers) {
    if (typeof m.flat === 'number') flatSum += m.flat
    if (typeof m.percent === 'number') percentSum += m.percent
  }

  value += flatSum
  if (percentSum !== 0) {
    value = Math.round(value * (1 + percentSum / 100))
  }
  for (const m of modifiers) {
    if (m.dice) value += rollDice(m.dice)
  }

  if (applyFloors) {
    value = applyModifierFloors(value, modifiers)
  }

  return value
}

function resolveOverrideValue(
  base: number,
  mod: MorphusPolymorphicModifier,
  rollDice: (notation: string) => number,
): number {
  if (mod.dice) return rollDice(mod.dice)
  if (typeof mod.flat === 'number') return mod.flat
  if (typeof mod.percent === 'number') {
    return Math.round(base * (1 + mod.percent / 100))
  }
  return base
}

/** Flat/percent/min floors only — defers dice to physical Review rolls. */
export function polymorphicFlatOnlyDeltaFromBase(
  base: number,
  modifiers: readonly MorphusPolymorphicModifier[],
  opts?: PolymorphicResolveOptions | ((notation: string) => number),
): number {
  if (!modifiers.length) return 0
  const flatOnly = modifiers.map((mod) => ({
    flat: mod.flat,
    percent: mod.percent,
    minValue: mod.minValue,
    maxValue: mod.maxValue,
    isOverride: mod.isOverride,
  }))
  return polymorphicDeltaFromBase(base, flatOnly, opts)
}

/** Passive delta for sheet display: resolved − base. */
export function polymorphicDeltaFromBase(
  base: number,
  modifiers: readonly MorphusPolymorphicModifier[],
  opts?: PolymorphicResolveOptions | ((notation: string) => number),
): number {
  if (!modifiers.length) return 0
  return resolveStatWithPolymorphicModifiers(base, modifiers, opts) - base
}

/** Apply deferred attribute minimums after all Morphus trait bonuses are summed. */
export function applyMorphusAttributeMinFloor(
  total: number,
  minFloor: number | undefined,
): number {
  if (minFloor == null) return total
  return Math.max(total, minFloor)
}
