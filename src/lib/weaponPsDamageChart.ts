/**
 * Joe definitive chart: Flat P.S. vs S.N. punch by ancient weapon type
 * (store docs/ancient-weapon-ps-sn-damage-chart.png). Mechanical Integrity —
 * encode the chart; do not invent unlisted rows.
 *
 * Miscellaneous / improvised catalog rows are **out of scope** (Joe CS-19 follow-up):
 * no Misc P.S. chart row — they remain `uncharted` with neither Flat nor S.N.
 */
import type { Weapon } from '../types'

/** How the strike delivers damage for P.S. eligibility. */
export type WeaponDamageDelivery = 'melee' | 'thrown' | 'projectile'

/**
 * Chart family id (stable for tests / tooltips).
 * `uncharted` = no chart mapping (Misc out of scope; other gaps = open rulings).
 */
export type WeaponPsChartFamily =
  | 'swords'
  | 'axes'
  | 'knives'
  | 'blunt'
  | 'shields'
  | 'polearms'
  | 'spears'
  | 'staves'
  | 'chain'
  | 'forked'
  | 'bows'
  | 'slings_bolas'
  | 'thrown_discs_stars'
  | 'whips'
  | 'crossbows'
  | 'blowguns'
  | 'siege'
  | 'pure_energy_psi'
  /** Chart exception: Rune / TW / solid enchanted energy blades — Flat + S.N. */
  | 'solid_enchanted_energy'
  | 'firearms'
  | 'uncharted'

export type WeaponPsChartEligibility = {
  family: WeaponPsChartFamily
  delivery: WeaponDamageDelivery
  /** Exceptional P.S. flat (score − 15 at 17+), including for supernaturals when punch dice are disallowed. */
  flatPs: boolean
  /** Supernatural full-punch table string (melee only on chart rows that allow it). */
  supernaturalPunch: boolean
  /** HtH style damage flat — melee delivery on physical hand weapons (not projectile/thrown-only). */
  hthStyleFlat: boolean
}

function blob(weapon: Weapon): string {
  return `${weapon.name} ${weapon.category} ${weapon.wpCategory ?? ''} ${weapon.linkedWpSkillId ?? ''}`.toLowerCase()
}

function categorySlug(weapon: Weapon): string {
  return weapon.category.trim().toLowerCase().replace(/[\s/]+/g, '_')
}

/** Local shield check — avoid importing combatWeaponSlots (cycle via weaponBonuses). */
function weaponLooksLikeShield(weapon: Weapon): boolean {
  if (weapon.isShield === true) return true
  return /\bshields?\b/.test(blob(weapon))
}

/** Rune / Techno-Wizard / solid enchanted exception for pure-energy blades (chart). */
export function weaponHasSolidEnchantedPsException(weapon: Weapon): boolean {
  const fp = weapon.forgeProperties
  const text = [
    weapon.name,
    fp?.qualityLabel ?? '',
    fp?.notes ?? '',
    fp?.editorDraft?.material ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return (
    /\brune\b/.test(text) ||
    /\btechno[-\s]?wizard\b/.test(text) ||
    /\btw\b/.test(text) ||
    /\bsolid\s+enchanted\b/.test(text)
  )
}

function isPureEnergyOrPsiBladeName(weapon: Weapon): boolean {
  const b = blob(weapon)
  return (
    /\bpsi[-\s]?sword\b/.test(b) ||
    /\bpsi[-\s]?blade\b/.test(b) ||
    /\bpsionic\s+blade\b/.test(b) ||
    /\bpure\s+energy\b/.test(b) ||
    /\belemental\s+fire\s+blade\b/.test(b) ||
    /\benergy\s+blade\b/.test(b)
  )
}

function isSiegeEngine(weapon: Weapon): boolean {
  const b = blob(weapon)
  return /\bcatapult\b|\bballista\b|\btrebuchet\b|\bsiege\b/.test(b)
}

function isCrossbow(weapon: Weapon): boolean {
  return /\bcross\s*bow\b|\bcrossbow\b/.test(blob(weapon))
}

function isBlowgun(weapon: Weapon): boolean {
  return /\bblow\s*gun\b|\bblowgun\b/.test(blob(weapon))
}

function isBow(weapon: Weapon): boolean {
  const b = blob(weapon)
  if (isCrossbow(weapon)) return false
  // Ammo rows are not bows.
  if (/\barrows?\b|\bbolts?\b/.test(b) && !/\bbow\b/.test(weapon.name.toLowerCase())) {
    return false
  }
  return /\bbow\b/.test(b)
}

function isSlingOrBola(weapon: Weapon): boolean {
  return /\bsling\b|\bbola\b/.test(blob(weapon))
}

/** Chart: Thrown Discs & Stars (shuriken, chakram, boomerang, throwing stars). */
export function isThrownDiscOrStarWeapon(weapon: Weapon): boolean {
  const b = blob(weapon)
  return (
    /\bshuriken\b/.test(b) ||
    /\bchakram\b/.test(b) ||
    /\bboomerang\b/.test(b) ||
    /\bthrowing\s+stars?\b/.test(b) ||
    /\bthrown\s+discs?\b/.test(b)
  )
}

function isForkedPairedName(weapon: Weapon): boolean {
  const b = blob(weapon)
  return (
    /\bsai\b/.test(b) ||
    /\bjitte\b/.test(b) ||
    /\bbutterfly\s+swords?\b/.test(b) ||
    /\btiger\s+claws?\b/.test(b)
  )
}

/**
 * Map inventory weapon → chart family.
 * Misc/improvised stays `uncharted` (out of scope — no Misc P.S. row).
 */
export function resolveWeaponPsChartFamily(weapon: Weapon): WeaponPsChartFamily {
  if (weapon.payload) return 'firearms'

  if (isPureEnergyOrPsiBladeName(weapon)) {
    return weaponHasSolidEnchantedPsException(weapon)
      ? 'solid_enchanted_energy'
      : 'pure_energy_psi'
  }
  if (isSiegeEngine(weapon)) return 'siege'
  if (isBlowgun(weapon)) return 'blowguns'
  if (isCrossbow(weapon)) return 'crossbows'
  if (isSlingOrBola(weapon)) return 'slings_bolas'
  if (isBow(weapon)) return 'bows'
  if (isThrownDiscOrStarWeapon(weapon)) return 'thrown_discs_stars'

  if (weaponLooksLikeShield(weapon)) return 'shields'

  const cat = categorySlug(weapon)
  if (/whip/.test(cat)) return 'whips'
  if (isForkedPairedName(weapon)) return 'forked'
  if (/axe/.test(cat)) return 'axes'
  // "Knives" ≠ substring "knife" — match kniv/knife/dagger.
  if (/kniv|knife|dagger/.test(cat)) return 'knives'
  if (/spear|javelin/.test(cat)) return 'spears'
  if (/pole/.test(cat)) return 'polearms'
  if (/staff|stave/.test(cat)) return 'staves'
  if (/chain/.test(cat)) return 'chain'
  if (/blunt/.test(cat)) return 'blunt'
  if (/sword/.test(cat)) return 'swords'

  // Thrown Dart, Missile ammo, Miscellaneous improvised, etc. — uncharted.
  return 'uncharted'
}

/**
 * Default Dam delivery for Action quick-stat / Expand primary notation.
 * Throwable melee still defaults to **melee** (held); call again with `thrown`
 * for the thrown Dam line.
 */
export function resolveDefaultWeaponDamageDelivery(
  weapon: Weapon,
): WeaponDamageDelivery {
  const family = resolveWeaponPsChartFamily(weapon)
  switch (family) {
    case 'firearms':
    case 'bows':
    case 'crossbows':
    case 'blowguns':
    case 'slings_bolas':
    case 'siege':
      return 'projectile'
    case 'thrown_discs_stars':
      return 'thrown'
    default:
      return 'melee'
  }
}

function meleeBoth(delivery: WeaponDamageDelivery): Pick<
  WeaponPsChartEligibility,
  'flatPs' | 'supernaturalPunch'
> {
  if (delivery === 'melee') return { flatPs: true, supernaturalPunch: true }
  if (delivery === 'thrown') return { flatPs: true, supernaturalPunch: false }
  return { flatPs: false, supernaturalPunch: false }
}

/**
 * Chart eligibility for Flat P.S. / S.N. punch at a delivery mode.
 * Forge `addsPsDamageBonus: false` is applied by the caller.
 */
export function resolveWeaponPsChartEligibility(
  weapon: Weapon,
  delivery: WeaponDamageDelivery = resolveDefaultWeaponDamageDelivery(weapon),
): WeaponPsChartEligibility {
  const family = resolveWeaponPsChartFamily(weapon)

  const neither = (): WeaponPsChartEligibility => ({
    family,
    delivery,
    flatPs: false,
    supernaturalPunch: false,
    hthStyleFlat: false,
  })

  switch (family) {
    case 'firearms':
    case 'whips':
    case 'crossbows':
    case 'blowguns':
    case 'siege':
    case 'pure_energy_psi':
      return {
        ...neither(),
        // Whips are melee hand weapons — HtH style flat still applies (chart only bars P.S.).
        hthStyleFlat: family === 'whips' && delivery === 'melee',
      }

    case 'bows':
    case 'slings_bolas':
    case 'thrown_discs_stars':
      return {
        family,
        delivery,
        flatPs: true,
        supernaturalPunch: false,
        hthStyleFlat: false,
      }

    case 'swords':
    case 'blunt':
    case 'polearms':
    case 'staves':
    case 'chain':
    case 'solid_enchanted_energy': {
      const bits =
        delivery === 'melee'
          ? { flatPs: true, supernaturalPunch: true }
          : { flatPs: false, supernaturalPunch: false }
      return {
        family,
        delivery,
        ...bits,
        hthStyleFlat: delivery === 'melee',
      }
    }

    case 'axes':
    case 'knives':
    case 'spears':
    case 'forked':
    case 'shields': {
      const bits = meleeBoth(delivery)
      return {
        family,
        delivery,
        ...bits,
        hthStyleFlat: delivery === 'melee',
      }
    }

    case 'uncharted':
      // Misc out of scope; other unmapped rows await Joe — neither Flat nor S.N.
      return {
        family,
        delivery,
        flatPs: false,
        supernaturalPunch: false,
        hthStyleFlat: delivery === 'melee',
      }
  }
}
