import type { MorphusPolymorphicModifier } from '../types'
import { rollDiceNotation } from './diceNotation'

/**
 * Evaluate one Morphus polymorphic block (flat / dice / percent).
 * Dice strings support Palladium forms and leading minus (e.g. "-1D6", "2D4x10+40").
 */
export function evaluatePolymorphicDice(notation: string): number {
  let trimmed = notation.trim().replace(/\s+/g, '')
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

/**
 * Resolve a single stat from base + stacked modifiers on one axis.
 * Override blocks (last override wins) replace the pipeline; otherwise flat → percent → dice.
 */
export function resolveStatWithPolymorphicModifiers(
  base: number,
  modifiers: readonly MorphusPolymorphicModifier[],
  rollDice: (notation: string) => number = evaluatePolymorphicDice,
): number {
  if (!modifiers.length) return base

  const overrides = modifiers.filter(
    (m) => m.isOverride === true && hasPolymorphicPayload(m),
  )
  if (overrides.length > 0) {
    return resolveOverrideValue(base, overrides[overrides.length - 1]!, rollDice)
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

/** Passive delta for sheet display: resolved − base. */
export function polymorphicDeltaFromBase(
  base: number,
  modifiers: readonly MorphusPolymorphicModifier[],
  rollDice?: (notation: string) => number,
): number {
  if (!modifiers.length) return 0
  return resolveStatWithPolymorphicModifiers(base, modifiers, rollDice) - base
}
