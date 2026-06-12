import type {
  CharacterRootState,
  Feature,
  OccSupernaturalProgressionStep,
  PalladiumOcc,
} from '../types'
import { featureBudgetCategory } from './featureEngine'
import { getSkillBookCategories } from './creationSkillCatalog'
import { mapFilterCategoryToOccCategory } from './occCategoryRuleDisplay'
import { normalizeCatalogSkillId } from '../data/library/skillsCatalogLoader'
import {
  occCoreSkillSlotWeight,
  occStartingOccSkillIds,
  occStartingRelatedSkillIds,
} from './occCatalogEngine'
import {
  resolvePsychicGateBypassed,
} from './creationPhases'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { initialOccCoreVoucherPicks } from './creationInvalidate'
import { occStartingHandToHandTier } from './creationHandToHandChoice'
import {
  magicSchoolForFeature,
  spellLevelForFeature,
  spellSchoolAllowedForOcc,
} from './magicSchool'

export type OccCreationAbilityBudget = {
  spellSlots: number
  psionicSlots: number
  talentSlots: number
}

export type OccCreationDerived = {
  abilityBudget: OccCreationAbilityBudget
  startingSpellLevelCap: number
  occSkillSlotBudget: number
  occRelatedSkillSlotBudget: number
  secondarySkillSlots: number
  spellRestrictions: readonly string[]
  psionicRestrictions: readonly string[]
  supernaturalSummary: readonly string[]
}

function sumRoadmapSelections(
  roadmap: readonly OccSupernaturalProgressionStep[] | undefined,
  maxLevel: number,
): number {
  if (!roadmap?.length) return 0
  return roadmap
    .filter((s) => s.level <= maxLevel)
    .reduce((sum, s) => sum + s.selectionsGained, 0)
}

function flattenRestrictions(
  roadmap: readonly OccSupernaturalProgressionStep[] | undefined,
  maxLevel: number,
): string[] {
  if (!roadmap?.length) return []
  const out: string[] = []
  for (const step of roadmap) {
    if (step.level > maxLevel) continue
    for (const r of step.categoryRestrictions ?? []) {
      if (r.trim()) out.push(r.trim())
    }
  }
  return [...new Set(out)]
}

function customEngineTalentSlots(occ: PalladiumOcc, maxLevel: number): number {
  let total = 0
  for (const engine of occ.customAbilityEngines ?? []) {
    total += sumRoadmapSelections(engine.progressionRoadmap, maxLevel)
  }
  return total
}

/** Starting (level ≤ 1) supernatural pick budgets from engines; progression hooks override when set. */
export function occCreationAbilityBudget(occ: PalladiumOcc): OccCreationAbilityBudget {
  const fromPpe = sumRoadmapSelections(occ.ppeEngine?.progressionRoadmap, 1)
  const fromIsp = sumRoadmapSelections(occ.ispEngine?.progressionRoadmap, 1)
  const fromTalents = customEngineTalentSlots(occ, 1)

  const derived: OccCreationAbilityBudget = {
    spellSlots: occ.ppeEngine ? Math.max(fromPpe, fromPpe > 0 ? fromPpe : 4) : 0,
    psionicSlots: occ.ispEngine ? Math.max(fromIsp, fromIsp > 0 ? fromIsp : 4) : 0,
    talentSlots: fromTalents,
  }

  const hook = occ.progression?.creationAbilityBudget
  return {
    spellSlots: hook?.spellSlots ?? derived.spellSlots,
    psionicSlots: hook?.psionicSlots ?? derived.psionicSlots,
    talentSlots: hook?.talentSlots ?? derived.talentSlots,
  }
}

export function occStartingSpellLevelCap(occ: PalladiumOcc): number {
  const hook = occ.progression?.startingSpellLevelCap
  if (hook != null) return hook

  const prog = occ.ppeEngine?.spellStrengthProgression
  if (prog) {
    const atOne = prog['1']
    if (atOne != null) return atOne
    const values = Object.values(prog)
    if (values.length) return Math.max(...values)
  }
  return occ.ppeEngine ? 1 : 4
}

export function occOccSkillSlotBudget(occ: PalladiumOcc): number {
  return (
    occ.progression?.occSkillSlotBudget ??
    Math.max(occCoreSkillSlotWeight(occ) + 4, 8)
  )
}

export function occRelatedSkillSlotBudget(occ: PalladiumOcc): number {
  return (
    occ.progression?.occRelatedSkillSlotBudget ??
    occ.occRelatedSkills.initialSlotsCount
  )
}

export function occSecondarySkillSlots(occ: PalladiumOcc): number {
  return occ.secondarySkills.initialSlotsCount
}

export function occCreationSpellRestrictions(
  occ: PalladiumOcc,
  maxLevel = 1,
): readonly string[] {
  return flattenRestrictions(occ.ppeEngine?.progressionRoadmap, maxLevel)
}

export function occCreationPsionicRestrictions(
  occ: PalladiumOcc,
  maxLevel = 1,
): readonly string[] {
  return flattenRestrictions(occ.ispEngine?.progressionRoadmap, maxLevel)
}

/** Normalized psionic pool id (sensitive, physical, healer, super, …). */
export function normalizePsionicCategoryId(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (lower === 'healing') return 'healer'
  return lower
    .replace(/\s+(abilities|psionics)$/i, '')
    .replace(/\s*\/\s*.*$/, '')
}

/** Genre pool categories for a psionic feature (from genrePlacements). */
export function psionicCategoriesForFeature(
  feature: Feature,
  genreId: string,
): readonly string[] {
  const placements = feature.metadata?.genrePlacements
  if (!Array.isArray(placements)) return []
  const g = genreId.toLowerCase()
  const out = new Set<string>()
  for (const placement of placements) {
    if (
      placement &&
      typeof placement === 'object' &&
      String(placement.genreId).toLowerCase() === g &&
      typeof placement.category === 'string'
    ) {
      out.add(normalizePsionicCategoryId(placement.category))
    }
  }
  return [...out]
}

function occCreationPsionicAllowedCategories(
  occ: PalladiumOcc,
  maxLevel = 1,
): readonly string[] {
  return occCreationPsionicRestrictions(occ, maxLevel).map(normalizePsionicCategoryId)
}

function categoryAccessAllowed(
  accessType: 'any' | 'none' | 'only' | 'except',
  inExceptions: boolean,
): boolean {
  switch (accessType) {
    case 'any':
      return !inExceptions
    case 'none':
      return inExceptions
    case 'only':
      return inExceptions
    case 'except':
      return !inExceptions
    default:
      return true
  }
}

function skillIdInRuleExceptions(
  skillId: string,
  exceptions: readonly string[] | undefined,
): boolean {
  if (!exceptions?.length) return false
  const normalized = normalizeCatalogSkillId(skillId)
  return exceptions.some(
    (ex) => ex === skillId || normalizeCatalogSkillId(ex) === normalized,
  )
}

/** Whether a skill is allowed under one book category's O.C.C. rule. */
export function occRelatedSkillAllowedInCategory(
  occ: PalladiumOcc,
  skillId: string,
  categoryName: string,
  specializationId?: string | null,
): boolean {
  occ = resolveEffectivePalladiumOcc(occ, specializationId)
  const rules = occ.occRelatedSkills.categoryRules
  if (!rules.length) return true

  const occCategory = mapFilterCategoryToOccCategory(categoryName)
  const rule = rules.find((r) => r.categoryName === occCategory)
  if (!rule) return true

  const inExceptions = skillIdInRuleExceptions(skillId, rule.exceptions)
  return categoryAccessAllowed(rule.accessType, inExceptions)
}

/**
 * Whether a skill id may be taken as an O.C.C. related pick per categoryRules.
 * When {@link activeFilterCategory} is set, only that browse category's rule applies.
 * Otherwise the skill is allowed if any of its book categories permit it.
 */
export function isOccRelatedSkillAllowed(
  occ: PalladiumOcc,
  skillId: string,
  engineCategory?: string,
  specializationId?: string | null,
  activeFilterCategory?: string,
): boolean {
  occ = resolveEffectivePalladiumOcc(occ, specializationId)
  const rules = occ.occRelatedSkills.categoryRules
  if (!rules.length) return true

  const bookCategories = getSkillBookCategories(skillId)
  const categories = bookCategories.length
    ? [...bookCategories]
    : engineCategory
      ? [engineCategory]
      : []

  if (!categories.length) return true

  if (
    activeFilterCategory &&
    activeFilterCategory !== '' &&
    activeFilterCategory !== 'All'
  ) {
    if (!categories.includes(activeFilterCategory)) return true
    return occRelatedSkillAllowedInCategory(
      occ,
      skillId,
      activeFilterCategory,
      specializationId,
    )
  }

  return categories.some((cat) =>
    occRelatedSkillAllowedInCategory(occ, skillId, cat, specializationId),
  )
}

export function isSecondarySkillCategoryAllowed(
  occ: PalladiumOcc,
  categoryName: string,
): boolean {
  const forbidden = occ.secondarySkills.forbiddenCategories ?? []
  return !forbidden.some((f) => f.toLowerCase() === categoryName.toLowerCase())
}

/** Whether a skill may be taken as a secondary pick (same category access as O.C.C. related). */
export function isSecondarySkillAllowed(
  occ: PalladiumOcc,
  skillId: string,
  engineCategory?: string,
  specializationId?: string | null,
  activeFilterCategory?: string,
): boolean {
  return isOccRelatedSkillAllowed(
    occ,
    skillId,
    engineCategory,
    specializationId,
    activeFilterCategory,
  )
}

function buildSupernaturalSummary(occ: PalladiumOcc): string[] {
  const lines: string[] = []
  if (occ.ppeEngine) {
    lines.push(
      `P.P.E.: ${occ.ppeEngine.baseFormula} (+ ${occ.ppeEngine.perLevelFormula}/level)`,
    )
    const spellCap = occStartingSpellLevelCap(occ)
    lines.push(`Spell strength cap at 1st level: ${spellCap}`)
    const restrictions = occCreationSpellRestrictions(occ, 1)
    if (restrictions.length) {
      lines.push(`Spell picks: ${restrictions.join('; ')}`)
    }
  }
  if (occ.ispEngine) {
    lines.push(
      `I.S.P.: ${occ.ispEngine.baseFormula} (+ ${occ.ispEngine.perLevelFormula}/level) · save class ${occ.ispEngine.savingThrowClass}`,
    )
    const restrictions = occCreationPsionicRestrictions(occ, 1)
    if (restrictions.length) {
      lines.push(`Psionic picks: ${restrictions.join('; ')}`)
    }
  }
  for (const engine of occ.customAbilityEngines ?? []) {
    const n = sumRoadmapSelections(engine.progressionRoadmap, 1)
    lines.push(`${engine.label}: ${n} pick${n === 1 ? '' : 's'} at level 1`)
  }
  return lines
}

export function deriveOccCreation(
  occ: PalladiumOcc,
  specializationId?: string | null,
): OccCreationDerived {
  occ = resolveEffectivePalladiumOcc(occ, specializationId)
  return {
    abilityBudget: occCreationAbilityBudget(occ),
    startingSpellLevelCap: occStartingSpellLevelCap(occ),
    occSkillSlotBudget: occOccSkillSlotBudget(occ),
    occRelatedSkillSlotBudget: occRelatedSkillSlotBudget(occ),
    secondarySkillSlots: occSecondarySkillSlots(occ),
    spellRestrictions: occCreationSpellRestrictions(occ, 1),
    psionicRestrictions: occCreationPsionicRestrictions(occ, 1),
    supernaturalSummary: buildSupernaturalSummary(occ),
  }
}

function maxSpellLevelFromRestriction(restriction: string): number | undefined {
  const match = restriction.match(/level\s+(\d+)/i)
  if (!match) return undefined
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : undefined
}

function restrictionMatches(
  restriction: string,
  ctx: {
    level?: number
    school?: string
    psionicTier?: string
    /** When true, school prose (e.g. Necromancy Only) is handled by `ppeEngine.magicSchools`. */
    structuredSchoolGate?: boolean
  },
): boolean {
  const r = restriction.toLowerCase()
  const maxSpellLevel = maxSpellLevelFromRestriction(restriction)
  if (maxSpellLevel != null && (ctx.level == null || ctx.level > maxSpellLevel)) {
    return false
  }
  if (
    !ctx.structuredSchoolGate &&
    r.includes('necromancy') &&
    ctx.school?.toLowerCase() !== 'necromancy'
  ) {
    return false
  }
  if (r.includes('sensitive only') && ctx.psionicTier?.toLowerCase() !== 'sensitive') {
    return false
  }
  if (r.includes('super psionics locked') && ctx.psionicTier?.toLowerCase() === 'super') {
    return false
  }
  return true
}

/** Gate supernatural ability picks using O.C.C. roadmap restrictions + spell strength cap. */
export function abilityPassesOccSupernaturalRules(
  occ: PalladiumOcc,
  feature: Feature,
  spellCap: number,
  genreId?: string | null,
): { allowed: boolean; reason?: string } {
  const cat = featureBudgetCategory(feature)
  const level = spellLevelForFeature(feature)
  const school = magicSchoolForFeature(feature)
  const structuredSchoolGate = (occ.ppeEngine?.magicSchools?.length ?? 0) > 0
  const psionicTier =
    typeof feature.metadata?.psionicTier === 'string'
      ? feature.metadata.psionicTier
      : undefined

  if (cat === 'Spell') {
    if (level != null && level > spellCap) {
      return {
        allowed: false,
        reason: `Spell level ${level} exceeds O.C.C. spell strength cap (${spellCap}).`,
      }
    }
    const schoolGate = spellSchoolAllowedForOcc(occ, school)
    if (!schoolGate.allowed) {
      return schoolGate
    }
    for (const r of occCreationSpellRestrictions(occ, 1)) {
      if (!restrictionMatches(r, { level, school, structuredSchoolGate })) {
        return { allowed: false, reason: r }
      }
    }
  }

  if (cat === 'Psionic') {
    const allowedCategories = occCreationPsionicAllowedCategories(occ, 1)
    if (allowedCategories.length > 0 && genreId) {
      const powerCategories = psionicCategoriesForFeature(feature, genreId)
      if (powerCategories.length === 0) {
        return {
          allowed: false,
          reason: 'Not listed in this genre psionic catalog.',
        }
      }
      const permitted = powerCategories.some((c) => allowedCategories.includes(c))
      if (!permitted) {
        return {
          allowed: false,
          reason: `O.C.C. permits ${allowedCategories.join(', ')} psionics only at 1st level.`,
        }
      }
    }

    for (const r of occCreationPsionicRestrictions(occ, 1)) {
      if (!restrictionMatches(r, { psionicTier })) {
        return { allowed: false, reason: r }
      }
    }
  }

  return { allowed: true }
}

/** Budgets, caps, and gate flags from O.C.C. engines (safe on hydrate). */
export function patchCharacterCreationFromOcc(
  prev: CharacterRootState,
  occ: PalladiumOcc,
): CharacterRootState {
  const derived = deriveOccCreation(occ, prev.occSpecializationId)
  const mundaneGenre = isGenreSupernaturalAbilitiesDisallowed(prev.creationGenreId)
  const abilityBudget = mundaneGenre
    ? { spellSlots: 0, psionicSlots: 0, talentSlots: 0 }
    : derived.abilityBudget

  return {
    ...prev,
    psychicGateBypassed: resolvePsychicGateBypassed(
      prev.raceId,
      occ,
      prev.creationGenreId,
    ),
    creationAbilityBudget: abilityBudget,
    selectedAbilities: mundaneGenre ? [] : prev.selectedAbilities,
    startingSpellLevelCap: derived.startingSpellLevelCap,
    occSkillSlotBudget: derived.occSkillSlotBudget,
    occRelatedSkillSlotBudget: derived.occRelatedSkillSlotBudget,
  }
}

/** Bootstrap Skill Engine picks when the player selects an O.C.C. in Step 0. */
export function applyOccStartingSkillPicks(
  prev: CharacterRootState,
  occ: PalladiumOcc,
): CharacterRootState {
  const specId = prev.occSpecializationId
  const effective = resolveEffectivePalladiumOcc(occ, specId)
  return {
    ...prev,
    creationOccCoreVoucherPicks: initialOccCoreVoucherPicks(prev, occ),
    creationOccSkillIds: occStartingOccSkillIds(occ, specId),
    creationRelatedSkillPicks: occStartingRelatedSkillIds(effective).map((id) => ({
      instanceId: id,
      skillId: id,
    })),
    creationSecondarySkillPicks: [],
    creationRelatedSkillIds: undefined,
    creationSecondarySkillIds: undefined,
    creationHandToHandTier: occStartingHandToHandTier(effective),
  }
}
