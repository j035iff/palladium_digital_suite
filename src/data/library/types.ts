import type { CharacterOcc, PsychicTier, XPTable } from '../../types'

export type {
  OCC,
  OccAttributeRequirements,
  OccAlignmentRestrictions,
  OccBaseStatsDice,
  OccCategoryAccessRule,
  OccCategoryAccessType,
  OccCoreSkillGrant,
  OccCustomAbilityEngine,
  OccFinances,
  OccHandToHandRules,
  OccHandToHandUpgradePath,
  OccIspEngine,
  OccIspSavingThrowClass,
  OccLevelUpSkillChoice,
  OccPpeEngine,
  OccProgressionHooks,
  OccRaceRestrictions,
  OccRelatedSkills,
  OccSecondarySkills,
  OccSkillSlotPolicy,
  OccStartingEquipment,
  OccStaticBonuses,
  OccSupernaturalProgressionStep,
  OccTypeSlug,
  OccWpRules,
  OccXpTableId,
  PalladiumOcc,
} from '../../types'

import type { OccSkillSlotPolicy, PalladiumOcc } from '../../types'

/** @deprecated Prefer {@link PalladiumOcc} — same catalog row shape. */
export type LibraryOCC = PalladiumOcc

export function resolveSkillSlotMultiplier(
  policy: OccSkillSlotPolicy,
  psychicTier: PsychicTier,
): number {
  if (policy.kind === 'fixed') return policy.multiplier
  if (psychicTier === 'major') return policy.majorMultiplier
  return policy.defaultMultiplier ?? 1
}

export function snapshotLibraryOcc(
  def: PalladiumOcc,
  xpTable: XPTable,
): CharacterOcc {
  return {
    id: def.id,
    name: def.name,
    category:
      def.progression?.characterOccCategory ??
      (def.ispEngine || def.occType === 'psychic' ? 'psychic' : 'standard'),
    xpTable: { floors: [...xpTable.floors] },
  }
}
