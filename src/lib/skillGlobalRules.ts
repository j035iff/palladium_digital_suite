import globalRules from '../data/content/skills/utils/skill_global_rules.json'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'

export type SkillGlobalSimilarGroup = {
  id: string
  label: string
  skillIds: readonly string[]
  stackPhysicalBonuses: boolean
  duplicateAbilities: {
    resolution: 'best'
    educationalBonus: 'once'
  }
  bundledSkills: readonly {
    skillId: string
    increasesWithLevelOnlyIfSelected: boolean
  }[]
  notes: string
}

export type DuplicateAbilityCopy = {
  skillId: string
  skillName: string
  name: string
  basePercent: number
  percentPerLevel: number
  proficiency: number
}

const groups = globalRules.similarSkillGroups as readonly SkillGlobalSimilarGroup[]

export function listSimilarSkillGroups(): readonly SkillGlobalSimilarGroup[] {
  return groups
}

export function normalizeAbilityName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function similarSkillGroupFor(skillId: string): SkillGlobalSimilarGroup | undefined {
  return groups.find((group) => group.skillIds.includes(skillId))
}

export function skillsShareSimilarGroup(a: string, b: string): boolean {
  if (a === b) return false
  return groups.some(
    (group) => group.skillIds.includes(a) && group.skillIds.includes(b),
  )
}

/** Bundled Prowl/Climb grants from a similar-skill group do not rise with level. */
export function bundledSkillOmitsLevelGrowth(
  sourceSkillId: string,
  targetSkillId: string,
): boolean {
  const group = similarSkillGroupFor(sourceSkillId)
  if (!group) return false
  return group.bundledSkills.some(
    (row) =>
      row.skillId === targetSkillId && row.increasesWithLevelOnlyIfSelected,
  )
}

export function abilityProficiencyAtLevel(
  basePercent: number,
  percentPerLevel: number,
  characterLevel: number,
): number {
  return (
    basePercent +
    percentPerLevel * Math.max(0, Math.floor(characterLevel) - 1)
  )
}

type CatalogAbility = {
  name?: string
  basePercent?: number
  percentPerLevel?: number
}

function catalogAbilities(skillId: string): CatalogAbility[] {
  const entry = getPalladiumSkillCatalogEntryById(skillId) as
    | {
        subTasks?: CatalogAbility[]
        subSkills?: CatalogAbility[]
      }
    | undefined
  if (!entry) return []
  return [...(entry.subTasks ?? []), ...(entry.subSkills ?? [])]
}

/**
 * Named abilities shared by two or more selected skills in one similar-skill group.
 * Returns null when this name is not duplicated.
 * Copies are unique per skillId (overlapping groups do not double-count).
 */
export function resolveDuplicateAbilityCopies(
  abilityName: string,
  ownedSkillIds: readonly string[],
  characterLevel: number,
): { copies: DuplicateAbilityCopy[]; best: DuplicateAbilityCopy[] } | null {
  const key = normalizeAbilityName(abilityName)
  if (!key) return null
  const owned = new Set(ownedSkillIds)
  const bySkillId = new Map<string, DuplicateAbilityCopy>()

  for (const group of groups) {
    if (group.duplicateAbilities.resolution !== 'best') continue
    const present = group.skillIds.filter((id) => owned.has(id))
    if (present.length < 2) continue
    for (const skillId of present) {
      if (bySkillId.has(skillId)) continue
      const skillName =
        getPalladiumSkillCatalogEntryById(skillId)?.name ?? skillId
      for (const ability of catalogAbilities(skillId)) {
        if (typeof ability.basePercent !== 'number') continue
        const name = ability.name?.trim() || 'Ability'
        if (normalizeAbilityName(name) !== key) continue
        const percentPerLevel =
          typeof ability.percentPerLevel === 'number'
            ? ability.percentPerLevel
            : 5
        bySkillId.set(skillId, {
          skillId,
          skillName,
          name,
          basePercent: ability.basePercent,
          percentPerLevel,
          proficiency: abilityProficiencyAtLevel(
            ability.basePercent,
            percentPerLevel,
            characterLevel,
          ),
        })
        break
      }
    }
  }

  const copies = [...bySkillId.values()]
  if (copies.length < 2) return null
  const top = Math.max(...copies.map((copy) => copy.proficiency))
  return {
    copies,
    best: copies.filter((copy) => copy.proficiency === top),
  }
}

function formatProficiency(copy: DuplicateAbilityCopy): string {
  return `${copy.skillName} ${copy.name} (${copy.basePercent}% +${copy.percentPerLevel}%/level)`
}

/**
 * Live Skills mockup — loser of a duplicated ability points at the winning
 * parent (`See Gymnastics` / `See Acrobatics`) instead of a second %.
 */
export function resolveDuplicateAbilitySeeOther(
  skillId: string,
  abilityName: string,
  ownedSkillIds: readonly string[],
  characterLevel: number,
): { winnerSkillId: string; winnerSkillName: string } | null {
  const resolved = resolveDuplicateAbilityCopies(
    abilityName,
    ownedSkillIds,
    characterLevel,
  )
  if (!resolved) return null
  if (resolved.best.some((copy) => copy.skillId === skillId)) return null
  const best = resolved.best[0]
  if (!best) return null
  return {
    winnerSkillId: best.skillId,
    winnerSkillName: best.skillName,
  }
}

/** Player-facing note for one ability row. Null when the ability is not duplicated. */
export function duplicateAbilityOverlapNote(
  skillId: string,
  abilityName: string,
  ownedSkillIds: readonly string[],
  characterLevel: number,
): string | null {
  const resolved = resolveDuplicateAbilityCopies(
    abilityName,
    ownedSkillIds,
    characterLevel,
  )
  if (!resolved) return null
  const mine = resolved.copies.find((copy) => copy.skillId === skillId)
  if (!mine) return null
  const others = resolved.best.filter((copy) => copy.skillId !== skillId)
  const iAmBest = resolved.best.some((copy) => copy.skillId === skillId)

  if (iAmBest && others.length === 0) {
    const unused = resolved.copies.find((copy) => copy.skillId !== skillId)
    const unusedLabel = unused ? formatProficiency(unused) : 'the other copy'
    return `Best proficiency of this ability. ${unusedLabel} is not added. Educational bonus applies once, on this proficiency.`
  }
  if (iAmBest && others.length > 0) {
    return `Same proficiency as ${formatProficiency(others[0]!)}. Do not add them. Educational bonus applies once.`
  }
  const best = resolved.best[0]
  if (!best) return null
  return `Not added. Best proficiency is ${formatProficiency(best)}. Educational bonus applies on that one only.`
}

/**
 * Familiar Surface note when Climbing/Prowl is only a bundled grant from a
 * similar-skill group parent (does not increase per level).
 */
export function bundledGrantProvidedByNote(
  sourceSkillId: string | undefined,
  targetSkillId: string,
): string | null {
  if (!sourceSkillId) return null
  if (!bundledSkillOmitsLevelGrowth(sourceSkillId, targetSkillId)) return null
  const name =
    getPalladiumSkillCatalogEntryById(sourceSkillId)?.name ?? sourceSkillId
  return `Provided by ${name}: does not increase per level`
}

/** Shown on each selected skill in the group once another group skill is also selected. */
export function similarSkillGroupPlayerNote(
  skillId: string,
  ownedSkillIds: readonly string[],
): string | null {
  const group = similarSkillGroupFor(skillId)
  if (!group) return null
  const owned = new Set(ownedSkillIds)
  const present = group.skillIds.filter((id) => owned.has(id))
  if (present.length < 2) return null
  return `${group.label}: bonuses and pluses are added. Shared abilities (including Sense of Balance) use the best proficiency only, and the educational bonus is applied once. Prowl and Climb from Acrobatics/Gymnastics do not increase with level unless Prowl or Climbing is also selected.`
}
