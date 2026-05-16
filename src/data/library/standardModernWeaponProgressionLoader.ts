import type {
  StandardModernProgressionBundle,
  StandardModernWeaponProgressionDoc,
} from './catalogTypes'
import progressionData from '../content/standard_modern_weapon_progression.json'

function loadProgression(): StandardModernWeaponProgressionDoc {
  const d = progressionData as unknown
  if (d && typeof d === 'object' && 'bundles' in d && d.bundles != null) {
    return d as StandardModernWeaponProgressionDoc
  }
  return { bundles: {} }
}

export const STANDARD_MODERN_WEAPON_PROGRESSION: StandardModernWeaponProgressionDoc =
  loadProgression()

export function getStandardModernProgressionBundle(
  key: string,
): StandardModernProgressionBundle | undefined {
  const b = STANDARD_MODERN_WEAPON_PROGRESSION.bundles
  return Object.prototype.hasOwnProperty.call(b, key)
    ? (b as Record<string, StandardModernProgressionBundle>)[key]
    : undefined
}

/** Default bundle key from `gameSystems[0]` when a modern W.P. omits `standardModernProgressionKey`. */
export function defaultStandardModernProgressionKey(gameSystem: string): string {
  return `${gameSystem.toLowerCase()}_standard_modern`
}
