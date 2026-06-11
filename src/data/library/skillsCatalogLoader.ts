import type { PalladiumSkillCatalogEntry } from './catalogTypes'

const skillModules = import.meta.glob('../content/skills/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, PalladiumSkillCatalogEntry[]>

function loadSkills(): readonly PalladiumSkillCatalogEntry[] {
  const byId = new Map<string, PalladiumSkillCatalogEntry>()
  for (const [path, rows] of Object.entries(skillModules)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Skill pool ${path} must be a top-level JSON array`)
    }
    for (const row of rows) {
      if (!row?.id) continue
      if (byId.has(row.id)) {
        throw new Error(
          `Duplicate skill id "${row.id}" in skill catalog (e.g. ${path})`,
        )
      }
      byId.set(row.id, row)
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export const PALLADIUM_SKILL_CATALOG: readonly PalladiumSkillCatalogEntry[] = loadSkills()

/** Legacy / authoring ids mapped to canonical catalog ids. */
export const LEGACY_SKILL_ID_ALIASES: Readonly<Record<string, string>> = {
  skill_mathematics_basic: 'skill_math_basic',
  skill_mathematics_advanced: 'skill_math_advanced',
}

let catalogReplacedByIndex: Map<string, string> | null = null

function replacedByCatalogIdIndex(): Map<string, string> {
  if (catalogReplacedByIndex) return catalogReplacedByIndex
  const map = new Map<string, string>()
  for (const entry of PALLADIUM_SKILL_CATALOG) {
    const replaces = (entry as { replaces?: string }).replaces
    if (typeof replaces === 'string' && replaces) {
      map.set(replaces, entry.id)
    }
  }
  catalogReplacedByIndex = map
  return map
}

export function normalizeCatalogSkillId(id: string): string {
  return id.startsWith('skill_') ? id : `skill_${id}`
}

/** Resolve legacy, shorthand, or replaced ids to a canonical catalog id when possible. */
export function resolveCatalogSkillId(id: string): string {
  const normalized = normalizeCatalogSkillId(id)
  if (PALLADIUM_SKILL_CATALOG.some((entry) => entry.id === normalized)) {
    return normalized
  }
  const alias = LEGACY_SKILL_ID_ALIASES[normalized] ?? LEGACY_SKILL_ID_ALIASES[id]
  if (alias && PALLADIUM_SKILL_CATALOG.some((entry) => entry.id === alias)) {
    return alias
  }
  const replacedBy = replacedByCatalogIdIndex().get(normalized)
  if (
    replacedBy &&
    PALLADIUM_SKILL_CATALOG.some((entry) => entry.id === replacedBy)
  ) {
    return replacedBy
  }
  return normalized
}

export function getPalladiumSkillCatalogEntryById(
  id: string,
): PalladiumSkillCatalogEntry | undefined {
  const direct = PALLADIUM_SKILL_CATALOG.find((s) => s.id === id)
  if (direct) return direct

  const resolved = resolveCatalogSkillId(id)
  if (resolved !== id) {
    return PALLADIUM_SKILL_CATALOG.find((s) => s.id === resolved)
  }

  const normalized = normalizeCatalogSkillId(id)
  if (normalized !== id) {
    return PALLADIUM_SKILL_CATALOG.find((s) => s.id === normalized)
  }
  return undefined
}

/** Whether a selected skill id satisfies a prerequisite skill id (aliases included). */
export function prerequisiteSkillIdSatisfied(
  requiredId: string,
  selectedIds: ReadonlySet<string>,
): boolean {
  const candidates = new Set<string>([
    requiredId,
    normalizeCatalogSkillId(requiredId),
    resolveCatalogSkillId(requiredId),
  ])
  for (const legacyId of Object.keys(LEGACY_SKILL_ID_ALIASES)) {
    if (LEGACY_SKILL_ID_ALIASES[legacyId] === resolveCatalogSkillId(requiredId)) {
      candidates.add(legacyId)
    }
  }
  for (const candidate of candidates) {
    if (selectedIds.has(candidate)) return true
  }
  return false
}

/** Skills whose `gameSystems` includes the slug (e.g. `nightbane`). */
export function listPalladiumSkillsForGameSystem(
  gameSystem: string,
): readonly PalladiumSkillCatalogEntry[] {
  const g = gameSystem.toLowerCase()
  return PALLADIUM_SKILL_CATALOG.filter((s) =>
    s.gameSystems.some((x) => x.toLowerCase() === g),
  )
}
