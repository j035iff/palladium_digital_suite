import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
} from '../data/library/skillsCatalogLoader'
import type { EngineSkillDef, SkillCategory, SkillPrerequisite } from '../data/skillLibrary'
import { isWhitelistedForHostGenre } from './genreGating'

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

  return {
    id: entry.id,
    name: entry.name,
    category: mapBookCategoryToEngine(entry.categories),
    slotKind: entry.allowedAsSecondarySkill === false ? 'occ' : 'occ_related',
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

const REPLACED_SKILL_IDS = new Set(
  PALLADIUM_SKILL_CATALOG.map((s) => s.replaces).filter((id): id is string => !!id),
)

const engineDefCache = new Map<string, EngineSkillDef>()

export function getEngineSkillDefFromCatalog(
  skillId: string,
): EngineSkillDef | undefined {
  const entry = getPalladiumSkillCatalogEntryById(skillId)
  if (!entry) return undefined
  let cached = engineDefCache.get(entry.id)
  if (!cached) {
    cached = catalogEntryToEngineSkillDef(entry)
    engineDefCache.set(entry.id, cached)
  }
  return cached
}

/** Genre-gated skill rows for the creation Skill Engine (Pillar 8 — full catalog visibility). */
export function listCreationSkillLibrary(hostGenreId: string): EngineSkillDef[] {
  return PALLADIUM_SKILL_CATALOG.filter(
    (entry) =>
      isWhitelistedForHostGenre(entry, hostGenreId) &&
      !REPLACED_SKILL_IDS.has(entry.id),
  )
    .map(catalogEntryToEngineSkillDef)
    .sort((a, b) => a.name.localeCompare(b.name))
}
