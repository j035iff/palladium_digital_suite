import type { PalladiumSkillCatalogEntry } from './catalogTypes'
import registryData from '../content/skill_trait_registry.json'

export type SkillTraitDefinition = {
  id: string
  name: string
  description: string
  gameSystems?: readonly string[]
}

type SkillTraitRegistryFile = {
  version?: number
  traits: SkillTraitDefinition[]
  membershipNotes?: Readonly<Record<string, string>>
}

const file = registryData as SkillTraitRegistryFile

export const SKILL_TRAIT_REGISTRY: readonly SkillTraitDefinition[] = file.traits ?? []

const traitById = new Map(SKILL_TRAIT_REGISTRY.map((t) => [t.id, t]))

export function getSkillTraitDefinition(
  traitId: string,
): SkillTraitDefinition | undefined {
  return traitById.get(traitId)
}

export function isKnownSkillTraitId(traitId: string): boolean {
  return traitById.has(traitId)
}

/** Traits on a catalog skill row (canonical membership). */
export function getSkillTraitIds(
  skill: Pick<PalladiumSkillCatalogEntry, 'skillTraits'>,
): readonly string[] {
  return skill.skillTraits ?? []
}

export function skillHasTrait(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  traitId: string,
): boolean {
  return (skill.skillTraits ?? []).includes(traitId)
}
