import globalRules from '../data/content/psionic_global_rules.json'
import type {
  OccSupernaturalRuleOverrideLeyLine,
  OccSupernaturalRuleOverrideMeditation,
  OccSupernaturalRuleOverridePsychicApm,
  OccSupernaturalRuleOverrides,
  PalladiumOcc,
} from '../types'

export type ResolvedLeyLinePsionicRules = {
  source: 'global' | 'occ'
  rangeDurationNearLeyLineMultiplier: number
  rangeDurationAtNexusMultiplier: number
  damageAtNexusMultiplier: number
  notes: string
}

export type ResolvedMeditationRules = {
  source: 'global' | 'occ'
  ispPerHour: number
  sleepRestIspPerHour: number
  notes: string
}

export type ResolvedPsychicApmRules = {
  source: 'global' | 'occ'
  linkedToHandToHand: boolean
  bonusTotalActions: number
  additionalPsionicOnlyActions: number
  notes: string
}

function leyLineOverride(
  override: OccSupernaturalRuleOverrideLeyLine | undefined,
): ResolvedLeyLinePsionicRules {
  const g = globalRules.leyLine
  if (!override || override.useGlobalDefault !== false) {
    return {
      source: 'global',
      rangeDurationNearLeyLineMultiplier: g.rangeDurationNearLeyLineMultiplier,
      rangeDurationAtNexusMultiplier: g.rangeDurationAtNexusMultiplier,
      damageAtNexusMultiplier: g.damageAtNexusMultiplier,
      notes: override?.notes?.trim() || g.notes,
    }
  }
  return {
    source: 'occ',
    rangeDurationNearLeyLineMultiplier:
      override.rangeDurationNearLeyLineMultiplier ?? g.rangeDurationNearLeyLineMultiplier,
    rangeDurationAtNexusMultiplier:
      override.rangeDurationAtNexusMultiplier ?? g.rangeDurationAtNexusMultiplier,
    damageAtNexusMultiplier:
      override.damageAtNexusMultiplier ?? g.damageAtNexusMultiplier,
    notes: override.notes?.trim() || g.notes,
  }
}

function meditationOverride(
  override: OccSupernaturalRuleOverrideMeditation | undefined,
): ResolvedMeditationRules {
  const g = globalRules.meditation
  if (!override || override.useGlobalDefault !== false) {
    return {
      source: 'global',
      ispPerHour: g.ispPerHour,
      sleepRestIspPerHour: g.sleepRestIspPerHour,
      notes: override?.notes?.trim() || g.notes,
    }
  }
  return {
    source: 'occ',
    ispPerHour: override.ispPerHour ?? g.ispPerHour,
    sleepRestIspPerHour: override.sleepRestIspPerHour ?? g.sleepRestIspPerHour,
    notes: override.notes?.trim() || g.notes,
  }
}

function psychicApmOverride(
  override: OccSupernaturalRuleOverridePsychicApm | undefined,
): ResolvedPsychicApmRules {
  const g = globalRules.psychicApm
  if (!override || override.useGlobalDefault !== false) {
    return {
      source: 'global',
      linkedToHandToHand: g.linkedToHandToHand,
      bonusTotalActions: 0,
      additionalPsionicOnlyActions: 0,
      notes: override?.notes?.trim() || g.notes,
    }
  }
  return {
    source: 'occ',
    linkedToHandToHand: override.linkedToHandToHand ?? g.linkedToHandToHand,
    bonusTotalActions: override.bonusTotalActions ?? 0,
    additionalPsionicOnlyActions: override.additionalPsionicOnlyActions ?? 0,
    notes: override.notes?.trim() || g.notes,
  }
}

export function resolveOccPsionicGlobalRules(occ: PalladiumOcc | undefined): {
  leyLine: ResolvedLeyLinePsionicRules
  meditation: ResolvedMeditationRules
  psychicApm: ResolvedPsychicApmRules
} {
  const overrides = occ?.supernaturalRuleOverrides
  return {
    leyLine: leyLineOverride(overrides?.leyLine),
    meditation: meditationOverride(overrides?.meditation),
    psychicApm: psychicApmOverride(overrides?.psychicApm),
  }
}

export function formatPsionicGlobalRuleSummaryLines(
  occ: PalladiumOcc | undefined,
): string[] {
  const rules = resolveOccPsionicGlobalRules(occ)
  const lines: string[] = []

  const ley = rules.leyLine
  lines.push(
    ley.source === 'occ'
      ? `Ley line / nexus (O.C.C. override): near ley line ×${ley.rangeDurationNearLeyLineMultiplier} range/duration; at nexus ×${ley.rangeDurationAtNexusMultiplier} range/duration, ×${ley.damageAtNexusMultiplier} damage`
      : `Ley line / nexus: near ley line +50% range/duration; at nexus doubled range/duration and damage`,
  )
  if (ley.notes) lines.push(ley.notes)

  const med = rules.meditation
  lines.push(
    med.source === 'occ'
      ? `Meditation (O.C.C. override): ${med.ispPerHour} I.S.P./hour; rest ${med.sleepRestIspPerHour}/hour`
      : `Meditation: ${med.ispPerHour} I.S.P./hour; rest ${med.sleepRestIspPerHour}/hour`,
  )
  if (med.notes && med.source === 'occ') lines.push(med.notes)

  const apm = rules.psychicApm
  if (apm.additionalPsionicOnlyActions > 0 || apm.bonusTotalActions !== 0) {
    const parts: string[] = []
    if (apm.linkedToHandToHand) parts.push('linked to Hand-to-Hand APM')
    if (apm.bonusTotalActions !== 0) {
      parts.push(`${apm.bonusTotalActions >= 0 ? '+' : ''}${apm.bonusTotalActions} total APM`)
    }
    if (apm.additionalPsionicOnlyActions > 0) {
      parts.push(
        `+${apm.additionalPsionicOnlyActions} psionic-only action${apm.additionalPsionicOnlyActions === 1 ? '' : 's'}/melee`,
      )
    }
    lines.push(`Psychic APM (O.C.C. override): ${parts.join('; ')}`)
    if (apm.notes) lines.push(apm.notes)
  } else if (apm.linkedToHandToHand) {
    lines.push('Psychic APM: equal to Hand-to-Hand attacks per melee')
  }

  return lines
}
