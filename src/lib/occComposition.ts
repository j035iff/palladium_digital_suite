import type {
  OccCategoryAccessRule,
  OccCoreSkillEntry,
  OccCoreSkillGrant,
  OccCoreSkillChoiceVoucher,
  OccFinances,
  OccHandToHandRules,
  OccRelatedSkills,
  OccClassAbility,
  OccSpecialization,
  OccWpRules,
  OccStartingEquipment,
  OccStaticBonusValue,
  OccStaticBonuses,
  PalladiumOcc,
} from '../types'

export function isOccCoreSkillGrant(entry: OccCoreSkillEntry): entry is OccCoreSkillGrant {
  return 'skillId' in entry && typeof (entry as OccCoreSkillGrant).skillId === 'string'
}

export function isOccCoreSkillChoiceVoucher(
  entry: OccCoreSkillEntry,
): entry is OccCoreSkillChoiceVoucher {
  return 'choiceCount' in entry && typeof (entry as OccCoreSkillChoiceVoucher).choiceCount === 'number'
}

export function occCoreEntrySlotWeight(entry: OccCoreSkillEntry): number {
  return isOccCoreSkillChoiceVoucher(entry) ? entry.choiceCount : 1
}

export function formatOccCoreSkillEntry(entry: OccCoreSkillEntry): string {
  if (isOccCoreSkillGrant(entry)) {
    return `${entry.skillId}${entry.bonusPercent ? ` +${entry.bonusPercent}%` : ''}`
  }
  const parts: string[] = []
  if (entry.label) parts.push(entry.label)
  else parts.push(`${entry.choiceCount} pick${entry.choiceCount === 1 ? '' : 's'}`)
  if (entry.allowedCategories?.length) {
    parts.push(`from ${entry.allowedCategories.join(', ')}`)
  }
  if (entry.allowedSkillIds?.length) {
    parts.push(`from [${entry.allowedSkillIds.join(', ')}]`)
  }
  if (entry.bonusPercent) parts.push(`+${entry.bonusPercent}% each`)
  return parts.join(' ')
}

function mergeNumericBonusMaps(
  base: Readonly<Record<string, OccStaticBonusValue>> | undefined,
  patch: Readonly<Record<string, OccStaticBonusValue>> | undefined,
): Readonly<Record<string, OccStaticBonusValue>> | undefined {
  if (!patch || Object.keys(patch).length === 0) return base
  const out: Record<string, OccStaticBonusValue> = { ...(base ?? {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === 'string') {
      out[k] = v
    } else if (typeof out[k] === 'number') {
      out[k] = out[k] + v
    } else {
      out[k] = v
    }
  }
  return out
}

function mergeFinances(
  base: OccFinances | undefined,
  patch: OccFinances | undefined,
): OccFinances | undefined {
  if (!patch) return base
  if (!base) return patch
  return { ...base, ...patch }
}

function mergeWpRules(
  base: OccWpRules,
  patch: OccWpRules | undefined,
): OccWpRules {
  if (!patch) return base
  return {
    coreWps: [
      ...new Set([...(base.coreWps ?? []), ...(patch.coreWps ?? [])]),
    ],
    forbiddenWps: [
      ...new Set([...(base.forbiddenWps ?? []), ...(patch.forbiddenWps ?? [])]),
    ],
  }
}

function mergeHandToHandRules(
  base: OccHandToHandRules,
  patch: OccHandToHandRules | undefined,
): OccHandToHandRules {
  if (!patch) return base
  return {
    defaultSkillId:
      patch.defaultSkillId !== undefined ? patch.defaultSkillId : base.defaultSkillId,
    upgradePaths:
      patch.upgradePaths != null && patch.upgradePaths.length > 0
        ? patch.upgradePaths
        : base.upgradePaths,
    minimumCreationHandToHandTier:
      patch.minimumCreationHandToHandTier ?? base.minimumCreationHandToHandTier,
  }
}

function hasStartingEquipment(block: OccStartingEquipment | undefined): boolean {
  if (!block) return false
  return (
    (block.weapons?.length ?? 0) > 0 ||
    (block.armor?.length ?? 0) > 0 ||
    (block.miscellaneous?.length ?? 0) > 0
  )
}

function mergeLevelGatedSaves(
  base: OccStaticBonuses['levelGatedSaves'] | undefined,
  patch: OccStaticBonuses['levelGatedSaves'] | undefined,
): OccStaticBonuses['levelGatedSaves'] | undefined {
  if (!patch || Object.keys(patch).length === 0) return base
  if (!base) return patch
  const out: Record<string, Record<string, number>> = {}
  for (const saveKey of new Set([...Object.keys(base), ...Object.keys(patch)])) {
    const merged: Record<string, number> = { ...(base[saveKey] ?? {}) }
    for (const [level, value] of Object.entries(patch[saveKey] ?? {})) {
      merged[level] = (merged[level] ?? 0) + value
    }
    out[saveKey] = merged
  }
  return out
}

function mergeCategoryMinimums(
  base: OccRelatedSkills['categoryMinimums'] | undefined,
  patch: OccRelatedSkills['categoryMinimums'] | undefined,
): OccRelatedSkills['categoryMinimums'] | undefined {
  if (!patch?.length) return base
  if (!base?.length) return patch
  const byName = new Map(base.map((m) => [m.categoryName.toLowerCase(), { ...m }]))
  for (const rule of patch) {
    const key = rule.categoryName.toLowerCase()
    const prev = byName.get(key)
    byName.set(
      key,
      prev
        ? {
            ...prev,
            ...rule,
            minimumCount: Math.max(prev.minimumCount, rule.minimumCount),
          }
        : rule,
    )
  }
  return [...byName.values()]
}

function mergeStaticBonuses(
  base: OccStaticBonuses | undefined,
  patch: OccStaticBonuses | undefined,
): OccStaticBonuses | undefined {
  if (!patch) return base
  if (!base) return patch
  return {
    attributes: mergeNumericBonusMaps(base.attributes, patch.attributes),
    vitals: mergeNumericBonusMaps(base.vitals, patch.vitals),
    combat: mergeNumericBonusMaps(base.combat, patch.combat),
    saves: mergeNumericBonusMaps(base.saves, patch.saves),
    levelGatedSaves: mergeLevelGatedSaves(base.levelGatedSaves, patch.levelGatedSaves),
  }
}

function mergeCategoryRules(
  base: readonly OccCategoryAccessRule[],
  patch: readonly OccCategoryAccessRule[] | undefined,
): readonly OccCategoryAccessRule[] {
  if (!patch?.length) return base
  const byName = new Map(base.map((r) => [r.categoryName.toLowerCase(), { ...r }]))
  for (const rule of patch) {
    const key = rule.categoryName.toLowerCase()
    const prev = byName.get(key)
    byName.set(key, prev ? { ...prev, ...rule } : rule)
  }
  return [...byName.values()]
}

function mergeClassAbilities(
  base: readonly OccClassAbility[] | undefined,
  patch: readonly OccClassAbility[] | undefined,
): readonly OccClassAbility[] | undefined {
  if (!patch?.length) return base
  if (!base?.length) return patch
  return [...base, ...patch]
}

function mergeRelatedSkills(
  base: OccRelatedSkills,
  patch: OccSpecialization['occRelatedSkills'],
): OccRelatedSkills {
  if (!patch) return base
  return {
    initialSlotsCount: patch.initialSlotsCount ?? base.initialSlotsCount,
    startingSkillIds: [
      ...new Set([...(base.startingSkillIds ?? []), ...(patch.startingSkillIds ?? [])]),
    ],
    categoryRules: mergeCategoryRules(base.categoryRules, patch.categoryRules),
    categoryMinimums: mergeCategoryMinimums(
      base.categoryMinimums,
      patch.categoryMinimums,
    ),
  }
}

export function getOccSpecialization(
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
): OccSpecialization | undefined {
  if (!specializationId || !occ.specializations?.length) return undefined
  return occ.specializations.find((s) => s.id === specializationId)
}

/**
 * Baseline O.C.C. row merged with an optional sub-class branch selection.
 */
export function resolveEffectivePalladiumOcc(
  occ: PalladiumOcc,
  specializationId?: string | null,
): PalladiumOcc {
  const spec = getOccSpecialization(occ, specializationId)
  if (!spec) return occ

  return {
    ...occ,
    staticBonuses: mergeStaticBonuses(occ.staticBonuses, spec.staticBonuses),
    startingEquipment: hasStartingEquipment(spec.startingEquipment)
      ? spec.startingEquipment
      : occ.startingEquipment,
    finances: mergeFinances(occ.finances, spec.finances),
    occSkillsCore:
      spec.occSkillsCore != null && spec.occSkillsCore.length > 0
        ? spec.occSkillsCore
        : occ.occSkillsCore,
    occRelatedSkills: mergeRelatedSkills(occ.occRelatedSkills, spec.occRelatedSkills),
    wpRules: mergeWpRules(occ.wpRules, spec.wpRules),
    handToHandRules: mergeHandToHandRules(occ.handToHandRules, spec.handToHandRules),
    classAbilities: mergeClassAbilities(occ.classAbilities, spec.classAbilities),
  }
}

export function occGrantsDefaultHandToHand(occ: PalladiumOcc): boolean {
  return occ.handToHandRules.defaultSkillId != null
}

/**
 * Related-skill % bonus for a pick: skillSpecificOverrides win, else category bonusPercent.
 */
export function occRelatedSkillBonusPercent(
  occ: PalladiumOcc,
  skillId: string,
  skillCategories: readonly string[],
): number {
  for (const rule of occ.occRelatedSkills.categoryRules) {
    if (!skillCategories.some((c) => c === rule.categoryName)) continue
    const override = rule.skillSpecificOverrides?.[skillId]
    if (override != null) return override
  }
  let best = 0
  for (const rule of occ.occRelatedSkills.categoryRules) {
    if (!skillCategories.some((c) => c === rule.categoryName)) continue
    if (rule.bonusPercent > best) best = rule.bonusPercent
  }
  return best
}
