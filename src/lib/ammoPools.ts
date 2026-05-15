import type { Weapon } from '../types'

/** Carried spare ammo keyed by weapon category (Handguns, Rifles, …). */
export type AmmoPoolKey = string

export type AmmoPoolEntry = {
  /** Display label (e.g. "Handgun cells"). */
  label: string
  /** Rounds in reserve (not in the magazine). */
  spareRounds: number
}

export type AmmoPoolsState = Record<AmmoPoolKey, AmmoPoolEntry>

export const DEFAULT_AMMO_POOL_LABELS: Record<string, string> = {
  Handguns: 'Handgun cells / magazines',
  Rifles: 'Rifle rounds',
  'Energy weapons': 'E-clip cells',
  Heavy: 'Heavy weapon ammo',
}

/** Rounds consumed from the pool to fill one magazine to max. */
export function reloadRoundsRequired(weapon: Weapon): number {
  if (!weapon.payload) return 0
  const need = weapon.payload.max - weapon.payload.current
  return Math.max(0, Math.round(need))
}

export function ammoPoolKeyForWeapon(weapon: Weapon): AmmoPoolKey {
  return weapon.ammoPoolKey ?? weapon.category
}

export function ammoTypeLabel(weapon: Weapon, pools: AmmoPoolsState): string {
  const key = ammoPoolKeyForWeapon(weapon)
  return pools[key]?.label ?? key
}

export function spareAmmoForWeapon(weapon: Weapon, pools: AmmoPoolsState): number {
  const key = ammoPoolKeyForWeapon(weapon)
  return pools[key]?.spareRounds ?? 0
}

export function canReloadWeapon(weapon: Weapon, pools: AmmoPoolsState): boolean {
  if (!weapon.payload) return false
  if (weapon.payload.current >= weapon.payload.max) return false
  const cost = reloadRoundsRequired(weapon)
  if (cost <= 0) return true
  return spareAmmoForWeapon(weapon, pools) >= cost
}

export function ensureAmmoPoolEntry(
  pools: AmmoPoolsState,
  key: AmmoPoolKey,
): AmmoPoolsState {
  if (pools[key]) return pools
  return {
    ...pools,
    [key]: {
      label: DEFAULT_AMMO_POOL_LABELS[key] ?? `${key} ammo`,
      spareRounds: 0,
    },
  }
}

export function applyReloadFromPool(
  weapon: Weapon,
  pools: AmmoPoolsState,
): { weapon: Weapon; pools: AmmoPoolsState; roundsUsed: number } | null {
  if (!weapon.payload) return null
  const key = ammoPoolKeyForWeapon(weapon)
  const withEntry = ensureAmmoPoolEntry(pools, key)
  const cost = reloadRoundsRequired(weapon)
  if (cost > 0 && (withEntry[key]?.spareRounds ?? 0) < cost) return null

  const nextPools = { ...withEntry }
  if (cost > 0) {
    nextPools[key] = {
      ...nextPools[key],
      spareRounds: nextPools[key].spareRounds - cost,
    }
  }

  return {
    weapon: {
      ...weapon,
      payload: { ...weapon.payload, current: weapon.payload.max },
    },
    pools: nextPools,
    roundsUsed: cost,
  }
}
