import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { EngineSkillDef } from '../data/skillLibrary'
import type { CreationSkillPick } from '../types'
import {
  bundledSkillOmitsLevelGrowth,
  listSimilarSkillGroups,
} from './skillGlobalRules'
import {
  type CreationSkillAvailabilityContext,
  findConditionalGrantPick,
  formatCreationSkillPickLabel,
  isCreationSkillExcludedFromOccOrRace,
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
  availability?: CreationSkillAvailabilityContext,
): ConditionalSynergyBonusLine[] {
  if (pick?.grantedBySkillId) return []

  const lines: ConditionalSynergyBonusLine[] = []

  for (const sourceId of selectedIds) {
    if (sourceId === targetSkillId) continue
    if (
      availability &&
      (availability.effectiveOcc || availability.raceBlocked) &&
      isCreationSkillExcludedFromOccOrRace(sourceId, availability)
    ) {
      continue
    }
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
  def: Pick<EngineSkillDef, 'id' | 'basePercent' | 'perLevel' | 'acquisitionLevel'>,
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

export function resolveGrantPerLevel(
  sourceSkillId: string,
  targetSkillId: string,
  fallbackPerLevel: number,
): number {
  for (const rule of listConditionalRelatedSkillRules(sourceSkillId)) {
    if (rule.skillId !== targetSkillId) continue
    if (typeof rule.grantIfMissing?.percentPerLevel === 'number') {
      return rule.grantIfMissing.percentPerLevel
    }
    if (bundledSkillOmitsLevelGrowth(sourceSkillId, targetSkillId)) return 0
  }
  return fallbackPerLevel
}

function catalogGrantStartingPercent(
  sourceSkillId: string,
  targetSkillId: string,
): number | null {
  for (const rule of listConditionalRelatedSkillRules(sourceSkillId)) {
    if (rule.skillId !== targetSkillId) continue
    const start = rule.grantIfMissing?.startingPercent
    return typeof start === 'number' ? start : null
  }
  return null
}

/**
 * When both skills in a similar-skill group are selected, keep one bundled
 * Prowl/Climb grant at the higher starting percent. A separately selected
 * skill replaces the grant.
 */
export function reconcileSimilarSkillBundledGrants(
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  type Slot = { pick: CreationSkillPick; tier: 'related' | 'secondary' }
  const slots: Slot[] = [
    ...relatedPicks.map((pick) => ({ pick, tier: 'related' as const })),
    ...secondaryPicks.map((pick) => ({ pick, tier: 'secondary' as const })),
  ]

  for (const group of listSimilarSkillGroups()) {
    const groupSourceIds = new Set(group.skillIds)
    for (const bundled of group.bundledSkills) {
      if (!bundled.increasesWithLevelOnlyIfSelected) continue
      const targetId = bundled.skillId
      const paid = slots.some(
        (slot) => slot.pick.skillId === targetId && !slot.pick.grantedBySkillId,
      )
      if (paid) {
        for (let i = slots.length - 1; i >= 0; i--) {
          const slot = slots[i]!
          if (
            slot.pick.skillId === targetId &&
            slot.pick.grantedBySkillId &&
            groupSourceIds.has(slot.pick.grantedBySkillId)
          ) {
            slots.splice(i, 1)
          }
        }
        continue
      }

      let best: {
        sourceId: string
        start: number
        tier: 'related' | 'secondary'
      } | null = null
      for (const slot of slots) {
        if (slot.pick.grantedBySkillId) continue
        if (!groupSourceIds.has(slot.pick.skillId)) continue
        const start = catalogGrantStartingPercent(slot.pick.skillId, targetId)
        if (start == null) continue
        if (!best || start > best.start) {
          best = { sourceId: slot.pick.skillId, start, tier: slot.tier }
        }
      }

      const grantIndexes: number[] = []
      slots.forEach((slot, index) => {
        if (
          slot.pick.skillId === targetId &&
          slot.pick.grantedBySkillId &&
          groupSourceIds.has(slot.pick.grantedBySkillId)
        ) {
          grantIndexes.push(index)
        }
      })

      if (!best) continue

      if (grantIndexes.length === 0) {
        slots.push({
          tier: best.tier,
          pick: buildConditionalRelatedGrantPick(best.sourceId, {
            skillId: targetId,
            grantIfMissing: { startingPercent: best.start },
          }),
        })
        continue
      }

      const keep = grantIndexes[0]!
      const existing = slots[keep]!.pick
      slots[keep] = {
        tier: best.tier,
        pick: {
          ...existing,
          grantedBySkillId: best.sourceId,
          conditionalGrantStartingPercent: best.start,
        },
      }
      for (let n = grantIndexes.length - 1; n >= 1; n--) {
        slots.splice(grantIndexes[n]!, 1)
      }
    }
  }

  return {
    related: slots.filter((slot) => slot.tier === 'related').map((slot) => slot.pick),
    secondary: slots
      .filter((slot) => slot.tier === 'secondary')
      .map((slot) => slot.pick),
  }
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

  const placed =
    tier === 'related'
      ? {
          related: [...relatedPicks, addedPick, ...grants],
          secondary: [...secondaryPicks],
        }
      : {
          related: [...relatedPicks],
          secondary: [...secondaryPicks, addedPick, ...grants],
        }
  return reconcileSimilarSkillBundledGrants(placed.related, placed.secondary)
}

export function removeCreationSkillPickFromTiers(
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
  instanceId: string,
): { related: CreationSkillPick[]; secondary: CreationSkillPick[] } {
  return reconcileSimilarSkillBundledGrants(
    removeCreationSkillPickWithConditionalCascade(relatedPicks, instanceId),
    removeCreationSkillPickWithConditionalCascade(secondaryPicks, instanceId),
  )
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
