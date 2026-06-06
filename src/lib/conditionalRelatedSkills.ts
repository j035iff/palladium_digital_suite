import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { EngineSkillDef } from '../data/skillLibrary'
import type { CreationSkillPick } from '../types'
import {
  findConditionalGrantPick,
  formatCreationSkillPickLabel,
  newCreationSkillPickInstanceId,
} from './creationSkillPicks'

export type ConditionalSynergyBonusLine = {
  label: string
  value: number
}

function effectiveSkillLevel(acquisitionLevel: number, characterLevel: number): number {
  return Math.max(1, characterLevel - acquisitionLevel + 1)
}

export type ConditionalRelatedSkillRule = {
  skillId: string
  bonusIfAlreadyHave?: { skillPercentBonus?: number }
  grantIfMissing?: {
    startingPercent?: number
    percentPerLevel?: number
  }
}

export function listConditionalRelatedSkillRules(
  sourceSkillId: string,
): readonly ConditionalRelatedSkillRule[] {
  const entry = getPalladiumSkillCatalogEntryById(sourceSkillId) as
    | Record<string, unknown>
    | undefined
  const raw = entry?.conditionalRelatedSkills
  if (!Array.isArray(raw)) return []

  return raw
    .map((row): ConditionalRelatedSkillRule | null => {
      if (!row || typeof row !== 'object') return null
      const skillId = (row as { skillId?: string }).skillId
      if (typeof skillId !== 'string' || !skillId) return null
      return row as ConditionalRelatedSkillRule
    })
    .filter((row): row is ConditionalRelatedSkillRule => row != null)
}

export function resolveConditionalRelatedSynergyLines(
  targetSkillId: string,
  selectedIds: ReadonlySet<string>,
  picks: readonly CreationSkillPick[],
  pick?: CreationSkillPick,
): ConditionalSynergyBonusLine[] {
  if (pick?.grantedBySkillId) return []

  const lines: ConditionalSynergyBonusLine[] = []

  for (const sourceId of selectedIds) {
    if (sourceId === targetSkillId) continue
    for (const rule of listConditionalRelatedSkillRules(sourceId)) {
      if (rule.skillId !== targetSkillId) continue
      const bonus = rule.bonusIfAlreadyHave?.skillPercentBonus
      if (typeof bonus !== 'number' || bonus === 0) continue
      const sourceName =
        getPalladiumSkillCatalogEntryById(sourceId)?.name ?? sourceId
      const sourcePick = picks.find((p) => p.skillId === sourceId)
      lines.push({
        label: sourcePick
          ? formatCreationSkillPickLabel(sourcePick, sourceName)
          : sourceName,
        value: bonus,
      })
    }
  }

  return lines
}

export function resolvePickBasePercentAtLevel(
  def: Pick<EngineSkillDef, 'basePercent' | 'perLevel' | 'acquisitionLevel'>,
  pick: CreationSkillPick | undefined,
  characterLevel: number,
): number {
  if (pick?.conditionalGrantStartingPercent != null) {
    const grantPerLevel =
      pick.grantedBySkillId != null
        ? resolveGrantPerLevel(pick.grantedBySkillId, def.id, def.perLevel)
        : def.perLevel
    const eff = effectiveSkillLevel(def.acquisitionLevel, characterLevel)
    return (
      pick.conditionalGrantStartingPercent +
      grantPerLevel * Math.max(0, eff - 1)
    )
  }
  const eff = effectiveSkillLevel(def.acquisitionLevel, characterLevel)
  return def.basePercent + def.perLevel * Math.max(0, eff - 1)
}

function resolveGrantPerLevel(
  sourceSkillId: string,
  targetSkillId: string,
  fallbackPerLevel: number,
): number {
  for (const rule of listConditionalRelatedSkillRules(sourceSkillId)) {
    if (rule.skillId !== targetSkillId) continue
    if (typeof rule.grantIfMissing?.percentPerLevel === 'number') {
      return rule.grantIfMissing.percentPerLevel
    }
  }
  return fallbackPerLevel
}

export function buildConditionalRelatedGrantPick(
  sourceSkillId: string,
  rule: ConditionalRelatedSkillRule,
): CreationSkillPick {
  return {
    instanceId: newCreationSkillPickInstanceId(),
    skillId: rule.skillId,
    grantedBySkillId: sourceSkillId,
    ...(rule.grantIfMissing?.startingPercent != null
      ? { conditionalGrantStartingPercent: rule.grantIfMissing.startingPercent }
      : {}),
  }
}

export function replaceConditionalGrantWithPaidPick(
  paidPick: CreationSkillPick,
  tier: 'related' | 'secondary',
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  const related = relatedPicks.filter(
    (p) =>
      !(
        p.skillId === paidPick.skillId &&
        p.grantedBySkillId &&
        p.instanceId !== paidPick.instanceId
      ),
  )
  const secondary = secondaryPicks.filter(
    (p) =>
      !(
        p.skillId === paidPick.skillId &&
        p.grantedBySkillId &&
        p.instanceId !== paidPick.instanceId
      ),
  )

  if (tier === 'related') {
    return { related: [...related, paidPick], secondary }
  }
  return { related, secondary: [...secondary, paidPick] }
}

export function hasConditionalGrantForSkill(
  skillId: string,
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): boolean {
  return (
    findConditionalGrantPick(relatedPicks, skillId) != null ||
    findConditionalGrantPick(secondaryPicks, skillId) != null
  )
}

export function appendCreationSkillPickWithConditionalGrants(
  addedPick: CreationSkillPick,
  tier: 'related' | 'secondary',
  selectedBeforeAdd: ReadonlySet<string>,
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  const rules = listConditionalRelatedSkillRules(addedPick.skillId)
  const grants: CreationSkillPick[] = []

  for (const rule of rules) {
    if (!rule.grantIfMissing) continue
    if (selectedBeforeAdd.has(rule.skillId)) continue
    grants.push(buildConditionalRelatedGrantPick(addedPick.skillId, rule))
  }

  if (tier === 'related') {
    return {
      related: [...relatedPicks, addedPick, ...grants],
      secondary: [...secondaryPicks],
    }
  }
  return {
    related: [...relatedPicks],
    secondary: [...secondaryPicks, addedPick, ...grants],
  }
}

/** Remove a pick and any skills it granted via conditionalRelatedSkills. */
export function removeCreationSkillPickWithConditionalCascade(
  picks: readonly CreationSkillPick[],
  instanceId: string,
): CreationSkillPick[] {
  const removed = picks.find((p) => p.instanceId === instanceId)
  if (!removed) return [...picks]

  return picks.filter((p) => {
    if (p.instanceId === instanceId) return false
    if (
      !removed.grantedBySkillId &&
      p.grantedBySkillId === removed.skillId
    ) {
      return false
    }
    return true
  })
}

export function grantedBySkillLabel(pick: CreationSkillPick): string | null {
  if (!pick.grantedBySkillId) return null
  return getPalladiumSkillCatalogEntryById(pick.grantedBySkillId)?.name ?? null
}
