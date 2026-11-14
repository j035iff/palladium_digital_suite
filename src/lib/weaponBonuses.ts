import type { ActiveForm, Character, InventoryItem, Weapon } from '../types'
import { getFormState } from '../types'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import { resolveLivePpMeleeNatural } from './liveStatEngine'
import { resolveWeaponProficiencySkillId } from '../data/skillLibrary'
import type { StrikeBreakdown } from './strikeEngine'
import type { AccumulatedHandToHandBonuses } from '../types'
import { isWildFireMode, type FireMode } from './fireModes'
import { resolveOwnedWeaponProficiencyBonuses } from './weaponProficiencyBonuses'
import {
  getHandToHandDamageProfile,
  resolveStrengthCategory,
} from '../utils/strengthCalculator'
import {
  resolveDefaultWeaponDamageDelivery,
  resolveWeaponPsChartEligibility,
  type WeaponDamageDelivery,
  type WeaponPsChartFamily,
} from './weaponPsDamageChart'

export type { WeaponDamageDelivery, WeaponPsChartFamily }
export {
  resolveDefaultWeaponDamageDelivery,
  resolveWeaponPsChartEligibility,
  resolveWeaponPsChartFamily,
  isThrownDiscOrStarWeapon,
  weaponHasSolidEnchantedPsException,
} from './weaponPsDamageChart'

/** Human-readable modifier keys unique to {@link Weapon.weaponSpecificModifiers}. */
export function prettyWeaponTraitKey(raw: string): string {
  if (!raw.trim()) return raw
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export type WeaponBonusLine = {
  key: string
  label: string
  amount: number
}

/** One combat stat assembled from sheet-aligned sources plus the weapon row. */
export type WeaponStatProfile = {
  lines: WeaponBonusLine[]
  total: number
}

export type WeaponProfileBonuses = {
  weaponId: string
  /** Melee profiles include Hand-to-Hand; ranged omit HtH on strike (firearms). */
  isMeleeWeapon: boolean
  /** Non-zero weapon-specific modifier keys (for HUD highlight). */
  activeWeaponTraits: readonly string[]
  /**
   * Melee strike, or modern **aimed** / combined strike ladder.
   * Modern burst uses {@link burstStrike} when present.
   */
  strike: WeaponStatProfile
  parry: WeaponStatProfile
  /** Defined when thrown attacks apply for this weapon. */
  throw: WeaponStatProfile | null
  /**
   * Modern **burst** strike profile when the W.P. burst ladder differs (or mirrors
   * aimed when only a combined `strike` column exists). Null for melee.
   */
  burstStrike: WeaponStatProfile | null
  /** Linked W.P. display name when a skill contributes. */
  wpSkillDisplayName: string | null
}

function hthMeleeBonuses(
  accumulated: AccumulatedHandToHandBonuses | undefined,
): { strike: number; parry: number } {
  if (!accumulated) return { strike: 0, parry: 0 }
  return { strike: accumulated.strike, parry: accumulated.parry }
}

/** Ranged weapon: energy slug / ballistic. */
export function isRangedWeapon(weapon: Weapon): boolean {
  return Boolean(weapon.payload)
}

/**
 * Joe ruling (CS-17): forge `addsPsDamageBonus` defaults **ON** when absent;
 * **OFF** only when explicitly `false`.
 */
export function weaponForgeAllowsPsDamageBonus(weapon: Weapon): boolean {
  return weapon.forgeProperties?.editorDraft?.addsPsDamageBonus !== false
}

/**
 * @deprecated Prefer {@link resolveWeaponPsChartEligibility} (Joe chart SoT).
 * Kept for callers that only need a coarse “thrown/missile-ish” category check.
 */
export function isThrownOrMissileWeaponCategory(weapon: Weapon): boolean {
  const delivery = resolveDefaultWeaponDamageDelivery(weapon)
  return delivery === 'thrown' || delivery === 'projectile'
}

/**
 * Whether HtH style damage flats apply at the default Dam delivery.
 */
export function isHeldMeleeWeaponForDamage(weapon: Weapon): boolean {
  const elig = resolveWeaponPsChartEligibility(
    weapon,
    resolveDefaultWeaponDamageDelivery(weapon),
  )
  return elig.hthStyleFlat
}

/**
 * Whether default Dam may include Flat P.S. and/or S.N. punch (forge gate + chart).
 */
export function weaponReceivesMeleePsDamageBonus(weapon: Weapon): boolean {
  if (!weaponForgeAllowsPsDamageBonus(weapon)) return false
  const elig = resolveWeaponPsChartEligibility(
    weapon,
    resolveDefaultWeaponDamageDelivery(weapon),
  )
  return elig.flatPs || elig.supernaturalPunch
}

export type WeaponDamageLine = {
  key: string
  label: string
  /** Notation segment joined after the weapon base (e.g. `+5`, `3D6+9`). */
  segment: string
}

/** Assembled Dam notation for Action Dam / Expand (Unified Path with strike profile). */
export type WeaponDamageProfile = {
  weaponId: string
  baseNotation: string
  lines: readonly WeaponDamageLine[]
  /** Full table-play damage string (weapon + P.S. / HtH / W.P. flats). */
  notation: string
  /** True when Flat P.S. and/or S.N. punch was eligible (forge + chart). */
  appliesPsDamageBonus: boolean
  appliesFlatPs: boolean
  appliesSupernaturalPunch: boolean
  delivery: WeaponDamageDelivery
  chartFamily: WeaponPsChartFamily
}

function appendDamageSegment(base: string, segment: string): string {
  const b = base.trim()
  const s = segment.trim()
  if (!s) return b || '—'
  if (!b || b === '—') return s
  if (s.startsWith('+')) return `${b}${s}`
  return `${b}+${s}`
}

/**
 * Aggregate weapon Dam from Joe’s ancient-weapon Flat/S.N. chart + HtH style +
 * W.P. `damageBonusFlat`. Pass `delivery: 'thrown'` for thrown Dam on axes/knives/
 * spears/shields (Flat only; no S.N. punch).
 */
export function computeWeaponDamageProfile(
  character: Character,
  activeForm: ActiveForm,
  weapon: Weapon,
  handToHandAccumulated?: AccumulatedHandToHandBonuses,
  delivery: WeaponDamageDelivery = resolveDefaultWeaponDamageDelivery(weapon),
): WeaponDamageProfile {
  const baseNotation = weapon.damage.trim() || '—'
  const lines: WeaponDamageLine[] = []
  const chart = resolveWeaponPsChartEligibility(weapon, delivery)
  const forgeAllows = weaponForgeAllowsPsDamageBonus(weapon)
  const flatPs = forgeAllows && chart.flatPs
  const snPunch = forgeAllows && chart.supernaturalPunch

  if (flatPs || snPunch) {
    const ps = getFormState(character, activeForm).attributes.ps
    const category = resolveStrengthCategory(ps.score, ps.tier)
    const profile = getHandToHandDamageProfile(ps.score, category)
    if (snPunch && profile.kind === 'supernatural') {
      const seg = profile.fullStrengthPunch.trim()
      if (seg) {
        lines.push({
          key: 'ps_supernatural',
          label: 'P.S. (supernatural full)',
          segment: seg,
        })
      }
    } else if (flatPs && profile.attributeDamageBonus > 0) {
      // Flat only (bows / thrown / SN-without-punch): exceptional P.S. flat alone.
      lines.push({
        key: 'ps',
        label: 'P.S.',
        segment: `+${profile.attributeDamageBonus}`,
      })
    }
  }

  if (chart.hthStyleFlat) {
    const hthFlat = handToHandAccumulated?.damage ?? 0
    if (hthFlat !== 0) {
      lines.push({
        key: 'hth',
        label: 'HtH',
        segment: hthFlat > 0 ? `+${hthFlat}` : `${hthFlat}`,
      })
    }
  }

  const wpEligible = weapon.weaponProficiencyEligible !== false
  const wpSkillId = wpEligible
    ? resolveWeaponProficiencySkillId(weapon.wpCategory, weapon.linkedWpSkillId)
    : undefined
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  const owned = resolveOwnedWeaponProficiencyBonuses(
    wpSkillId,
    unlocked,
    character.level ?? 1,
  )
  const wpFlat = owned?.bonuses.damageBonusFlat ?? 0
  if (wpFlat !== 0) {
    lines.push({
      key: 'wp',
      label: owned?.entry.name ?? 'W.P.',
      segment: wpFlat > 0 ? `+${wpFlat}` : `${wpFlat}`,
    })
  }

  let notation = baseNotation
  for (const line of lines) {
    notation = appendDamageSegment(notation, line.segment)
  }

  return {
    weaponId: weapon.id,
    baseNotation,
    lines,
    notation,
    appliesPsDamageBonus: flatPs || snPunch,
    appliesFlatPs: flatPs,
    appliesSupernaturalPunch: snPunch,
    delivery,
    chartFamily: chart.family,
  }
}

/** Apply fire-mode damage multiplier on top of {@link computeWeaponDamageProfile}. */
export function formatWeaponDamageLabel(
  profile: WeaponDamageProfile,
  mode?: FireMode | null,
): string {
  const base = profile.notation.trim() || '—'
  if (!mode?.damageMultiplier || mode.damageMultiplier === 1) return base
  return `${mode.damageMultiplier}× ${base}`
}

/** Tooltip equation for damage lines (Intuitive Depth). */
export function formatWeaponDamageEquation(profile: WeaponDamageProfile): string {
  if (profile.lines.length === 0) return profile.notation
  const parts = [
    `[Weapon: ${profile.baseNotation}]`,
    ...profile.lines.map((l) => `[${l.label}: ${l.segment}]`),
  ]
  return `${parts.join(' + ')} = ${profile.notation}`
}

function weaponShowsThrowBonus(weapon: Weapon): boolean {
  if (weapon.throwable === true) return true
  if (weapon.throwable === false) return false
  if (weapon.weaponSpecificModifiers?.throw != null && weapon.weaponSpecificModifiers.throw !== 0)
    return true
  const c = weapon.category.trim().toLowerCase()
  return c.includes('thrown') || c.includes('throw')
}

function weaponStrikeTraitLines(weapon: Weapon): WeaponBonusLine[] {
  const mods = weapon.weaponSpecificModifiers ?? {}
  const lines: WeaponBonusLine[] = []
  if (weapon.strikeBonus) lines.push({ key: 'weapon_base', label: 'Weapon (base)', amount: weapon.strikeBonus })
  const extraStrike = mods.strike ?? 0
  if (extraStrike)
    lines.push({ key: 'weapon_mod_strike', label: 'Weapon (strike mod)', amount: extraStrike })

  const reserved = new Set(['strike', 'parry', 'throw'])
  for (const [k, v] of Object.entries(mods)) {
    if (!v || reserved.has(k)) continue
    lines.push({
      key: `weapon_trait_${k}`,
      label: `Weapon (${prettyWeaponTraitKey(k)})`,
      amount: v,
    })
  }
  return lines
}

function weaponParryTraitLines(weapon: Weapon): WeaponBonusLine[] {
  const mods = weapon.weaponSpecificModifiers ?? {}
  const p = mods.parry ?? 0
  if (!p) return []
  return [{ key: 'weapon_mod_parry', label: 'Weapon (parry mod)', amount: p }]
}

function weaponThrowTraitLines(weapon: Weapon): WeaponBonusLine[] {
  const mods = weapon.weaponSpecificModifiers ?? {}
  const t = mods.throw ?? 0
  const lines: WeaponBonusLine[] = []
  if (t) lines.push({ key: 'weapon_mod_throw', label: 'Weapon (throw mod)', amount: t })
  return lines
}

function activeTraitKeys(mods: Record<string, number> | undefined): string[] {
  if (!mods) return []
  return Object.entries(mods)
    .filter(([, v]) => v !== 0)
    .map(([k]) => k)
}

function mergeStatProfile(coreLines: WeaponBonusLine[], weaponLines: WeaponBonusLine[]): WeaponStatProfile {
  const lines = [...coreLines, ...weaponLines.filter((w) => w.amount !== 0)]
  const total = lines.reduce((s, l) => s + l.amount, 0)
  return { lines, total }
}

function stripWpLines(profile: WeaponStatProfile): WeaponStatProfile {
  const lines = profile.lines.filter((l) => l.key !== 'wp')
  return {
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
  }
}

function isBurstFireMode(mode: FireMode): boolean {
  return /burst/i.test(mode.id) || /burst/i.test(mode.name)
}

/**
 * Pick the strike profile for a fire mode: aimed/default {@link WeaponProfileBonuses.strike},
 * burst {@link WeaponProfileBonuses.burstStrike}, wild → same core lines without W.P.
 */
export function selectWeaponStrikeProfileForFireMode(
  profile: WeaponProfileBonuses,
  mode: FireMode | null | undefined,
): WeaponStatProfile {
  if (mode && isWildFireMode(mode)) {
    return stripWpLines(profile.strike)
  }
  if (mode && isBurstFireMode(mode) && profile.burstStrike) {
    return profile.burstStrike
  }
  return profile.strike
}

/**
 * Aggregate sheet-first weapon bonuses: display P.P. natural, Hand-to-Hand (melee firearms excluded),
 * matching W.P. from catalog `levelTiers` / modern progression bundle, weapon intrinsics +
 * `weaponSpecificModifiers`.
 */
export function computeWeaponProfileBonuses(
  character: Character,
  activeForm: ActiveForm,
  weapon: Weapon,
  handToHandAccumulated?: AccumulatedHandToHandBonuses,
): WeaponProfileBonuses {
  const ranged = isRangedWeapon(weapon)
  const ppNat = resolveLivePpMeleeNatural(character, activeForm)

  const hth = ranged ? { strike: 0, parry: 0 } : hthMeleeBonuses(handToHandAccumulated)

  const wpEligible = weapon.weaponProficiencyEligible !== false
  const wpSkillId = wpEligible
    ? resolveWeaponProficiencySkillId(weapon.wpCategory, weapon.linkedWpSkillId)
    : undefined
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  const owned = resolveOwnedWeaponProficiencyBonuses(
    wpSkillId,
    unlocked,
    character.level ?? 1,
  )

  let wpStrike = 0
  let wpParry = 0
  let wpThrow = 0
  let wpAimed = 0
  let wpBurst = 0
  let wpLabel: string | null = null

  if (owned) {
    wpLabel = owned.entry.name
    const b = owned.bonuses
    wpStrike = b.strike
    wpParry = b.parry
    wpThrow = b.strikeWhenThrown
    wpAimed = b.aimedStrikeBonus
    wpBurst = b.burstStrikeBonus
  }

  /** Modern aimed column, else combined strike (e.g. shotgun). */
  const rangedWpStrike = wpAimed !== 0 ? wpAimed : wpStrike
  /** Burst column when present; else same as aimed/combined for modes that still roll burst. */
  const rangedWpBurst = wpBurst !== 0 ? wpBurst : rangedWpStrike

  const strikeWpAmount = ranged ? rangedWpStrike : wpStrike
  const burstWpAmount = ranged ? rangedWpBurst : 0

  const strikeCore: WeaponBonusLine[] = [
    { key: 'pp', label: 'P.P.', amount: ppNat },
    ...(ranged || hth.strike === 0 ? [] : [{ key: 'hth', label: 'HtH', amount: hth.strike }]),
    ...(strikeWpAmount === 0
      ? []
      : [{ key: 'wp', label: wpLabel ?? 'W.P.', amount: strikeWpAmount }]),
  ]

  const parryCore: WeaponBonusLine[] = [
    { key: 'pp', label: 'P.P.', amount: ppNat },
    ...(ranged || hth.parry === 0 ? [] : [{ key: 'hth', label: 'HtH', amount: hth.parry }]),
    ...(wpParry === 0 ? [] : [{ key: 'wp', label: wpLabel ?? 'W.P.', amount: wpParry }]),
  ]

  const strikeWeaponLines = weaponStrikeTraitLines(weapon)
  const parryWeaponLines = weaponParryTraitLines(weapon)

  const throwLines: WeaponBonusLine[] = []
  if (weaponShowsThrowBonus(weapon)) {
    throwLines.push({ key: 'pp', label: 'P.P.', amount: ppNat })
    if (!ranged && hth.strike !== 0) throwLines.push({ key: 'hth', label: 'HtH', amount: hth.strike })
    if (wpThrow !== 0) throwLines.push({ key: 'wp', label: wpLabel ?? 'W.P.', amount: wpThrow })
    throwLines.push(...weaponThrowTraitLines(weapon))
    if (weapon.strikeBonus)
      throwLines.push({ key: 'weapon_base_throw', label: 'Weapon (throw use)', amount: weapon.strikeBonus })
  }

  const throwProfile: WeaponStatProfile | null =
    throwLines.length > 0
      ? {
          lines: throwLines.filter((l) => l.amount !== 0),
          total: throwLines.reduce((s, l) => s + l.amount, 0),
        }
      : null

  const strike = mergeStatProfile(strikeCore, strikeWeaponLines)

  let burstStrike: WeaponStatProfile | null = null
  if (ranged) {
    const burstCore: WeaponBonusLine[] = [
      { key: 'pp', label: 'P.P.', amount: ppNat },
      ...(burstWpAmount === 0
        ? []
        : [{ key: 'wp', label: wpLabel ?? 'W.P.', amount: burstWpAmount }]),
    ]
    burstStrike = mergeStatProfile(burstCore, strikeWeaponLines)
  }

  const mods = weapon.weaponSpecificModifiers

  return {
    weaponId: weapon.id,
    isMeleeWeapon: !ranged,
    activeWeaponTraits: activeTraitKeys(mods),
    strike,
    parry: mergeStatProfile(parryCore, parryWeaponLines),
    throw: throwProfile,
    burstStrike,
    wpSkillDisplayName: wpLabel,
  }
}

/** @see formatSheetBonusEquation — bracketed components for tooltips. */
export function formatWeaponStatEquation(
  profile: WeaponStatProfile,
  formatBonusFn: (n: number) => string,
): string {
  const parts = profile.lines.map((l) => `[${l.label}: ${formatBonusFn(l.amount)}]`)
  return `${parts.join(' + ')} = ${formatBonusFn(profile.total)}`
}

/**
 * Resolve a carried weapon and return {@link computeWeaponProfileBonuses} or null.
 */
export function getWeaponBonuses(
  character: Character,
  activeForm: ActiveForm,
  inventoryItems: readonly InventoryItem[],
  weaponId: string,
  handToHandAccumulated?: AccumulatedHandToHandBonuses,
): WeaponProfileBonuses | null {
  const row = inventoryItems.find((i) => i.id === weaponId)
  if (!row || row.itemType !== 'weapon') return null
  return computeWeaponProfileBonuses(character, activeForm, row, handToHandAccumulated)
}

/** Legacy breakdown for strike-only consumers (strike engine banner text). */
export function weaponProfileToStrikeBreakdown(profile: WeaponProfileBonuses): StrikeBreakdown {
  let ppBonus = 0
  let hthBonus = 0
  let wpBonus = 0
  let weaponBonus = 0
  for (const l of profile.strike.lines) {
    if (l.key === 'pp') ppBonus += l.amount
    else if (l.key === 'hth') hthBonus += l.amount
    else if (l.key === 'wp') wpBonus += l.amount
    else weaponBonus += l.amount
  }
  return {
    ppBonus,
    hthBonus,
    wpBonus,
    weaponBonus,
    total: profile.strike.total,
    skillSourceLabel: profile.wpSkillDisplayName,
  }
}
