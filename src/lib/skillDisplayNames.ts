import {
  getPalladiumSkillCatalogEntryById,
  resolveCatalogSkillId,
} from '../data/library/skillsCatalogLoader'
import { getSkillById } from '../data/skillLibrary'

function humanizeUnresolvedSkillId(skillId: string): string {
  const words = skillId
    .replace(/^skill_/, '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  return words.join(' ')
}

/** User-facing skill label for prerequisites, synergies, and tooltips. */
export function resolveSkillDisplayName(skillId: string): string {
  const catalogEntry =
    getPalladiumSkillCatalogEntryById(skillId) ??
    getPalladiumSkillCatalogEntryById(resolveCatalogSkillId(skillId))
  if (catalogEntry?.name) return catalogEntry.name

  const legacy = getSkillById(skillId)
  if (legacy?.name) return legacy.name

  return humanizeUnresolvedSkillId(skillId)
}
