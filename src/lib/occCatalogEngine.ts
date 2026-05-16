import type {
  OccSkillSlotPolicy,
  OccXpTableId,
  PalladiumOcc,
} from '../types'
import {
  isOccCoreSkillGrant,
  occCoreEntrySlotWeight,
  resolveEffectivePalladiumOcc,
} from './occComposition'

const DEFAULT_WP_RULES = { coreWps: [] as string[], forbiddenWps: [] as string[] }
const DEFAULT_H2H = { defaultSkillId: 'hand_to_hand_basic', upgradePaths: [] }
const DEFAULT_SECONDARY = { initialSlotsCount: 0, forbiddenCategories: [] as string[] }
const DEFAULT_RELATED = { initialSlotsCount: 0, categoryRules: [] }

/** Resolve XP table id from progression hooks or occType heuristics. */
export function occXpTableId(occ: PalladiumOcc): OccXpTableId {
  if (occ.progression?.xpTableId) return occ.progression.xpTableId
  if (occ.id === 'borg') return 'borg'
  if (occ.occType === 'psychic' || occ.ispEngine) return 'psychic'
  return 'standard'
}

/** Sheet Psychic Gate / CharacterOcc.category. */
export function occCharacterCategory(occ: PalladiumOcc): 'psychic' | 'standard' {
  if (occ.progression?.characterOccCategory) {
    return occ.progression.characterOccCategory
  }
  if (occ.ispEngine || occ.occType === 'psychic') return 'psychic'
  return 'standard'
}

export function occPsychicGateBypassed(occ: PalladiumOcc): boolean {
  return occ.progression?.psychicGateBypassed === true
}

export function occSkillSlotPolicy(occ: PalladiumOcc): OccSkillSlotPolicy {
  const p = occ.progression?.relatedSkillSlotPolicy
  if (p?.kind === 'fixed' && p.multiplier != null) {
    return { kind: 'fixed', multiplier: p.multiplier }
  }
  if (p?.kind === 'psychic_tier' && p.majorMultiplier != null) {
    return {
      kind: 'psychic_tier',
      majorMultiplier: p.majorMultiplier,
      defaultMultiplier: p.defaultMultiplier ?? 1,
    }
  }
  if (occ.ispEngine) {
    return { kind: 'psychic_tier', majorMultiplier: 0.5, defaultMultiplier: 1 }
  }
  return { kind: 'fixed', multiplier: 1 }
}

export function occStartingOccSkillIds(
  occ: PalladiumOcc,
  specializationId?: string | null,
): string[] {
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  return effective.occSkillsCore
    .filter(isOccCoreSkillGrant)
    .map((s) => s.skillId)
}

export function occCoreSkillSlotWeight(occ: PalladiumOcc): number {
  return occ.occSkillsCore.reduce((sum, entry) => sum + occCoreEntrySlotWeight(entry), 0)
}

export function occStartingRelatedSkillIds(occ: PalladiumOcc): string[] {
  return [...(occ.occRelatedSkills.startingSkillIds ?? [])]
}

export function occBaseStatsDice(occ: PalladiumOcc): {
  hpDice: string
  sdcDice: string
  ppeDice?: string
  ispDice?: string
} {
  const b = occ.baseStats
  return {
    hpDice: b?.hpDice ?? '1D6',
    sdcDice: b?.sdcDice ?? '2D6',
    ppeDice: b?.ppeDice ?? occ.ppeEngine?.baseFormula,
    ispDice: b?.ispDice ?? occ.ispEngine?.baseFormula,
  }
}

export function occTags(occ: PalladiumOcc): readonly string[] {
  return occ.tags ?? []
}

/** Safe defaults when optional composition blocks are omitted in sparse rows. */
export function normalizePalladiumOcc(row: PalladiumOcc): PalladiumOcc {
  return {
    ...row,
    tags: row.tags ?? [],
    occSkillsCore: row.occSkillsCore ?? [],
    occRelatedSkills: row.occRelatedSkills ?? DEFAULT_RELATED,
    secondarySkills: row.secondarySkills ?? DEFAULT_SECONDARY,
    wpRules: row.wpRules ?? DEFAULT_WP_RULES,
    handToHandRules: row.handToHandRules ?? DEFAULT_H2H,
  }
}
