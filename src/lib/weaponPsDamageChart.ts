/**
 * Joe definitive chart: Flat P.S. vs S.N. punch by ancient weapon type
 * (store docs/ancient-weapon-ps-sn-damage-chart.png). Mechanical Integrity —
 * encode the chart; do not invent unlisted rows.
 *
 * Miscellaneous / improvised catalog rows are **out of scope** (Joe):
 * no Misc P.S. chart row — they remain `uncharted` with neither Flat nor S.N.
 *
 * Catalog rulings (Joe 2026-11-14): Thrown Dart → neither; Arrows/Bolts → neither.
 * Rune/TW/solid-enchanted energy-blade exception: **unimplemented** until later.
 */
import type { Weapon } from '../types'

/** How the strike delivers damage for P.S. eligibility. */
export type WeaponDamageDelivery = 'melee' | 'thrown' | 'projectile'

/**
 * Chart family id (stable for tests / tooltips).
 * `uncharted` = no chart mapping (Misc out of scope).
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
  | 'thrown_dart'
  | 'arrow_bolt_ammo'
  | 'whips'
  | 'crossbows'
  | 'blowguns'
  | 'siege'
  | 'pure_energy_psi'
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

/** Joe: Arrows/Bolts inventory rows — neither Flat nor S.N. */
export function isArrowOrBoltAmmoWeapon(weapon: Weapon): boolean {
  const name = weapon.name.trim().toLowerCase()
  const b = blob(weapon)
  // Name-led ammo SKUs (e.g. "Arrows (Short Bow)", "Bolts").
  if (/^arrows?\b/.test(name) || /^bolts?\b/.test(name)) return true
  if (/\barrows?\b/.test(b) || /\bbolts?\b/.test(b)) {
    // Exclude actual bows / crossbows that mention ammo in notes.
    if (/\bbow\b/.test(name) || isCrossbow(weapon)) return false
    return true
  }
  return false
}

/** Joe: Thrown Dart — neither (distinct from Thrown Discs & Stars). */
export function isThrownDartWeapon(weapon: Weapon): boolean {
  const name = weapon.name.trim().toLowerCase()
  const cat = categorySlug(weapon)
  if (isBlowgun(weapon)) return false
  if (/^darts?\b/.test(name)) return true
  if (/\bthrown\b/.test(cat) && /\bdarts?\b/.test(blob(weapon))) return true
  return false
}

function isBow(weapon: Weapon): boolean {
  const b = blob(weapon)
  if (isCrossbow(weapon)) return false
  if (isArrowOrBoltAmmoWeapon(weapon)) return false
  return /\bbow\b/.test(b)
}

function isSlingOrBola(weapon: Weapon): boolean {
  return /\bsling\b|\bbola\b/.test(blob(weapon))
}

/** Chart: Thrown Discs & Stars (shuriken, chakram, boomerang, throwing stars). */
export function isThrownDiscOrStarWeapon(weapon: Weapon): boolean {
  if (isThrownDartWeapon(weapon)) return false
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

  // Joe rulings before broader missile/thrown matching.
  if (isThrownDartWeapon(weapon)) return 'thrown_dart'
  if (isArrowOrBoltAmmoWeapon(weapon)) return 'arrow_bolt_ammo'

  // Pure energy / psi blades: neither for now (Rune/TW exception deferred).
  if (isPureEnergyOrPsiBladeName(weapon)) return 'pure_energy_psi'
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

  // Miscellaneous improvised, etc. — uncharted / out of scope.
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
    case 'arrow_bolt_ammo':
      return 'projectile'
    case 'thrown_discs_stars':
    case 'thrown_dart':
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
    case 'thrown_dart':
    case 'arrow_bolt_ammo':
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
    case 'chain': {
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
      // Misc out of scope — neither Flat nor S.N.
      return {
        family,
        delivery,
        flatPs: false,
        supernaturalPunch: false,
        hthStyleFlat: delivery === 'melee',
      }
  }
}
