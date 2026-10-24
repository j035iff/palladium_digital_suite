import type {
  ActiveForm,
  Character,
  FireMode,
  InventoryItem,
  Weapon,
  WeaponProficiencyEra,
} from '../types'
import { getWeaponProficiencyCatalogEntryById, WEAPON_PROFICIENCY_CATALOG } from '../data/library/weaponProficienciesCatalogLoader'
import { resolveWeaponProficiencySkillId } from '../data/skillLibrary'
import { weaponProficiencyEraForSkillId } from './creationSkillCatalog'
import { isWhitelistedForHostGenre } from './genreGating'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import { isRangedWeapon, type WeaponBonusLine, type WeaponProfileBonuses } from './weaponBonuses'
import {
  isPairedWeaponsSkillId,
  WP_PAIRED_WEAPONS_SKILL_ID,
} from './pairedWeaponSupport'

export type CombatWeaponGlyphId =
  | 'fist'
  | 'sword'
  | 'axe'
  | 'knife'
  | 'whip'
  | 'bow'
  | 'blunt'
  | 'chain'
  | 'polearm'
  | 'pistol'
  | 'rifle'
  | 'shotgun'
  | 'smg'
  | 'heavy'
  | 'weapon'

/** Modern two-gun strike penalties (Joe 2026-10-22) — regular hand / off-hand. */
export const MODERN_TWO_GUN_PRIMARY_STRIKE_PENALTY = -2
export const MODERN_TWO_GUN_OFFHAND_STRIKE_PENALTY = -6

const MODERN_TEXT =
  /pistol|revolver|rifle|shotgun|smg|sub.?machine|energy|gun|firearm|laser|automatic/

function weaponSearchBlob(weapon: Weapon): string {
  return `${weapon.linkedWpSkillId ?? ''} ${weapon.wpCategory ?? ''} ${weapon.category} ${weapon.name}`.toLowerCase()
}

function resolveWpId(weapon: Weapon): string | undefined {
  return resolveWeaponProficiencySkillId(weapon.wpCategory, weapon.linkedWpSkillId)
}

/** Catalog / forge `twoHanded` — indication only on Action tab (do not lock extra slots). */
export function isWeaponTwoHanded(weapon: Weapon): boolean {
  return weapon.twoHanded === true
}

/**
 * Pairable = non-two-handed (Joe). Shields count as pairable when not two-handed.
 * Ancient off-hand penalty math is deferred — this flag is display / paired-skill gating only.
 */
export function isWeaponPairable(weapon: Weapon): boolean {
  return !isWeaponTwoHanded(weapon)
}

/**
 * Action-tab **pairable** badge (Joe 2026-10-23): only when the character has
 * Paired Weapons **and** the weapon is non-two-handed. No skill → never show.
 */
export function shouldShowPairableBadge(
  character: Character,
  activeForm: ActiveForm,
  weapon: Weapon,
): boolean {
  return (
    isWeaponPairable(weapon) &&
    characterHasPairedWeaponsSkill(character, activeForm)
  )
}

/**
 * Shield detection for secondary+ dropdowns.
 * Prefer explicit `isShield`; fall back to name / category / W.P. text
 * (no dedicated shield SKUs in `weapons/ancient.json` yet — catalog gap).
 */
export function isShieldWeapon(weapon: Weapon): boolean {
  if (weapon.isShield === true) return true
  return /\bshields?\b/.test(weaponSearchBlob(weapon))
}

/** Linked W.P. skill id when the weapon is proficiency-eligible. */
export function resolveWeaponCombatWpSkillId(weapon: Weapon): string | null {
  if (weapon.weaponProficiencyEligible === false) return null
  return resolveWpId(weapon) ?? null
}

export function characterHasWpForWeapon(
  character: Character,
  activeForm: ActiveForm,
  weapon: Weapon,
): boolean {
  const wpId = resolveWeaponCombatWpSkillId(weapon)
  if (!wpId) return true
  return collectUnlockedSkillIds(character, activeForm).has(wpId)
}

export function characterHasPairedWeaponsSkill(
  character: Character,
  activeForm: ActiveForm,
): boolean {
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  if (unlocked.has(WP_PAIRED_WEAPONS_SKILL_ID)) return true
  for (const id of unlocked) {
    if (isPairedWeaponsSkillId(id)) return true
  }
  return false
}

/**
 * Dropdown options for a combat weapon slot.
 * Primary: carried weapons of that era **excluding shields**.
 * Secondary+: same era weapons **plus shields** (shields only in secondary+ lists).
 */
export function listSlotWeaponOptions(
  items: readonly InventoryItem[],
  era: WeaponProficiencyEra,
  slotIndex: number,
): Weapon[] {
  const eraWeapons = listCarriedWeaponsOfEra(items, era).filter((w) => !isShieldWeapon(w))
  if (slotIndex <= 0) return eraWeapons
  const byId = new Map(eraWeapons.map((w) => [w.id, w]))
  for (const it of items) {
    if (it.itemType !== 'weapon') continue
    if (!isShieldWeapon(it)) continue
    byId.set(it.id, it)
  }
  return [...byId.values()]
}

/** Keep a picked id only when it is still in the dropdown list; else None. */
export function resolvePickedWeaponId(
  candidates: readonly Weapon[],
  pickedId: string | null | undefined,
): string | null {
  if (!pickedId) return null
  return candidates.some((w) => w.id === pickedId) ? pickedId : null
}

/**
 * When ≥2 firearms are selected across modern slots: primary firearm −2 strike,
 * each other firearm −6. Non-firearm slots (empty / shield) get 0.
 */
export function modernTwoGunStrikePenalty(
  selectedWeapons: readonly (Weapon | null | undefined)[],
  slotIndex: number,
): number {
  const firearmIndexes: number[] = []
  selectedWeapons.forEach((w, i) => {
    if (w && isRangedWeapon(w) && !isShieldWeapon(w)) firearmIndexes.push(i)
  })
  if (firearmIndexes.length < 2) return 0
  const weapon = selectedWeapons[slotIndex]
  if (!weapon || !isRangedWeapon(weapon) || isShieldWeapon(weapon)) return 0
  const primaryFirearmSlot = firearmIndexes[0]!
  return slotIndex === primaryFirearmSlot
    ? MODERN_TWO_GUN_PRIMARY_STRIKE_PENALTY
    : MODERN_TWO_GUN_OFFHAND_STRIKE_PENALTY
}

export function twoGunPenaltyBonusLine(amount: number): WeaponBonusLine | null {
  if (!amount) return null
  return { key: 'two_gun', label: 'Two guns', amount }
}

/** Merge a modern two-gun strike penalty into an existing weapon profile. */
export function applyStrikePenaltyToWeaponProfile(
  profile: WeaponProfileBonuses,
  penalty: number,
): WeaponProfileBonuses {
  const line = twoGunPenaltyBonusLine(penalty)
  if (!line) return profile
  return {
    ...profile,
    strike: {
      lines: [...profile.strike.lines, line],
      total: profile.strike.total + line.amount,
    },
  }
}

export type PairedWeaponsSlotStatus = {
  /** Both selected weapons pairable, character has Paired Weapons, W.P. on each. */
  abilitiesActive: boolean
  /** Short player-facing note when a pair is attempted but abilities do not apply. */
  blockedReason: string | null
}

/**
 * Paired Weapons skill gating for the first two occupied pairable slots.
 * Does not encode ancient off-hand penalties (deferred).
 */
export function resolvePairedWeaponsSlotStatus(
  selectedWeapons: readonly (Weapon | null | undefined)[],
  character: Character,
  activeForm: ActiveForm,
): PairedWeaponsSlotStatus {
  const occupied = selectedWeapons.filter((w): w is Weapon => Boolean(w))
  if (occupied.length < 2) {
    return { abilitiesActive: false, blockedReason: null }
  }
  const a = occupied[0]!
  const b = occupied[1]!
  if (!isWeaponPairable(a) || !isWeaponPairable(b)) {
    return {
      abilitiesActive: false,
      blockedReason: 'Paired Weapons needs two pairable (non-two-handed) weapons.',
    }
  }
  const hasSkill = characterHasPairedWeaponsSkill(character, activeForm)
  if (!hasSkill) {
    return {
      abilitiesActive: false,
      blockedReason: 'No W.P. Paired Weapons — dual wield is fine; paired abilities do not apply.',
    }
  }
  const missingWp = [a, b].filter((w) => !characterHasWpForWeapon(character, activeForm, w))
  if (missingWp.length > 0) {
    return {
      abilitiesActive: false,
      blockedReason:
        'Paired Weapons needs W.P. for each weapon in the pair (missing proficiency on at least one).',
    }
  }
  return { abilitiesActive: true, blockedReason: null }
}

/** True when the host genre catalog includes at least one modern W.P. row. */
export function hostGenreOffersModernWeapons(hostGenreId: string): boolean {
  return WEAPON_PROFICIENCY_CATALOG.some(
    (wp) =>
      wp.weaponProficiencyCategory === 'modern' &&
      isWhitelistedForHostGenre(wp, hostGenreId),
  )
}

function inferEraFromWeaponText(weapon: Weapon): WeaponProficiencyEra {
  const blob = weaponSearchBlob(weapon)
  if (MODERN_TEXT.test(blob)) return 'modern'
  if (weapon.payload) return 'modern'
  return 'ancient'
}

/** Ancient vs modern for Combat Home bubbles — W.P. catalog first, then name/category fallback. */
export function resolveWeaponCombatEra(weapon: Weapon): WeaponProficiencyEra {
  const wpId = resolveWpId(weapon)
  if (wpId) {
    const entry = getWeaponProficiencyCatalogEntryById(wpId)
    if (entry?.weaponProficiencyCategory) return entry.weaponProficiencyCategory
    const era = weaponProficiencyEraForSkillId(wpId)
    if (era) return era
  }
  return inferEraFromWeaponText(weapon)
}

export function combatWeaponGlyphId(weapon: Weapon | null): CombatWeaponGlyphId {
  if (!weapon) return 'weapon'
  const wpId = resolveWpId(weapon) ?? ''
  const blob = `${wpId} ${weaponSearchBlob(weapon)}`
  if (/whip/.test(blob)) return 'whip'
  if (/sword/.test(blob)) return 'sword'
  if (/axe/.test(blob)) return 'axe'
  if (/knife|dagger|jitte|sai/.test(blob)) return 'knife'
  if (/shuriken|thrown|dart/.test(blob)) return 'knife'
  if (/archery|bow|targeting/.test(blob)) return 'bow'
  if (/blunt|mace|club|hammer|tonfa/.test(blob)) return 'blunt'
  if (/chain|nunchaku|kusari|manriki/.test(blob)) return 'chain'
  if (/polearm|spear|staff|naginata|yari/.test(blob)) return 'polearm'
  if (/shotgun/.test(blob)) return 'shotgun'
  if (/sub_machine|submachine|smg/.test(blob)) return 'smg'
  if (/heavy/.test(blob)) return 'heavy'
  if (/pistol|revolver/.test(blob)) return 'pistol'
  if (/rifle/.test(blob)) return 'rifle'
  return resolveWeaponCombatEra(weapon) === 'modern' ? 'rifle' : 'weapon'
}

export function listCarriedWeaponsOfEra(
  items: readonly InventoryItem[],
  era: WeaponProficiencyEra,
): Weapon[] {
  return items.filter((it): it is Weapon => {
    if (it.itemType !== 'weapon') return false
    return resolveWeaponCombatEra(it) === era
  })
}

/** Prefer a ready-slot match, else the first carried weapon of that era. */
export function defaultSelectedWeaponId(
  candidates: readonly Weapon[],
  readyIds: readonly (string | null)[],
): string | null {
  if (candidates.length === 0) return null
  const ids = new Set(candidates.map((w) => w.id))
  for (const id of readyIds) {
    if (id && ids.has(id)) return id
  }
  return candidates[0]?.id ?? null
}

export function weaponById(
  candidates: readonly Weapon[],
  id: string | null,
): Weapon | null {
  if (!id) return null
  return candidates.find((w) => w.id === id) ?? null
}

export function formatFireModeDamageLabel(weapon: Weapon, mode: FireMode | null): string {
  const base = weapon.damage.trim() || '—'
  if (!mode?.damageMultiplier || mode.damageMultiplier === 1) return base
  return `${mode.damageMultiplier}× ${base}`
}

export function pickBurstFireMode(modes: readonly FireMode[]): FireMode | null {
  return (
    modes.find((m) => /burst/i.test(m.id) || /burst/i.test(m.name)) ?? null
  )
}

export function pickSingleFireMode(modes: readonly FireMode[]): FireMode | null {
  return (
    modes.find((m) => m.id === 'single' || /^single$/i.test(m.name)) ??
    modes[0] ??
    null
  )
}

/** Category title for the Unarmed row (mockup: "Hand to Hand"). */
export function formatHandToHandCategoryTitle(skillName: string | null): string {
  const raw = skillName?.trim() || 'Hand-to-Hand: None'
  const normalized = raw.replace(/hand-to-hand/gi, 'Hand to Hand')
  const colon = normalized.indexOf(':')
  if (colon < 0) {
    return normalized.replace(/:\s*.*$/, '').trim() || 'Hand to Hand'
  }
  return normalized.slice(0, colon).trim() || 'Hand to Hand'
}

/** Style badge for the Unarmed row (mockup: "EXPERT"). */
export function formatHandToHandStyleBadge(skillName: string | null): string {
  const raw = skillName?.trim() || 'Hand-to-Hand: None'
  const normalized = raw.replace(/hand-to-hand/gi, 'Hand to Hand')
  const colon = normalized.indexOf(':')
  if (colon < 0) return 'NONE'
  return normalized.slice(colon + 1).trim().toUpperCase() || 'NONE'
}

/** "Hand-to-Hand: Expert" → "Hand to Hand: EXPERT" (combined; prefer title + badge in UI). */
export function formatHandToHandHeader(skillName: string | null): string {
  return `${formatHandToHandCategoryTitle(skillName)}: ${formatHandToHandStyleBadge(skillName)}`
}

/** Primary + Secondary are always present; `+` adds 3rd+ removable slots. */
export const COMBAT_ERA_BASE_SLOT_COUNT = 2

/** Ensure Primary + Secondary; extras (3rd+) stay until removed. */
export function normalizeCombatEraSlots(slots: readonly (string | null)[]): (string | null)[] {
  const next = slots.length === 0 ? [] : [...slots]
  while (next.length < COMBAT_ERA_BASE_SLOT_COUNT) next.push(null)
  return next
}

export function addCombatEraSlot(slots: readonly (string | null)[]): (string | null)[] {
  return [...normalizeCombatEraSlots(slots), null]
}

/**
 * Remove a 3rd+ slot only. Primary (0) and Secondary (1) are never removable.
 */
export function removeCombatEraSlot(
  slots: readonly (string | null)[],
  slotIndex: number,
): (string | null)[] {
  if (slotIndex < COMBAT_ERA_BASE_SLOT_COUNT) return normalizeCombatEraSlots(slots)
  return normalizeCombatEraSlots(slots.filter((_, i) => i !== slotIndex))
}

/** Mockup slot label: PRIMARY / SECONDARY / SLOT 3… */
export function formatCombatWeaponSlotLabel(slotIndex: number): string {
  if (slotIndex === 0) return 'PRIMARY'
  if (slotIndex === 1) return 'SECONDARY'
  return `SLOT ${slotIndex + 1}`
}
