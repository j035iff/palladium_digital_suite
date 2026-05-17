import type { PalladiumSkillCatalogEntry } from './catalogTypes'
import skillsData from '../content/palladiumSkills.json'

const rows = skillsData as unknown

function loadSkills(): readonly PalladiumSkillCatalogEntry[] {
  return Array.isArray(rows) ? (rows as PalladiumSkillCatalogEntry[]) : []
}

export const PALLADIUM_SKILL_CATALOG: readonly PalladiumSkillCatalogEntry[] = loadSkills()

export function normalizeCatalogSkillId(id: string): string {
  return id.startsWith('skill_') ? id : `skill_${id}`
}

export function getPalladiumSkillCatalogEntryById(
  id: string,
): PalladiumSkillCatalogEntry | undefined {
  const direct = PALLADIUM_SKILL_CATALOG.find((s) => s.id === id)
  if (direct) return direct
  const normalized = normalizeCatalogSkillId(id)
  if (normalized !== id) {
    return PALLADIUM_SKILL_CATALOG.find((s) => s.id === normalized)
  }
  return undefined
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
