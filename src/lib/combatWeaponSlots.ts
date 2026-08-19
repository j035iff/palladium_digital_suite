import type { InventoryItem, Weapon, WeaponProficiencyEra } from '../types'
import { getWeaponProficiencyCatalogEntryById, WEAPON_PROFICIENCY_CATALOG } from '../data/library/weaponProficienciesCatalogLoader'
import { resolveWeaponProficiencySkillId } from '../data/skillLibrary'
import { weaponProficiencyEraForSkillId } from './creationSkillCatalog'
import { isWhitelistedForHostGenre } from './genreGating'
import type { FireMode } from '../types'

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

const MODERN_TEXT =
  /pistol|revolver|rifle|shotgun|smg|sub.?machine|energy|gun|firearm|laser|automatic/

function weaponSearchBlob(weapon: Weapon): string {
  return `${weapon.linkedWpSkillId ?? ''} ${weapon.wpCategory ?? ''} ${weapon.category} ${weapon.name}`.toLowerCase()
}

function resolveWpId(weapon: Weapon): string | undefined {
  return resolveWeaponProficiencySkillId(weapon.wpCategory, weapon.linkedWpSkillId)
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
  if (/knife|dagger/.test(blob)) return 'knife'
  if (/archery|bow|targeting/.test(blob)) return 'bow'
  if (/blunt|mace|club|hammer/.test(blob)) return 'blunt'
  if (/chain/.test(blob)) return 'chain'
  if (/polearm|spear|staff/.test(blob)) return 'polearm'
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

/** "Hand-to-Hand: Expert" → "Hand to Hand: EXPERT" for the Combat Home title. */
export function formatHandToHandHeader(skillName: string | null): string {
  const raw = skillName?.trim() || 'Hand-to-Hand: None'
  const normalized = raw.replace(/hand-to-hand/gi, 'Hand to Hand')
  const colon = normalized.indexOf(':')
  if (colon < 0) return normalized
  const left = normalized.slice(0, colon).trim()
  const right = normalized.slice(colon + 1).trim().toUpperCase()
  return `${left}: ${right}`
}
