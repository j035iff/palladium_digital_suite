import type {
  AncientWeaponCatalogEntry,
  AncientWeaponGenreStatBlock,
  AncientWeaponQualityVariant,
} from './catalogTypes'
import { getWeaponProficiencyCatalogEntryById } from './weaponProficienciesCatalogLoader'
import ancientWeaponsData from '../content/weapons/ancient.json'

const rows = ancientWeaponsData as unknown

function loadAncientWeapons(): readonly AncientWeaponCatalogEntry[] {
  return Array.isArray(rows) ? (rows as AncientWeaponCatalogEntry[]) : []
}

export const ANCIENT_WEAPON_CATALOG: readonly AncientWeaponCatalogEntry[] =
  loadAncientWeapons()

const CATEGORY_LABELS: Record<string, string> = {
  axes: 'Axes',
  pole_arms: 'Pole Arms',
  spears: 'Spears',
  knives: 'Knives',
  short_swords: 'Short Swords',
  large_swords: 'Large Swords',
  chain: 'Chain',
  blunt: 'Blunt',
  staves: 'Staves',
  missile: 'Missile',
  thrown: 'Thrown',
  whips: 'Whips',
  miscellaneous: 'Miscellaneous',
}

/** Normalize catalog `category` (string or array) to a slug list. */
export function ancientWeaponCategorySlugs(
  category: string | readonly string[],
): readonly string[] {
  if (typeof category === 'string') return [category]
  return category
}

export function ancientWeaponCategoryLabel(
  category: string | readonly string[],
): string {
  return ancientWeaponCategorySlugs(category)
    .map((c) => CATEGORY_LABELS[c] ?? c.replace(/_/g, ' '))
    .join(' / ')
}

export function getAncientWeaponById(
  id: string,
): AncientWeaponCatalogEntry | undefined {
  return ANCIENT_WEAPON_CATALOG.find((w) => w.id === id)
}

export function listAncientWeaponsForGameSystem(
  gameSystem: string,
): readonly AncientWeaponCatalogEntry[] {
  const g = gameSystem.toLowerCase()
  return ANCIENT_WEAPON_CATALOG.filter((w) =>
    w.gameSystems.some((x) => x.toLowerCase() === g),
  )
}

/** Playable / equippable hardware for the Gear picker (not ammo-only rows). */
export function listAncientWeaponsForGearPicker(
  gameSystem: string,
): readonly AncientWeaponCatalogEntry[] {
  return listAncientWeaponsForGameSystem(gameSystem).filter((w) => {
    const role = w.entryRole ?? 'weapon'
    return role === 'weapon' || role === 'improvised' || role === 'weapon_set'
  })
}

export function resolveAncientWeaponGenreStats(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
): AncientWeaponGenreStatBlock | undefined {
  const g = gameSystem.toLowerCase()
  return (
    entry.genreStats.find((s) => s.gameSystem.toLowerCase() === g) ??
    entry.genreStats[0]
  )
}

export function resolveAncientWeaponQualityVariant(
  stats: AncientWeaponGenreStatBlock,
  qualityVariantId?: string | null,
): AncientWeaponQualityVariant | undefined {
  const variants = stats.qualityVariants
  if (!variants?.length) return undefined
  if (qualityVariantId) {
    const hit = variants.find((v) => v.id === qualityVariantId)
    if (hit) return hit
  }
  return variants[0]
}

export type ResolvedAncientWeaponCombatStats = {
  damage: string
  damageSpecial?: string
  payloadNotes?: string
  twoHanded: boolean
  weightLbs: number
  qualityVariantId?: string
  qualityLabel?: string
}

/**
 * Resolve display damage / weight / two-hand for a catalog row + host genre
 * (+ optional quality tier).
 */
export function resolveAncientWeaponCombatStats(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
  qualityVariantId?: string | null,
): ResolvedAncientWeaponCombatStats | null {
  const stats = resolveAncientWeaponGenreStats(entry, gameSystem)
  if (!stats) return null

  const variant = resolveAncientWeaponQualityVariant(stats, qualityVariantId)
  const damage =
    variant?.damage?.trim() ||
    stats.damage?.trim() ||
    (stats.damageSpecial ? '—' : '') ||
    '1D6'

  const lb = stats.averageWeight?.lb
  const weightLbs =
    typeof lb === 'number' && Number.isFinite(lb) ? Math.max(0, lb) : 2

  return {
    damage,
    damageSpecial: stats.damageSpecial,
    payloadNotes: stats.payloadNotes,
    twoHanded: Boolean(stats.twoHanded),
    weightLbs,
    qualityVariantId: variant?.id,
    qualityLabel: variant?.label,
  }
}

/**
 * Condensed picker meta line from existing catalog fields only
 * (damage, weight, range, flags, linked W.P.) — no invented bonuses.
 */
export function formatAncientWeaponPickerStatLine(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
): string {
  const resolved = resolveAncientWeaponCombatStats(entry, gameSystem)
  const stats = resolveAncientWeaponGenreStats(entry, gameSystem)
  const parts: string[] = []

  if (resolved?.damage && resolved.damage !== '—') {
    parts.push(resolved.damage)
  } else if (resolved?.damageSpecial?.trim()) {
    parts.push(resolved.damageSpecial.trim())
  }

  if (resolved && Number.isFinite(resolved.weightLbs)) {
    const lb = resolved.weightLbs
    parts.push(`${Number.isInteger(lb) ? lb : lb.toFixed(1)} lb`)
  }

  if (stats?.range?.display?.trim()) {
    parts.push(stats.range.display.trim())
  } else if (typeof stats?.range?.feet === 'number') {
    parts.push(`${stats.range.feet} ft`)
  }

  if (resolved?.twoHanded) parts.push('2H')
  if (entry.throwable) parts.push('thrown')
  if (entry.canEntangle) parts.push('entangle')

  // Misc: no W.P. chip (Joe ruling — for now), even if catalog row still links one.
  if (
    !isAncientWeaponMiscellaneousCategory(entry.category) &&
    entry.weaponProficiencyEligible !== false &&
    entry.linkedWpSkillId
  ) {
    const wp = getWeaponProficiencyCatalogEntryById(entry.linkedWpSkillId)
    if (wp?.name) parts.push(wp.name)
  }

  if (stats?.qualityVariants && stats.qualityVariants.length > 1) {
    parts.push(`${stats.qualityVariants.length} tiers`)
  }

  return parts.join(' · ')
}

/**
 * Joe ruling (for now): Miscellaneous ancient weapons never carry a linked W.P.
 * — even if a catalog row still has `linkedWpSkillId` (e.g. Kawanga → wp_chain).
 */
export function isAncientWeaponMiscellaneousCategory(
  category: string | readonly string[],
): boolean {
  return ancientWeaponCategorySlugs(category).some(
    (slug) => slug === 'miscellaneous',
  )
}

/** True when a custom-form category label is Misc / Miscellaneous. */
export function isCustomWeaponMiscellaneousCategoryLabel(
  categoryLabel: string,
): boolean {
  const n = categoryLabel.trim().toLowerCase()
  return n === 'misc' || n === 'miscellaneous'
}

/** Fields for {@link CharacterContext.addWeaponToInventory} from a catalog row. */
export function ancientCatalogToInventoryPiece(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
  qualityVariantId?: string | null,
): {
  name: string
  category: string
  damage: string
  strikeBonus: number
  weightLbs: number
  linkedWpSkillId?: string
  wpCategory?: string
  catalogWeaponId: string
  qualityVariantId?: string
  throwable: boolean
  twoHanded: boolean
  weaponProficiencyEligible: boolean
} | null {
  const resolved = resolveAncientWeaponCombatStats(entry, gameSystem, qualityVariantId)
  if (!resolved) return null

  const miscNoWp = isAncientWeaponMiscellaneousCategory(entry.category)
  const wpEligible =
    !miscNoWp && entry.weaponProficiencyEligible !== false
  const wpEntry =
    wpEligible && entry.linkedWpSkillId
      ? getWeaponProficiencyCatalogEntryById(entry.linkedWpSkillId)
      : undefined

  const name = resolved.qualityLabel
    ? `${entry.name} (${resolved.qualityLabel})`
    : entry.name

  return {
    name,
    category: ancientWeaponCategoryLabel(entry.category),
    damage: resolved.damage,
    strikeBonus: 0,
    weightLbs: resolved.weightLbs,
    linkedWpSkillId: wpEligible ? entry.linkedWpSkillId : undefined,
    wpCategory: wpEligible ? wpEntry?.name : undefined,
    catalogWeaponId: entry.id,
    qualityVariantId: resolved.qualityVariantId,
    throwable: Boolean(entry.throwable),
    twoHanded: resolved.twoHanded,
    weaponProficiencyEligible: wpEligible,
  }
}

/**
 * Draft fields for the Custom Weapon editor when using a catalog row as a
 * base archetype. Maps only existing catalog fields — ancient genreStats do
 * not encode intrinsic strike / parry / entangle / disarm numeric bonuses.
 *
 * Combat bonus slots default to `+0` for now (Joe ruling). Ideal later:
 * `N/A` only when schema/JSON marks a stat inapplicable to that weapon type
 * (e.g. swords can’t entangle) — do not invent per-type N/A matrices yet.
 */
export type AncientWeaponCustomArchetypeDraft = {
  name: string
  category: string
  damage: string
  /** Display for Strike field — catalog has no intrinsic; `+0`. */
  strikeDisplay: string
  /** Display for Parry — catalog has none; `+0`. */
  parryDisplay: string
  /** Catalog has canEntangle flag only (no numeric); form shows `+0` for now. */
  entangleDisplay: string
  /** Not in ancient catalog; `+0` until applicability schema exists. */
  disarmDisplay: string
  /** Catalog `range.display` / feet when present; else empty (not a bonus cell). */
  rangeDisplay: string
  /** Not in ancient catalog; `+0` until applicability schema exists. */
  rateOfFireDisplay: string
  /** Catalog has throwable flag only (no numeric); `+0` for now. */
  strikeWhenThrownDisplay: string
  weightLbs: number
  weightKg: number | null
  lengthFeet: number | null
  lengthMeters: number | null
  /** Catalog has no material field — left empty (do not invent). */
  material: string
  description: string
  linkedWpSkillId?: string
  wpCategory?: string
  weaponProficiencyEligible: boolean
  throwable: boolean
  twoHanded: boolean
  /**
   * Catalog has no P.S. damage-bonus flag.
   * Default **false** (Joe ruling) until schema carries source of truth.
   */
  addsPsDamageBonus: boolean
  /** Honest gaps vs custom-form combat slots that catalog rows do not fill. */
  catalogGaps: readonly string[]
}

function buildArchetypeDescription(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
  qualityVariantId?: string | null,
): string {
  const stats = resolveAncientWeaponGenreStats(entry, gameSystem)
  const resolved = resolveAncientWeaponCombatStats(
    entry,
    gameSystem,
    qualityVariantId,
  )
  const parts: string[] = []
  if (entry.description?.trim()) parts.push(entry.description.trim())
  if (resolved?.damageSpecial?.trim()) {
    parts.push(`Special damage: ${resolved.damageSpecial.trim()}`)
  }
  if (stats?.payloadNotes?.trim()) {
    parts.push(stats.payloadNotes.trim())
  }
  if (stats?.notes?.trim()) parts.push(stats.notes.trim())
  if (entry.canEntangle) {
    const alreadyMentionsEntangle = parts.some((p) =>
      /entangle/i.test(p),
    )
    if (!alreadyMentionsEntangle) parts.push('Can entangle.')
  }
  return parts.join('\n\n')
}

function formatCatalogRangeDisplay(
  stats: AncientWeaponGenreStatBlock | undefined,
): string {
  if (!stats?.range) return ''
  if (stats.range.display?.trim()) return stats.range.display.trim()
  if (typeof stats.range.feet === 'number') return `${stats.range.feet} ft`
  if (
    typeof stats.range.feetMin === 'number' &&
    typeof stats.range.feetMax === 'number'
  ) {
    return `${stats.range.feetMin}–${stats.range.feetMax} ft`
  }
  return ''
}

/**
 * Populate Custom Weapon editor slots from an ancient catalog row.
 * Intrinsic strike/parry/entangle/disarm bonuses are absent from catalog data.
 */
export function ancientCatalogToCustomArchetypeDraft(
  entry: AncientWeaponCatalogEntry,
  gameSystem: string,
  qualityVariantId?: string | null,
): AncientWeaponCustomArchetypeDraft | null {
  const piece = ancientCatalogToInventoryPiece(
    entry,
    gameSystem,
    qualityVariantId,
  )
  if (!piece) return null

  const stats = resolveAncientWeaponGenreStats(entry, gameSystem)
  const kg = stats?.averageWeight?.kg
  const feet = stats?.averageLength?.feet
  const meters = stats?.averageLength?.meters

  const catalogGaps = [
    'Intrinsic strike / parry / entangle / disarm bonuses (not in genreStats) — form shows +0 for now',
    'Material (not in catalog — left blank)',
    'Rate of fire (ancient catalog has none) — form shows +0 until applicability schema',
    'Adds P.S. damage bonus (no catalog flag — defaults off)',
    'Future: N/A only when schema marks a combat slot inapplicable to the weapon type',
  ]

  return {
    name: piece.name,
    category: piece.category,
    damage: piece.damage,
    strikeDisplay: '+0',
    parryDisplay: '+0',
    entangleDisplay: '+0',
    disarmDisplay: '+0',
    rangeDisplay: formatCatalogRangeDisplay(stats),
    rateOfFireDisplay: '+0',
    strikeWhenThrownDisplay: '+0',
    weightLbs: piece.weightLbs,
    weightKg:
      typeof kg === 'number' && Number.isFinite(kg) ? kg : null,
    lengthFeet:
      typeof feet === 'number' && Number.isFinite(feet) ? feet : null,
    lengthMeters:
      typeof meters === 'number' && Number.isFinite(meters) ? meters : null,
    material: '',
    description: buildArchetypeDescription(entry, gameSystem, qualityVariantId),
    linkedWpSkillId: piece.linkedWpSkillId,
    wpCategory: piece.wpCategory,
    weaponProficiencyEligible: piece.weaponProficiencyEligible,
    throwable: piece.throwable,
    twoHanded: piece.twoHanded,
    addsPsDamageBonus: false,
    catalogGaps,
  }
}

/** Sort category rows with Miscellaneous last; otherwise A–Z by label. */
export function sortAncientWeaponCategoriesMiscLast<
  T extends { slug: string; label: string },
>(categories: readonly T[]): T[] {
  return [...categories].sort((a, b) => {
    const aMisc = a.slug === 'miscellaneous' ? 1 : 0
    const bMisc = b.slug === 'miscellaneous' ? 1 : 0
    if (aMisc !== bMisc) return aMisc - bMisc
    return a.label.localeCompare(b.label)
  })
}
