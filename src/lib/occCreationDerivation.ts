import type {
  Character,
  Feature,
  OccSupernaturalProgressionStep,
  PalladiumOcc,
} from '../types'
import { featureBudgetCategory } from './featureEngine'
import { getPalladiumSkillCatalogEntryById } from '../data/library/registry'
import {
  occCoreSkillSlotWeight,
  occPsychicGateBypassed,
  occStartingOccSkillIds,
  occStartingRelatedSkillIds,
} from './occCatalogEngine'
import { resolveEffectivePalladiumOcc } from './occComposition'

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

/**
 * Whether a skill id may be taken as an O.C.C. related pick per categoryRules.
 * Uses palladiumSkills.json categories when available; falls back to engine category label.
 */
export function isOccRelatedSkillAllowed(
  occ: PalladiumOcc,
  skillId: string,
  engineCategory?: string,
  specializationId?: string | null,
): boolean {
  occ = resolveEffectivePalladiumOcc(occ, specializationId)
  const rules = occ.occRelatedSkills.categoryRules
  if (!rules.length) return true

  const catalog = getPalladiumSkillCatalogEntryById(skillId)
  const categories = catalog?.categories?.length
    ? [...catalog.categories]
    : engineCategory
      ? [engineCategory]
      : []

  if (!categories.length) return true

  for (const rule of rules) {
    if (!categories.includes(rule.categoryName)) continue
    const inExceptions = rule.exceptions?.includes(skillId) ?? false
    return categoryAccessAllowed(rule.accessType, inExceptions)
  }

  return true
}

export function isSecondarySkillCategoryAllowed(
  occ: PalladiumOcc,
  categoryName: string,
): boolean {
  const forbidden = occ.secondarySkills.forbiddenCategories ?? []
  return !forbidden.some((f) => f.toLowerCase() === categoryName.toLowerCase())
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

function restrictionMatches(
  restriction: string,
  ctx: {
    level?: number
    school?: string
    psionicTier?: string
  },
): boolean {
  const r = restriction.toLowerCase()
  if (r.includes('level 1') && (ctx.level == null || ctx.level > 1)) return false
  if (r.includes('level 2') && (ctx.level == null || ctx.level > 2)) return false
  if (r.includes('necromancy') && ctx.school?.toLowerCase() !== 'necromancy') {
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
): { allowed: boolean; reason?: string } {
  const cat = featureBudgetCategory(feature)
  const level =
    typeof feature.metadata?.level === 'number' ? feature.metadata.level : undefined
  const school =
    typeof feature.metadata?.school === 'string' ? feature.metadata.school : undefined
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
    for (const r of occCreationSpellRestrictions(occ, 1)) {
      if (!restrictionMatches(r, { level, school })) {
        return { allowed: false, reason: r }
      }
    }
  }

  if (cat === 'Psionic') {
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
  prev: Character,
  occ: PalladiumOcc,
): Character {
  const derived = deriveOccCreation(occ, prev.occSpecializationId)
  return {
    ...prev,
    psychicGateBypassed: occPsychicGateBypassed(occ) || prev.psychicGateBypassed,
    creationAbilityBudget: derived.abilityBudget,
    startingSpellLevelCap: derived.startingSpellLevelCap,
    occSkillSlotBudget: derived.occSkillSlotBudget,
    occRelatedSkillSlotBudget: derived.occRelatedSkillSlotBudget,
  }
}

/** Bootstrap Skill Engine picks when the player selects an O.C.C. in Step 0. */
export function applyOccStartingSkillPicks(
  prev: Character,
  occ: PalladiumOcc,
): Character {
  const specId = prev.occSpecializationId
  const effective = resolveEffectivePalladiumOcc(occ, specId)
  return {
    ...prev,
    creationOccSkillIds: occStartingOccSkillIds(occ, specId),
    creationRelatedSkillIds: occStartingRelatedSkillIds(effective),
  }
}
