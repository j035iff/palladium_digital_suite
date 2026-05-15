import type { Weapon } from '../types'

/** Shared spare rounds keyed by caliber / ammo type (e.g. "9mm", "12 Gauge"). */
export type AmmoReservesState = Record<string, number>

export function ammoCategoryForWeapon(weapon: Weapon): string | null {
  if (!weapon.payload) return null
  return weapon.ammoCategory ?? weapon.ammoPoolKey ?? weapon.category
}

/** Rounds needed to fill the magazine to max. */
export function reloadRoundsRequired(weapon: Weapon): number {
  if (!weapon.payload) return 0
  const need = weapon.payload.max - weapon.payload.current
  return Math.max(0, Math.round(need))
}

export function reserveRoundsForWeapon(
  weapon: Weapon,
  reserves: AmmoReservesState,
): number {
  const cat = ammoCategoryForWeapon(weapon)
  if (!cat) return 0
  return reserves[cat] ?? 0
}

export function canReloadWeapon(
  weapon: Weapon,
  reserves: AmmoReservesState,
): boolean {
  if (!weapon.payload) return false
  if (weapon.payload.current >= weapon.payload.max) return false
  const cost = reloadRoundsRequired(weapon)
  if (cost <= 0) return true
  return reserveRoundsForWeapon(weapon, reserves) >= cost
}

/** True when the shared pool for this weapon's category is empty (reload impossible). */
export function isOutOfCategoryAmmo(
  weapon: Weapon,
  reserves: AmmoReservesState,
): boolean {
  if (!weapon.payload) return false
  if (weapon.payload.current >= weapon.payload.max) return false
  return reserveRoundsForWeapon(weapon, reserves) <= 0
}

export function ensureReserveCategory(
  reserves: AmmoReservesState,
  category: string,
): AmmoReservesState {
  if (category in reserves) return reserves
  return { ...reserves, [category]: 0 }
}

export function applyReloadFromReserves(
  weapon: Weapon,
  reserves: AmmoReservesState,
): { weapon: Weapon; reserves: AmmoReservesState; roundsUsed: number } | null {
  if (!weapon.payload) return null
  const category = ammoCategoryForWeapon(weapon)
  if (!category) return null

  const withCat = ensureReserveCategory(reserves, category)
  const cost = reloadRoundsRequired(weapon)
  const available = withCat[category] ?? 0
  if (cost > 0 && available < cost) return null

  const nextReserves = { ...withCat }
  if (cost > 0) {
    nextReserves[category] = available - cost
  }

  return {
    weapon: {
      ...weapon,
      payload: { ...weapon.payload, current: weapon.payload.max },
    },
    reserves: nextReserves,
    roundsUsed: cost,
  }
}

/** Display: magazine current / category reserve total. */
export function formatAmmoHudLine(
  weapon: Weapon,
  reserves: AmmoReservesState,
): string | null {
  if (!weapon.payload) return null
  const reserve = reserveRoundsForWeapon(weapon, reserves)
  return `Ammo: ${weapon.payload.current} / ${reserve}`
}
