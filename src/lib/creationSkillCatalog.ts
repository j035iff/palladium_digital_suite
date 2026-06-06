import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import type { WeaponProficiencyCatalogEntry } from '../data/library/catalogTypes'
import {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
} from '../data/library/skillsCatalogLoader'
import { WEAPON_PROFICIENCY_CATALOG } from '../data/library/weaponProficienciesCatalogLoader'
import type { EngineSkillDef, SkillCategory, SkillPrerequisite } from '../data/skillLibrary'
import { isWhitelistedForHostGenre } from './genreGating'

/** Filter dropdown order (W.P. composite categories last, after Wilderness). */
export const CREATION_SKILL_FILTER_CATEGORY_ORDER: readonly string[] = [
  'Communications',
  'Domestic',
  'Electrical',
  'Espionage',
  'Mechanical',
  'Medical',
  'Military',
  'Physical',
  'Pilot',
  'Pilot Related',
  'Rogue',
  'Science',
  'Technical',
  'Wilderness',
  'WP: Ancient',
  'WP: Modern',
]

/** Pinned to the top of the Technical filter in the creation skill library. */
export const TECHNICAL_PINNED_SKILL_IDS: readonly string[] = [
  'skill_language',
  'skill_literacy',
]

/** Palladium Electrical category — only these three skills (not the broader related_to_electrical trait). */
export const ELECTRICAL_CATEGORY_SKILL_IDS: ReadonlySet<string> = new Set([
  'skill_basic_electronics',
  'skill_computer_repair',
  'skill_electrical_engineer',
])

const BOOK_CATEGORY_TO_ENGINE: Readonly<Record<string, SkillCategory>> = {
  Communications: 'Technical',
  Computer: 'Technical',
  Domestic: 'Misc',
  Electrical: 'Technical',
  Espionage: 'Espionage',
  Mechanical: 'Technical',
  Medical: 'Technical',
  Military: 'Technical',
  Physical: 'Physical',
  Pilot: 'Pilot',
  'Pilot Related': 'Pilot',
  Piloting: 'Pilot',
  Rogue: 'Espionage',
  Science: 'Technical',
  Technical: 'Technical',
  Wilderness: 'Misc',
  'Weapon Proficiencies': 'Weapon',
  Language: 'Misc',
  Literacy: 'Misc',
  Musical: 'Misc',
}

function mapBookCategoryToEngine(categories: readonly string[]): SkillCategory {
  for (const c of categories) {
    const mapped = BOOK_CATEGORY_TO_ENGINE[c]
    if (mapped) return mapped
  }
  return 'Misc'
}

function numericFromBasePercent(basePercent: unknown): number {
  if (typeof basePercent === 'number' && Number.isFinite(basePercent)) {
    return basePercent
  }
  if (!basePercent || typeof basePercent !== 'object') return 0
  const o = basePercent as Record<string, unknown>
  if (typeof o.value === 'number') return o.value
  if (typeof o.defaultPercent === 'number') return o.defaultPercent
  const tracks = o.splitBaseTracks
  if (Array.isArray(tracks) && tracks.length) {
    const first = tracks[0] as Record<string, unknown>
    if (typeof first.basePercent === 'number') return first.basePercent
    if (typeof first.percent === 'number') return first.percent
  }
  return 0
}

function parsePrerequisiteEntry(entry: unknown): SkillPrerequisite | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const row = entry as Record<string, unknown>
  const type = row.type

  if (type === 'skill' && typeof row.skillId === 'string') {
    return { gate: 'and', skillIds: [row.skillId] }
  }

  if (type === 'skill_any_of') {
    const ids =
      (Array.isArray(row.skillIds) ? row.skillIds : null) ??
      (Array.isArray(row.alternatives)
        ? (row.alternatives as Array<{ skillId?: string }>)
            .map((a) => a.skillId)
            .filter((id): id is string => typeof id === 'string')
        : null)
    if (ids?.length) return { gate: 'or', skillIds: [...ids] }
  }

  if (type === 'logical_group' && Array.isArray(row.items)) {
    const op = row.operator === 'any_of' ? 'or' : 'and'
    const nested = (row.items as unknown[])
      .map(parsePrerequisiteEntry)
      .filter((p): p is SkillPrerequisite => p != null)
    if (!nested.length) return undefined
    if (nested.length === 1) return nested[0]
    if (op === 'or') {
      const skillIds = nested.flatMap((n) =>
        'allOf' in n ? [] : n.skillIds,
      )
      return { gate: 'or', skillIds: [...new Set(skillIds)] }
    }
    return { allOf: nested }
  }

  return undefined
}

export function parseCatalogPrerequisites(
  prerequisites: readonly unknown[] | undefined,
): SkillPrerequisite | undefined {
  if (!prerequisites?.length) return undefined
  const parts = prerequisites
    .map(parsePrerequisiteEntry)
    .filter((p): p is SkillPrerequisite => p != null)
  if (!parts.length) return undefined
  if (parts.length === 1) return parts[0]
  return { allOf: parts }
}

export function catalogEntryToEngineSkillDef(
  entry: PalladiumSkillCatalogEntry,
): EngineSkillDef {
  const basePercent = numericFromBasePercent(
    (entry as { basePercent?: unknown }).basePercent,
  )
  const perLevel =
    typeof entry.percentPerLevel === 'number' ? entry.percentPerLevel : 5

  const physicalRaw = (
    entry as { physicalSkillBonuses?: Record<string, unknown> }
  ).physicalSkillBonuses
  const physicalStaging: EngineSkillDef['physicalStaging'] = {}
  let isPhysical = false
  if (physicalRaw && typeof physicalRaw === 'object') {
    for (const [key, val] of Object.entries(physicalRaw)) {
      if (key === 'strike' || key === 'parry' || key === 'dodge' || key === 'rollWithImpact') {
        continue
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        if (key === 'sdc' || key === 'ps' || key === 'pp' || key === 'pe' || key === 'spd') {
          physicalStaging[key] = val
          isPhysical = true
        }
      } else if (
        val &&
        typeof val === 'object' &&
        typeof (val as { value?: unknown }).value === 'number'
      ) {
        const n = (val as { value: number }).value
        if (
          Number.isFinite(n) &&
          (key === 'sdc' || key === 'ps' || key === 'pp' || key === 'pe' || key === 'spd')
        ) {
          physicalStaging[key] = n
          isPhysical = true
        }
      }
    }
  }

  const bookCategories = [...(entry.categories ?? [])]
  if (
    ELECTRICAL_CATEGORY_SKILL_IDS.has(entry.id) &&
    !bookCategories.includes('Electrical')
  ) {
    bookCategories.push('Electrical')
  }
  const occOnly = entry.allowedAsSecondarySkill === false

  return {
    id: entry.id,
    name: entry.name,
    category: mapBookCategoryToEngine(bookCategories),
    bookCategories,
    slotKind: occOnly ? 'occ' : 'occ_related',
    secondaryEligible: !occOnly,
    basePercent,
    perLevel,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: parseCatalogPrerequisites(
      entry.prerequisites as readonly unknown[] | undefined,
    ),
    ...(isPhysical ? { isPhysical: true, physicalStaging } : {}),
  }
}

function weaponProficiencyToEngineSkillDef(
  entry: WeaponProficiencyCatalogEntry,
): EngineSkillDef {
  const bookCategories = [
    entry.weaponProficiencyCategory === 'ancient' ? 'WP: Ancient' : 'WP: Modern',
  ]
  return {
    id: entry.id,
    name: entry.name,
    category: 'Weapon',
    bookCategories,
    slotKind: 'occ_related',
    secondaryEligible: true,
    basePercent: 0,
    perLevel: 3,
    acquisitionLevel: 1,
    occBonus: 0,
  }
}

const REPLACED_SKILL_IDS = new Set(
  PALLADIUM_SKILL_CATALOG.map((s) => s.replaces).filter((id): id is string => !!id),
)

const engineDefCache = new Map<string, EngineSkillDef>()
const supplementalDefs = new Map<string, EngineSkillDef>()

function registerSupplemental(def: EngineSkillDef) {
  supplementalDefs.set(def.id, def)
}

for (const wp of WEAPON_PROFICIENCY_CATALOG) {
  registerSupplemental(weaponProficiencyToEngineSkillDef(wp))
}

export function getEngineSkillDefFromCatalog(
  skillId: string,
): EngineSkillDef | undefined {
  const supplemental = supplementalDefs.get(skillId)
  if (supplemental) return supplemental

  const entry = getPalladiumSkillCatalogEntryById(skillId)
  if (!entry) return undefined
  let cached = engineDefCache.get(entry.id)
  if (!cached) {
    cached = catalogEntryToEngineSkillDef(entry)
    engineDefCache.set(entry.id, cached)
  }
  return cached
}

/** Book categories for O.C.C. related / secondary gating (palladium, W.P., HtH). */
/** Map legacy / O.C.C. voucher category names to creation catalog skills. */
export function voucherAllowedCategoryMatches(
  allowedCategory: string,
  skillId: string,
  bookCategories: readonly string[],
): boolean {
  if (allowedCategory === 'Weapon Proficiencies') {
    return skillId.startsWith('wp_')
  }
  return bookCategories.includes(allowedCategory)
}

export function getSkillBookCategories(skillId: string): readonly string[] {
  const def = getEngineSkillDefFromCatalog(skillId)
  if (def?.bookCategories?.length) return def.bookCategories
  const catalog = getPalladiumSkillCatalogEntryById(skillId)
  if (catalog?.categories?.length) return catalog.categories
  return []
}

/** Genre-gated skill rows for the creation Skill Engine (Pillar 8 — full catalog visibility). */
export function listCreationSkillLibrary(hostGenreId: string): EngineSkillDef[] {
  const byId = new Map<string, EngineSkillDef>()

  for (const entry of PALLADIUM_SKILL_CATALOG) {
    if (!isWhitelistedForHostGenre(entry, hostGenreId)) continue
    if (REPLACED_SKILL_IDS.has(entry.id)) continue
    byId.set(entry.id, catalogEntryToEngineSkillDef(entry))
  }

  for (const wp of WEAPON_PROFICIENCY_CATALOG) {
    if (!isWhitelistedForHostGenre(wp, hostGenreId)) continue
    const def = weaponProficiencyToEngineSkillDef(wp)
    byId.set(def.id, def)
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function matchesSkillBookCategoryFilter(
  def: EngineSkillDef,
  filterCategory: string,
): boolean {
  if (filterCategory === 'All') return true
  return (def.bookCategories ?? []).includes(filterCategory)
}

const TECHNICAL_PINNED_INDEX = new Map(
  TECHNICAL_PINNED_SKILL_IDS.map((id, index) => [id, index]),
)

/** Apply category-specific ordering (e.g. Language / Literacy first in Technical). */
export function sortCreationSkillLibraryResults(
  skills: readonly EngineSkillDef[],
  filterCategory: string,
): EngineSkillDef[] {
  const rows = [...skills]
  if (filterCategory !== 'Technical') {
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }
  return rows.sort((a, b) => {
    const aPin = TECHNICAL_PINNED_INDEX.get(a.id)
    const bPin = TECHNICAL_PINNED_INDEX.get(b.id)
    if (aPin != null && bPin != null) return aPin - bPin
    if (aPin != null) return -1
    if (bPin != null) return 1
    return a.name.localeCompare(b.name)
  })
}

/** Keep selectable library rows first; blocked rows sink to the bottom. */
export function sortCreationSkillLibraryWithSelectableFirst(
  skills: readonly EngineSkillDef[],
  filterCategory: string,
  isSelectable: (def: EngineSkillDef) => boolean,
): EngineSkillDef[] {
  const sorted = sortCreationSkillLibraryResults(skills, filterCategory)
  const selectable: EngineSkillDef[] = []
  const blocked: EngineSkillDef[] = []
  for (const skill of sorted) {
    if (isSelectable(skill)) selectable.push(skill)
    else blocked.push(skill)
  }
  return [...selectable, ...blocked]
}

/** Ordered filter categories for creation skill browsing (fixed book taxonomy). */
export function listCreationSkillBookCategories(
  _hostGenreId?: string,
  _occCategoryNames: readonly string[] = [],
): string[] {
  return [...CREATION_SKILL_FILTER_CATEGORY_ORDER]
}
