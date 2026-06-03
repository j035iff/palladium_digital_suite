import type { PalladiumOcc, PsychicTier } from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { resolveSkillSlotMultiplier } from '../data/library/types'
import type { OccSkillSlotPolicy } from '../types'
import {
  isOccCoreSkillGrant,
  occRelatedSkillBonusPercent,
  resolveEffectivePalladiumOcc,
} from './occComposition'
import { occSkillSlotPolicy } from './occCatalogEngine'
import { skillSlotMultiplierForTier } from './psychicGate'

/** Major psychic: halve O.C.C. skill bonus % (floor fractions; psychic_gate.md §2). */
export function occSkillBonusMultiplierForTier(tier: PsychicTier): number {
  return skillSlotMultiplierForTier(tier)
}

export function applyPsychicOccSkillBonusPercent(
  rawBonus: number,
  tier: PsychicTier,
): number {
  if (rawBonus <= 0 || !Number.isFinite(rawBonus)) return 0
  return Math.floor(rawBonus * occSkillBonusMultiplierForTier(tier))
}

/** Book O.C.C. bonus % before Major psychic halving. */
export function rawOccSkillBonusPercent(
  occ: PalladiumOcc | undefined,
  skillId: string,
  relatedIds: ReadonlySet<string>,
  specializationId?: string | null,
): number {
  if (!occ) return 0
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  if (relatedIds.has(skillId)) {
    const catalog = getPalladiumSkillCatalogEntryById(skillId)
    return occRelatedSkillBonusPercent(
      effective,
      skillId,
      catalog?.categories ?? [],
    )
  }
  for (const entry of effective.occSkillsCore) {
    if (isOccCoreSkillGrant(entry) && entry.skillId === skillId) {
      return entry.bonusPercent ?? 0
    }
  }
  return 0
}

/** O.C.C. bonus % after psychic tier tax (creation preview + spawn handoff). */
export function resolveOccSkillBonusPercent(
  occ: PalladiumOcc | undefined,
  skillId: string,
  relatedIds: ReadonlySet<string>,
  psychicTier: PsychicTier,
  specializationId?: string | null,
): number {
  const raw = rawOccSkillBonusPercent(
    occ,
    skillId,
    relatedIds,
    specializationId,
  )
  return applyPsychicOccSkillBonusPercent(raw, psychicTier)
}

export function resolveCreationPsychicTier(
  character: {
    psychicGateBypassed?: boolean
    creationPsychicTier?: PsychicTier
    occ?: { category?: string }
  },
  fallback: PsychicTier = 'none',
): PsychicTier {
  if (character.psychicGateBypassed) return 'none'
  if (character.creationPsychicTier) return character.creationPsychicTier
  if (character.occ?.category === 'psychic') return 'master'
  return fallback
}

export function creationRelatedSkillCap(
  relatedBase: number,
  psychicTier: PsychicTier,
  policy?: OccSkillSlotPolicy,
): number {
  const mult = policy
    ? resolveSkillSlotMultiplier(policy, psychicTier)
    : skillSlotMultiplierForTier(psychicTier)
  return Math.floor(relatedBase * mult)
}

export function assessRelatedSkillSlotBlockers(
  relatedSelectedCount: number,
  relatedBase: number,
  psychicTier: PsychicTier,
  occ?: PalladiumOcc,
): string[] {
  if (!occ || relatedBase <= 0) return []
  const cap = creationRelatedSkillCap(
    relatedBase,
    psychicTier,
    occSkillSlotPolicy(occ),
  )
  if (cap <= 0) return []
  if (relatedSelectedCount >= cap) return []
  return [
    `Fill all O.C.C. related skill slots (${relatedSelectedCount} / ${cap}${psychicTier === 'major' ? ' — Major psychic halved budget' : ''}).`,
  ]
}
