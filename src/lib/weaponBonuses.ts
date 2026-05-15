import type { ActiveForm, Character, InventoryItem, Weapon } from '../types'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import { getPpMeleeNaturalForActiveForm } from './sheetBonuses'
import { calculateSkillPercent } from './skillEquation'
import { getSkillById, resolveWeaponProficiencySkillId } from '../data/skillLibrary'
import { computeLiveBonuses } from './characterDerived'
import { getFormState } from '../types'
import type { StrikeBreakdown } from './strikeEngine'

function wpDiceBonusFromSkillPercent(skillTotalPercent: number): number {
  if (!Number.isFinite(skillTotalPercent) || skillTotalPercent <= 0) return 0
  return Math.min(10, Math.max(0, Math.floor(skillTotalPercent / 10) - 2))
}

const HAND_TO_HAND_SKILL_ID = 'hand_to_hand_basic'

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
  strike: WeaponStatProfile
  parry: WeaponStatProfile
  /** Defined when thrown attacks apply for this weapon. */
  throw: WeaponStatProfile | null
  /** Linked W.P. display name when a skill contributes. */
  wpSkillDisplayName: string | null
}

function iqOccSkillBonus(character: Character, activeForm: ActiveForm): number {
  const attrs = getFormState(character, activeForm).attributes
  return computeLiveBonuses(attrs).iqOccSkillPercent
}

function wpPercentBonusForSkill(skillId: string, character: Character, activeForm: ActiveForm): number {
  const def = getSkillById(skillId)
  if (!def) return 0
  const iq = iqOccSkillBonus(character, activeForm)
  const pct = calculateSkillPercent(def, character.level, iq)
  return wpDiceBonusFromSkillPercent(pct)
}

function hthMeleeBonuses(character: Character, activeForm: ActiveForm): { strike: number; parry: number } {
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  if (!unlocked.has(HAND_TO_HAND_SKILL_ID)) return { strike: 0, parry: 0 }
  const b = wpPercentBonusForSkill(HAND_TO_HAND_SKILL_ID, character, activeForm)
  return { strike: b, parry: b }
}

/** Ranged weapon: energy slug / ballistic. */
export function isRangedWeapon(weapon: Weapon): boolean {
  return Boolean(weapon.payload)
}

function weaponShowsThrowBonus(weapon: Weapon): boolean {
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

/**
 * Aggregate sheet-first weapon bonuses: display P.P. natural, Hand-to-Hand (melee firearms excluded),
 * matching W.P. from `wpCategory` / `linkedWpSkillId`, weapon intrinsics +
 * `weaponSpecificModifiers`.
 */
export function computeWeaponProfileBonuses(
  character: Character,
  activeForm: ActiveForm,
  weapon: Weapon,
): WeaponProfileBonuses {
  const ranged = isRangedWeapon(weapon)
  const ppNat = getPpMeleeNaturalForActiveForm(character, activeForm)

  const hth = ranged ? { strike: 0, parry: 0 } : hthMeleeBonuses(character, activeForm)

  const wpSkillId = resolveWeaponProficiencySkillId(weapon.wpCategory, weapon.linkedWpSkillId)
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  let wpStrike = 0
  let wpParry = 0
  let wpLabel: string | null = null
  if (wpSkillId && unlocked.has(wpSkillId)) {
    const def = getSkillById(wpSkillId)
    if (def) {
      wpLabel = def.name
      const b = wpPercentBonusForSkill(wpSkillId, character, activeForm)
      wpStrike = b
      wpParry = b
    }
  }

  const strikeCore: WeaponBonusLine[] = [
    { key: 'pp', label: 'P.P.', amount: ppNat },
    ...(ranged || hth.strike === 0 ? [] : [{ key: 'hth', label: 'HtH', amount: hth.strike }]),
    ...(wpStrike === 0 ? [] : [{ key: 'wp', label: wpLabel ?? 'W.P.', amount: wpStrike }]),
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
    if (wpStrike !== 0) throwLines.push({ key: 'wp', label: wpLabel ?? 'W.P.', amount: wpStrike })
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

  const mods = weapon.weaponSpecificModifiers

  return {
    weaponId: weapon.id,
    isMeleeWeapon: !ranged,
    activeWeaponTraits: activeTraitKeys(mods),
    strike: mergeStatProfile(strikeCore, strikeWeaponLines),
    parry: mergeStatProfile(parryCore, parryWeaponLines),
    throw: throwProfile,
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
): WeaponProfileBonuses | null {
  const row = inventoryItems.find((i) => i.id === weaponId)
  if (!row || row.itemType !== 'weapon') return null
  return computeWeaponProfileBonuses(character, activeForm, row)
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
