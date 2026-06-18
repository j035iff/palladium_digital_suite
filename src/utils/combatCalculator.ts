import type {
  AccumulatedHandToHandBonuses,
  HandToHandProgressionLevel,
  HandToHandSkill,
} from '../types'

const NUMERIC_KEYS = [
  'attacks',
  'apm',
  'strike',
  'parry',
  'dodge',
  'initiative',
  'pullPunch',
  'rollWithPunch',
  'damage',
  'entangle',
  'disarm',
] as const

type NumericHtHKey = (typeof NUMERIC_KEYS)[number]

export function createEmptyAccumulatedHandToHandBonuses(): AccumulatedHandToHandBonuses {
  return {
    attacks: 0,
    strike: 0,
    parry: 0,
    dodge: 0,
    initiative: 0,
    pullPunch: 0,
    rollWithPunch: 0,
    damage: 0,
    entangle: 0,
    disarm: 0,
    entangleUnlocked: false,
    disarmUnlocked: false,
    pairedWeapons: false,
    criticalStrikeFromBehind: false,
    knockoutFromBehind: false,
    jumpKick: false,
    leapAttack: false,
    fromBehindDamageMultiplier: 2,
  }
}

/** Sorted character levels present in a progression map (1–15). */
export function handToHandProgressionLevels(
  progression: HandToHandSkill['progression'],
): number[] {
  return Object.keys(progression)
    .map((k) => Number.parseInt(k, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 15)
    .sort((a, b) => a - b)
}

function addNumeric(
  acc: AccumulatedHandToHandBonuses,
  key: NumericHtHKey,
  value: number | undefined,
): void {
  if (value == null || !Number.isFinite(value)) return
  if (key === 'apm') {
    acc.attacks += value
    return
  }
  if (key === 'attacks') {
    acc.attacks += value
    return
  }
  acc[key] += value
}

function applyLevelRow(
  acc: AccumulatedHandToHandBonuses,
  row: HandToHandProgressionLevel,
): void {
  for (const key of NUMERIC_KEYS) {
    addNumeric(acc, key, row[key])
  }

  if (row.pairedWeapons != null) acc.pairedWeapons = row.pairedWeapons
  if (row.kickAttack != null) acc.kickAttack = row.kickAttack
  if (row.bodyThrowFlip != null) acc.bodyThrowFlip = row.bodyThrowFlip
  if (row.criticalStrikeWindow != null) {
    acc.criticalStrikeWindow = [...row.criticalStrikeWindow]
  }
  if (row.knockoutStunWindow != null) {
    acc.knockoutStunWindow = [...row.knockoutStunWindow]
  }
  if (row.deathBlowWindow != null) acc.deathBlowWindow = [...row.deathBlowWindow]
  if (row.criticalStrikeFromBehind != null) {
    acc.criticalStrikeFromBehind = row.criticalStrikeFromBehind
  }
  if (row.knockoutFromBehind != null) acc.knockoutFromBehind = row.knockoutFromBehind
  if (row.jumpKick === true) acc.jumpKick = true
  if (row.leapAttack === true) acc.leapAttack = true
  if (row.entangleUnlocked === true) acc.entangleUnlocked = true
  if (row.disarmUnlocked === true) acc.disarmUnlocked = true
  if (row.fromBehindDamageMultiplier != null) {
    acc.fromBehindDamageMultiplier = row.fromBehindDamageMultiplier
  }
}

/**
 * Sum incremental Hand-to-Hand rows for levels 1…`level` (inclusive).
 * Window arrays and capability objects use **last qualifying milestone wins**.
 */
export function accumulateHandToHandBonuses(
  hthSkill: HandToHandSkill,
  level: number,
): AccumulatedHandToHandBonuses {
  const acc = createEmptyAccumulatedHandToHandBonuses()
  const cap = Math.max(1, Math.min(15, Math.floor(level)))
  const levels = handToHandProgressionLevels(hthSkill.progression).filter((l) => l <= cap)

  for (const lv of levels) {
    const row = hthSkill.progression[String(lv)]
    if (row) applyLevelRow(acc, row)
  }

  return acc
}

/** Extra attacks per melee from accumulated Hand-to-Hand (attacks + apm aliases). */
export function handToHandAttackBonus(acc: AccumulatedHandToHandBonuses): number {
  return acc.attacks
}

/** APM cost for one attack maneuver; defaults to 1 when the catalog row omits `attackApmCost`. */
export function handToHandAttackApmCost(hthSkill: HandToHandSkill | undefined): number {
  const raw = hthSkill?.attackApmCost
  if (raw == null || !Number.isFinite(raw)) return 1
  return Math.max(1, Math.floor(raw))
}
