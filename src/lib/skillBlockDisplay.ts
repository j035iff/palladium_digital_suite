import type { SkillPrerequisite } from '../data/skillLibrary'
import type { EngineSkillDef } from '../data/skillLibrary'
import {
  PALLADIUM_SKILL_CATALOG,
  getPalladiumSkillCatalogEntryById,
  prerequisiteSkillIdSatisfied,
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

/** Structured prerequisite summary for Tab 4 owned/missing coloring. */
export type SkillPrerequisiteDisplayPart =
  | { kind: 'text'; text: string }
  | { kind: 'skill'; skillId: string; name: string; owned: boolean }

function skillDisplayName(skillId: string): string {
  return resolveSkillDisplayName(skillId)
}

function skillPart(
  skillId: string,
  selectedIds: ReadonlySet<string>,
): SkillPrerequisiteDisplayPart {
  return {
    kind: 'skill',
    skillId,
    name: skillDisplayName(skillId),
    owned: prerequisiteSkillIdSatisfied(skillId, selectedIds),
  }
}

function formatNameListParts(
  skillIds: readonly string[],
  gate: 'and' | 'or',
  selectedIds: ReadonlySet<string>,
): SkillPrerequisiteDisplayPart[] {
  if (skillIds.length === 0) return []
  if (skillIds.length === 1) return [skillPart(skillIds[0]!, selectedIds)]
  if (skillIds.length === 2) {
    return [
      skillPart(skillIds[0]!, selectedIds),
      { kind: 'text', text: gate === 'or' ? ' or ' : ' and ' },
      skillPart(skillIds[1]!, selectedIds),
    ]
  }
  const parts: SkillPrerequisiteDisplayPart[] = []
  for (let i = 0; i < skillIds.length; i++) {
    if (i > 0) {
      parts.push({
        kind: 'text',
        text: i === skillIds.length - 1 ? (gate === 'or' ? ', or ' : ', and ') : ', ',
      })
    }
    parts.push(skillPart(skillIds[i]!, selectedIds))
  }
  return parts
}

function appendParts(
  target: SkillPrerequisiteDisplayPart[],
  next: readonly SkillPrerequisiteDisplayPart[],
): void {
  for (const part of next) target.push(part)
}

function joinPartSegments(
  segments: readonly SkillPrerequisiteDisplayPart[][],
  separator: string,
): SkillPrerequisiteDisplayPart[] {
  const out: SkillPrerequisiteDisplayPart[] = []
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) out.push({ kind: 'text', text: separator })
    appendParts(out, segments[i]!)
  }
  return out
}

function buildPrerequisiteSegmentParts(
  prereq: SkillPrerequisite,
  selectedIds: ReadonlySet<string>,
): SkillPrerequisiteDisplayPart[] | null {
  if ('allOf' in prereq) {
    const andIds: string[] = []
    const segments: SkillPrerequisiteDisplayPart[][] = []

    for (const part of prereq.allOf) {
      if ('allOf' in part) {
        const nested = buildPrerequisiteSegmentParts(part, selectedIds)
        if (nested?.length) segments.push(nested)
        continue
      }
      if (part.gate === 'or') {
        const orParts = formatNameListParts(part.skillIds, 'or', selectedIds)
        if (orParts.length) segments.push(orParts)
      } else if (part.skillIds.length === 1) {
        andIds.push(part.skillIds[0]!)
      } else {
        andIds.push(...part.skillIds)
      }
    }

    if (andIds.length > 0) {
      segments.unshift(formatNameListParts(andIds, 'and', selectedIds))
    }

    return segments.length ? joinPartSegments(segments, '; ') : null
  }

  const parts = formatNameListParts(prereq.skillIds, prereq.gate, selectedIds)
  return parts.length ? parts : null
}

/** Owned/missing-aware prerequisite parts for Tab 4 (library + selected). */
export function buildSkillPrerequisiteDisplay(
  prereq: SkillPrerequisite | undefined,
  selectedIds: ReadonlySet<string>,
): SkillPrerequisiteDisplayPart[] | null {
  if (!prereq) return null
  const segment = buildPrerequisiteSegmentParts(prereq, selectedIds)
  if (!segment?.length) return null
  return [{ kind: 'text', text: 'Requires ' }, ...segment]
}

export function formatSkillPrerequisiteSummary(
  prereq: SkillPrerequisite | undefined,
): string | null {
  const parts = buildSkillPrerequisiteDisplay(prereq, new Set())
  if (!parts) return null
  return parts.map((part) => (part.kind === 'text' ? part.text : part.name)).join('')
}

let incomingCatalogSynergyIndex: Map<string, SkillSynergyHint[]> | null = null

function catalogIncomingSynergyIndex(): Map<string, SkillSynergyHint[]> {
  if (incomingCatalogSynergyIndex) return incomingCatalogSynergyIndex

  const map = new Map<string, SkillSynergyHint[]>()
  for (const entry of PALLADIUM_SKILL_CATALOG) {
    const synergies = (
      entry as unknown as {
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
    case 'specialization':
    case 'preview_specialization':
      return morphus
        ? 'border-sky-600/70 bg-sky-950/35'
        : 'border-sky-300 bg-sky-50'
    case 'related':
    case 'preview_related':
      return morphus
        ? 'border-violet-600/70 bg-violet-950/35'
        : 'border-violet-300 bg-violet-50'
    case 'voucher':
    case 'preview_voucher':
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
