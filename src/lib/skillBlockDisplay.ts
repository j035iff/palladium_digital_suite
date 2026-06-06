import type { SkillPrerequisite } from '../data/skillLibrary'
import type { EngineSkillDef } from '../data/skillLibrary'
import {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
} from '../data/library/skillsCatalogLoader'
import type { CreationSkillAvailabilityContext } from './creationSkillPicks'
import { isCreationSkillExcludedFromOccOrRace } from './creationSkillPicks'
import { resolveSkillDisplayName } from './skillDisplayNames'
import type { SkillPickDisplayTier } from './skillCreationDisplay'

export type SkillSynergyDirection = 'incoming' | 'outgoing'

export type SkillSynergyHint = {
  direction: SkillSynergyDirection
  sourceSkillId: string
  sourceName: string
  targetSkillId?: string
  targetName?: string
  bonusPercent: number
}

function skillDisplayName(skillId: string): string {
  return resolveSkillDisplayName(skillId)
}

function formatNameList(names: readonly string[], gate: 'and' | 'or'): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  if (names.length === 2) {
    return gate === 'or' ? `${names[0]} or ${names[1]}` : `${names[0]} and ${names[1]}`
  }
  const last = names[names.length - 1]!
  const rest = names.slice(0, -1).join(', ')
  return gate === 'or' ? `${rest}, or ${last}` : `${rest}, and ${last}`
}

function formatPrerequisiteSegment(prereq: SkillPrerequisite): string | null {
  if ('allOf' in prereq) {
    const andNames: string[] = []
    const segments: string[] = []

    for (const part of prereq.allOf) {
      if ('allOf' in part) {
        const nested = formatPrerequisiteSegment(part)
        if (nested) segments.push(nested)
        continue
      }
      if (part.gate === 'or') {
        segments.push(formatNameList(part.skillIds.map(skillDisplayName), 'or'))
      } else if (part.skillIds.length === 1) {
        andNames.push(skillDisplayName(part.skillIds[0]!))
      } else {
        andNames.push(...part.skillIds.map(skillDisplayName))
      }
    }

    if (andNames.length > 0) {
      segments.unshift(formatNameList(andNames, 'and'))
    }

    return segments.length ? segments.join('; ') : null
  }

  const names = prereq.skillIds.map(skillDisplayName)
  return formatNameList(names, prereq.gate)
}

export function formatSkillPrerequisiteSummary(
  prereq: SkillPrerequisite | undefined,
): string | null {
  if (!prereq) return null
  const segment = formatPrerequisiteSegment(prereq)
  return segment ? `Requires ${segment}` : null
}

let incomingCatalogSynergyIndex: Map<string, SkillSynergyHint[]> | null = null

function catalogIncomingSynergyIndex(): Map<string, SkillSynergyHint[]> {
  if (incomingCatalogSynergyIndex) return incomingCatalogSynergyIndex

  const map = new Map<string, SkillSynergyHint[]>()
  for (const entry of PALLADIUM_SKILL_CATALOG) {
    const synergies = (
      entry as {
        synergies?: Array<{ skillId?: string; bonusPercent?: number }>
      }
    ).synergies
    for (const row of synergies ?? []) {
      const targetId = row.skillId
      const bonus = row.bonusPercent
      if (typeof targetId !== 'string' || typeof bonus !== 'number' || bonus === 0) {
        continue
      }
      const list = map.get(targetId) ?? []
      list.push({
        direction: 'incoming',
        sourceSkillId: entry.id,
        sourceName: entry.name,
        targetSkillId: targetId,
        targetName: skillDisplayName(targetId),
        bonusPercent: bonus,
      })
      map.set(targetId, list)
    }
  }

  incomingCatalogSynergyIndex = map
  return map
}

let incomingConditionalSynergyIndex: Map<string, SkillSynergyHint[]> | null = null

function conditionalIncomingSynergyIndex(): Map<string, SkillSynergyHint[]> {
  if (incomingConditionalSynergyIndex) return incomingConditionalSynergyIndex

  const map = new Map<string, SkillSynergyHint[]>()
  for (const entry of PALLADIUM_SKILL_CATALOG) {
    const rules = (
      entry as {
        conditionalRelatedSkills?: Array<{
          skillId?: string
          bonusIfAlreadyHave?: { skillPercentBonus?: number }
        }>
      }
    ).conditionalRelatedSkills
    for (const rule of rules ?? []) {
      const bonus = rule.bonusIfAlreadyHave?.skillPercentBonus
      const targetId = rule.skillId
      if (typeof targetId !== 'string' || typeof bonus !== 'number' || bonus === 0) {
        continue
      }
      const list = map.get(targetId) ?? []
      list.push({
        direction: 'incoming',
        sourceSkillId: entry.id,
        sourceName: entry.name,
        targetSkillId: targetId,
        targetName: skillDisplayName(targetId),
        bonusPercent: bonus,
      })
      map.set(targetId, list)
    }
  }

  incomingConditionalSynergyIndex = map
  return map
}

export function filterSkillSynergyHintsForAvailability(
  hints: readonly SkillSynergyHint[],
  availability?: CreationSkillAvailabilityContext,
): SkillSynergyHint[] {
  if (!availability?.effectiveOcc && !availability?.raceBlocked) {
    return [...hints]
  }

  return hints.filter((hint) => {
    if (hint.direction === 'incoming') {
      return !isCreationSkillExcludedFromOccOrRace(hint.sourceSkillId, availability)
    }
    if (hint.targetSkillId) {
      return !isCreationSkillExcludedFromOccOrRace(hint.targetSkillId, availability)
    }
    return true
  })
}

/** Synergy hints for library and selected skill blocks (incoming + outgoing). */
export function listSkillSynergyHints(
  def: EngineSkillDef,
  availability?: CreationSkillAvailabilityContext,
): SkillSynergyHint[] {
  const hints: SkillSynergyHint[] = []
  const seen = new Set<string>()

  const push = (hint: SkillSynergyHint) => {
    const key = `${hint.direction}::${hint.sourceSkillId}::${hint.targetSkillId ?? ''}::${hint.bonusPercent}`
    if (seen.has(key)) return
    seen.add(key)
    hints.push(hint)
  }

  const catalog = getPalladiumSkillCatalogEntryById(def.id) as
    | {
        synergies?: Array<{
          skillId?: string
          bonusPercent?: number
        }>
      }
    | undefined

  for (const row of catalog?.synergies ?? []) {
    if (typeof row.skillId !== 'string' || typeof row.bonusPercent !== 'number') {
      continue
    }
    push({
      direction: 'outgoing',
      sourceSkillId: def.id,
      sourceName: def.name,
      targetSkillId: row.skillId,
      targetName: skillDisplayName(row.skillId),
      bonusPercent: row.bonusPercent,
    })
  }

  if (def.id === 'skill_astronomy') {
    push({
      direction: 'incoming',
      sourceSkillId: 'skill_math_advanced',
      sourceName: skillDisplayName('skill_math_advanced'),
      bonusPercent: 10,
    })
  }

  for (const hint of catalogIncomingSynergyIndex().get(def.id) ?? []) {
    push(hint)
  }

  for (const hint of conditionalIncomingSynergyIndex().get(def.id) ?? []) {
    push(hint)
  }

  return filterSkillSynergyHintsForAvailability(hints, availability)
}

export function formatSynergyHintLine(hint: SkillSynergyHint): string {
  if (hint.direction === 'outgoing' && hint.targetName) {
    return `+${hint.bonusPercent}% to ${hint.targetName}`
  }
  return `+${hint.bonusPercent}% if ${hint.sourceName} is known`
}

export function formatActiveSynergyLine(label: string, value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}% from ${label}`
}

export function skillPickRowSurfaceClass(
  tier: SkillPickDisplayTier,
  morphus: boolean,
): string {
  switch (tier) {
    case 'related':
    case 'preview_related':
      return morphus
        ? 'border-violet-600/70 bg-violet-950/35'
        : 'border-violet-300 bg-violet-50'
    case 'occ':
    case 'preview_occ':
      return morphus
        ? 'border-amber-900/60 bg-stone-800/35'
        : 'border-amber-800/40 bg-stone-100'
    case 'secondary':
    case 'preview_secondary':
      return morphus
        ? 'border-emerald-600/70 bg-emerald-950/35'
        : 'border-emerald-300 bg-emerald-50'
    default:
      return morphus
        ? 'border-violet-800 bg-slate-900'
        : 'border-slate-200 bg-slate-50'
  }
}
