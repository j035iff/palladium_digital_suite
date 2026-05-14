import type { Character, XpTableKind } from '../types'

/**
 * Cumulative XP floors (master_flow.md — progression): {@link STANDARD_XP_FLOORS}[i] is the
 * minimum lifetime XP to **be** character level i + 1.
 */
export const LEVEL_CAP = 15 as const

export const STANDARD_XP_FLOORS: readonly number[] = [
  0,
  2_000,
  4_000,
  6_500,
  9_500,
  13_000,
  17_000,
  21_500,
  26_500,
  32_000,
  38_000,
  44_500,
  51_500,
  59_000,
  67_000,
]

/** Psychic-oriented O.C.C.s: steeper curve (~12% higher floors past level 1). */
export const PSYCHIC_XP_FLOORS: readonly number[] = STANDARD_XP_FLOORS.map((x, i) =>
  i === 0 ? 0 : Math.round(x * 1.12),
)

export function getXpFloors(kind: XpTableKind): readonly number[] {
  return kind === 'psychic' ? PSYCHIC_XP_FLOORS : STANDARD_XP_FLOORS
}

/** Highest level (1..LEVEL_CAP) the character has earned from total XP alone. */
export function maxEarnedLevelFromXp(totalXp: number, kind: XpTableKind): number {
  const floors = getXpFloors(kind)
  let best = 1
  for (let L = 2; L <= LEVEL_CAP; L++) {
    if (totalXp >= floors[L - 1]) best = L
  }
  return best
}

/** Minimum total XP required to reach `nextLevel` (nextLevel in 2..LEVEL_CAP). */
export function xpFloorForLevel(nextLevel: number, kind: XpTableKind): number {
  const floors = getXpFloors(kind)
  if (nextLevel <= 1) return 0
  return floors[Math.min(LEVEL_CAP, nextLevel) - 1]
}

/** XP total needed for the level after `currentLevel`, or null at cap. */
export function nextLevelThresholdXp(
  currentLevel: number,
  kind: XpTableKind,
): number | null {
  if (currentLevel >= LEVEL_CAP) return null
  return xpFloorForLevel(currentLevel + 1, kind)
}

/**
 * When XP moves from `prevXp` to `newXp`, which new levels (2..LEVEL_CAP) were crossed
 * for the first time while `recordedLevel` is still the sheet level (ritual not applied yet)?
 */
export function newlyCrossedLevels(
  recordedLevel: number,
  prevXp: number,
  newXp: number,
  kind: XpTableKind,
): number[] {
  const out: number[] = []
  for (let target = recordedLevel + 1; target <= LEVEL_CAP; target++) {
    const need = xpFloorForLevel(target, kind)
    if (newXp < need) break
    if (prevXp < need) out.push(target)
  }
  return out
}

export function supernaturalAlertsForLevel(
  character: Character,
  targetLevel: number,
): string[] {
  const alerts: string[] = []
  if (targetLevel >= 4 && targetLevel % 2 === 0) {
    alerts.push(
      'Pending selection: consult your O.C.C. chart for new spells or psionics granted at this level.',
    )
  }
  if (character.occCategory === 'psychic' && [4, 8, 12].includes(targetLevel)) {
    alerts.push(
      'Psychic O.C.C.: verify save vs. psionics tier and any new power slots (psychic_gate.md).',
    )
  }
  const cap = character.startingSpellLevelCap ?? 4
  if (targetLevel > cap) {
    alerts.push(
      `Spell library: character exceeded starting spell cap (${cap}) — higher-circle spells may require dedicated picks (Pillar 8).`,
    )
  }
  return alerts
}

/** Min XP to be at `level` (1..LEVEL_CAP). */
export function xpFloorForCharacterLevel(level: number, kind: XpTableKind): number {
  const L = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)))
  return xpFloorForLevel(L, kind)
}

export type XpProgressSegment = {
  /** Progress 0..100 toward next level, or 100 at cap. */
  pct: number
  floorXp: number
  nextThresholdXp: number | null
}

export function xpProgressTowardNext(
  level: number,
  totalXp: number,
  kind: XpTableKind,
): XpProgressSegment {
  if (level >= LEVEL_CAP) {
    return { pct: 100, floorXp: xpFloorForCharacterLevel(LEVEL_CAP, kind), nextThresholdXp: null }
  }
  const floorXp = xpFloorForCharacterLevel(level, kind)
  const nextThresholdXp = nextLevelThresholdXp(level, kind)
  if (nextThresholdXp == null) {
    return { pct: 100, floorXp, nextThresholdXp: null }
  }
  const span = Math.max(1, nextThresholdXp - floorXp)
  const raw = ((totalXp - floorXp) / span) * 100
  const pct = Math.min(100, Math.max(0, Math.round(raw)))
  return { pct, floorXp, nextThresholdXp }
}

/** Levels earned by XP but not yet applied on the sheet (ritual queue). */
export function outstandingLevelUpTargets(c: Character): number[] {
  const kind = c.xpTableKind ?? 'standard'
  const earned = maxEarnedLevelFromXp(c.xp, kind)
  const out: number[] = []
  for (let L = c.level + 1; L <= earned; L++) out.push(L)
  return out
}
