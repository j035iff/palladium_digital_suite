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
  return Array.isArray(category) ? category : [category]
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

  const wpEntry = entry.linkedWpSkillId
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
    linkedWpSkillId:
      entry.weaponProficiencyEligible === false
        ? undefined
        : entry.linkedWpSkillId,
    wpCategory:
      entry.weaponProficiencyEligible === false ? undefined : wpEntry?.name,
    catalogWeaponId: entry.id,
    qualityVariantId: resolved.qualityVariantId,
    throwable: Boolean(entry.throwable),
    twoHanded: resolved.twoHanded,
    weaponProficiencyEligible: entry.weaponProficiencyEligible !== false,
  }
}
