import type { FireMode, Weapon } from '../types'

/** {@link FireMode.ammoCost} sentinel — consume all rounds currently in the magazine. */
export const FIRE_MODE_ENTIRE_CLIP = -1

export const WILD_BURST_MIN_ROUNDS = 10

export const DEFAULT_RANGED_FIRE_MODES: FireMode[] = [
  { id: 'single', name: 'Single', ammoCost: 1, strikeModifier: 0, damageMultiplier: 1 },
  {
    id: 'short_burst',
    name: 'Short Burst',
    ammoCost: 3,
    strikeModifier: -1,
    damageMultiplier: 1,
  },
  {
    id: 'long_burst',
    name: 'Long Burst',
    ammoCost: 6,
    strikeModifier: -2,
    damageMultiplier: 1,
  },
  {
    id: 'wild',
    name: 'Wild/Full Auto',
    ammoCost: FIRE_MODE_ENTIRE_CLIP,
    strikeModifier: -6,
    damageMultiplier: 1,
  },
]

export function getWeaponFireModes(weapon: Weapon): FireMode[] {
  if (!weapon.payload) return []
  return weapon.fireModes?.length ? weapon.fireModes : DEFAULT_RANGED_FIRE_MODES
}

export function getFireModeById(weapon: Weapon, modeId: string): FireMode | null {
  return getWeaponFireModes(weapon).find((m) => m.id === modeId) ?? null
}

export function defaultFireModeId(weapon: Weapon): string {
  return getWeaponFireModes(weapon)[0]?.id ?? 'single'
}

export function isWildFireMode(mode: FireMode): boolean {
  return (
    mode.ammoCost === FIRE_MODE_ENTIRE_CLIP ||
    mode.id === 'wild' ||
    /wild|full\s*auto/i.test(mode.name)
  )
}

/** Resolved round cost for this mode and magazine state. */
export function resolveFireModeAmmoCost(weapon: Weapon, mode: FireMode): number {
  if (!weapon.payload) return 0
  if (mode.ammoCost === FIRE_MODE_ENTIRE_CLIP || isWildFireMode(mode)) {
    return weapon.payload.current
  }
  return Math.max(0, Math.round(mode.ammoCost))
}

export function canAffordFireMode(weapon: Weapon, mode: FireMode): boolean {
  if (!weapon.payload) return true
  const cost = resolveFireModeAmmoCost(weapon, mode)
  return cost > 0 && weapon.payload.current >= cost
}

export type WildBurstWarning =
  | { kind: 'none' }
  | { kind: 'short_burst'; message: string; effectiveRounds: number }

/**
 * Wild / full auto with fewer than {@link WILD_BURST_MIN_ROUNDS} — not a true full burst.
 */
export function getWildBurstWarning(
  weapon: Weapon,
  mode: FireMode,
): WildBurstWarning {
  if (!weapon.payload || !isWildFireMode(mode)) return { kind: 'none' }
  const cur = weapon.payload.current
  if (cur >= WILD_BURST_MIN_ROUNDS) return { kind: 'none' }
  if (cur <= 0) return { kind: 'none' }
  return {
    kind: 'short_burst',
    effectiveRounds: cur,
    message:
      cur < WILD_BURST_MIN_ROUNDS
        ? `Full burst not possible (${cur} rds) — Wild fires as a short burst (${cur} round${cur === 1 ? '' : 's'}).`
        : '',
  }
}

export function formatFireModeStrikeDetail(
  d20: number,
  totalBonus: number,
  mode: FireMode,
): string {
  const mod = mode.strikeModifier
  const modPart =
    mod === 0 ? '' : ` ${mod >= 0 ? '+' : ''}${mod} (${mode.name})`
  const total = d20 + totalBonus + mod
  return `1d20 (${d20}) + total bonus (${totalBonus})${modPart} = ${total}`
}
