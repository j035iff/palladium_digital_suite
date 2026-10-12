import type {
  ActiveForm,
  Character,
  MorphusSurfaceType,
  SheetSkill,
} from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { CREATION_SKILL_FILTER_CATEGORY_ORDER } from './creationSkillCatalog'
import { aggregateAllPassiveModifiers } from './featureEngine'
import {
  buildDisplayAttributesForLiveEngine,
  resolveLiveIqSkillBonus,
} from './liveStatEngine'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import { hasPhysicalTrainingProgression } from './skillCatalogProgression'
import type { SkillPercentAttributeScores } from './skillPercentAttributeModifiers'
import { type SkillEquationSkill } from './skillEquation'
import {
  resolveSkillPercent,
  type SkillPercentBreakdown,
  type SkillPercentResolutionContext,
} from './skillPercentResolution'

export type { SkillPercentBreakdown, SkillPercentResolutionContext }

/** Internal id for the bottom stats-only Physical bucket (label is book "Physical"). */
export const LIVE_SKILL_STATS_ONLY_PHYSICAL_SECTION_ID = 'physical_stats_only'

/** Joe / Familiar Surface — book category name for stats-only physical training. */
export const LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL = 'Physical'

export type LiveSkillSection = {
  id: string
  label: string
  skills: SheetSkill[]
  /** Stats-only physical training (no self %) — pinned last on the Skills tab. */
  statsOnlyPhysical?: boolean
}

export type LiveSkillContext = SkillPercentResolutionContext & {
  iqBonus: number
  attributeScores: SkillPercentAttributeScores
}

export type LiveSkillRollTarget = {
  target: number
  base: number
  levelBonus: number
  iqBonus: number
}

/** Inspectable source lines for the live Skills % hover tooltip. */
export type LiveSkillPercentBreakdownLine = {
  label: string
  value: number
}

/**
 * Bracketed source equation for % hover tooltips (same shape as weapon/stat
 * breakdowns — e.g. `[Base: 35] + [IQ: 5] + [Level: 10]`).
 */
export function formatLiveSkillPercentTooltip(
  lines: readonly LiveSkillPercentBreakdownLine[],
): string {
  const parts = lines
    .filter((l) => l.label === 'Base' || l.value !== 0)
    .map((l) => `[${l.label}: ${l.value}]`)
  return parts.join(' + ')
}

/**
 * List % + hover-tooltip breakdown for a percentile skill on the live Skills overlay.
 * Uses {@link resolveLiveSkillRollTarget} components; Morphus total when provided.
 * OCC is not a separate sheet field today — spawn bakes it into Base when present.
 */
export function buildLiveSkillPercentDetail(opts: {
  rollTarget: LiveSkillRollTarget
  morphusResolved?: SkillPercentBreakdown | null
}): {
  /** Closed-row % (Morphus total when usable in Morphus; else quick-roll target). */
  listPercent: number
  breakdownLines: readonly LiveSkillPercentBreakdownLine[]
  /** Hover tooltip equation (`[Base: n] + [IQ: n] + …`). */
  tooltipEquation: string
  /** Morphus engine total when form is Morphus and skill is usable. */
  morphusTotal: number | null
} {
  const { rollTarget, morphusResolved } = opts
  const morphusUsable =
    morphusResolved && !morphusResolved.impossibleInMorphus
      ? morphusResolved
      : null
  const breakdownLines: LiveSkillPercentBreakdownLine[] = [
    { label: 'Base', value: rollTarget.base },
    { label: 'IQ', value: rollTarget.iqBonus },
    { label: 'Level', value: rollTarget.levelBonus },
  ]
  if (morphusUsable) {
    for (const line of morphusUsable.lines) {
      if (line.value === 0 && !/grant floor/i.test(line.label)) continue
      breakdownLines.push({ label: line.label, value: line.value })
    }
  }
  return {
    listPercent: morphusUsable ? morphusUsable.total : rollTarget.target,
    breakdownLines,
    tooltipEquation: formatLiveSkillPercentTooltip(breakdownLines),
    morphusTotal: morphusUsable ? morphusUsable.total : null,
  }
}

function catalogForSkillId(skillId: string): PalladiumSkillCatalogEntry | undefined {
  return getPalladiumSkillCatalogEntryById(skillId)
}

/** +5% per character level after 1st (quick-roll shortcut until full level tables wire). */
export function occSkillLevelBonusPercent(level: number): number {
  const lv = Math.max(1, Math.floor(level))
  return Math.max(0, lv - 1) * 5
}

const DEFAULT_SKILL_BASE = 28

/**
 * Unified live/creation skill % context: display I.Q. via stat engine,
 * Morphus traits, and catalog attribute modifiers.
 */
export function buildLiveSkillContext(
  character: Pick<
    Character,
    | 'level'
    | 'primary'
    | 'morphus'
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
  >,
  activeForm: ActiveForm,
  opts?: { morphusSurfaceType?: MorphusSurfaceType },
): LiveSkillContext {
  const fullCharacter = character as Character
  const passive = aggregateAllPassiveModifiers(fullCharacter, activeForm)
  const displayAttrs = buildDisplayAttributesForLiveEngine(
    fullCharacter,
    activeForm,
    passive,
  )
  const iqBonus = resolveLiveIqSkillBonus(fullCharacter, activeForm)
  const attributeScores: SkillPercentAttributeScores = {
    iq: displayAttrs.iq,
    me: displayAttrs.me,
    ma: displayAttrs.ma,
    ps: displayAttrs.ps.score,
    pp: displayAttrs.pp,
    pe: displayAttrs.pe,
    pb: displayAttrs.pb,
    spd: displayAttrs.spd,
  }

  return {
    characterLevel: character.level,
    iqBonus,
    activeForm,
    primaryPp: character.primary.attributes.pp,
    morphusSurfaceType: opts?.morphusSurfaceType ?? 'hard_flat',
    activeMorphusCharacteristics: resolveActiveMorphusTraits(fullCharacter),
    attributeScores,
  }
}

/** Master equation + catalog attribute modifiers + Morphus skill modifiers. */
export function resolveLiveSkillPercent(
  skill: SkillEquationSkill & { id: string },
  character: Pick<
    Character,
    | 'level'
    | 'primary'
    | 'morphus'
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
  >,
  activeForm: ActiveForm,
  catalogEntry?: PalladiumSkillCatalogEntry,
  opts?: { morphusSurfaceType?: MorphusSurfaceType },
): SkillPercentBreakdown {
  const ctx = buildLiveSkillContext(character, activeForm, opts)
  return resolveSkillPercent(
    skill,
    ctx,
    catalogEntry ?? catalogForSkillId(skill.id),
  )
}

/**
 * Quick d100 target (Pillar 3 — speed): stored base % + level stair + I.Q. via stat engine.
 * Sheet `basePercent` is the spawn-resolved total; level bonus is the +5%/level shortcut.
 */
export function resolveLiveSkillRollTarget(opts: {
  character: Character
  activeForm: ActiveForm
  skillBasePercent?: number
  characterLevel?: number
}): LiveSkillRollTarget {
  const level = opts.characterLevel ?? opts.character.level
  const base = Math.max(
    0,
    Math.round(opts.skillBasePercent ?? DEFAULT_SKILL_BASE),
  )
  const levelBonus = occSkillLevelBonusPercent(level)
  const iqBonus = resolveLiveIqSkillBonus(opts.character, opts.activeForm)
  const target = Math.min(98, Math.max(1, base + levelBonus + iqBonus))
  return { target, base, levelBonus, iqBonus }
}

function primaryBookCategory(
  catalog: PalladiumSkillCatalogEntry | undefined,
): string {
  const cat = catalog?.categories?.[0]?.trim()
  return cat && cat.length > 0 ? cat : 'Other'
}

function categorySortIndex(label: string): number {
  const idx = CREATION_SKILL_FILTER_CATEGORY_ORDER.indexOf(label)
  return idx >= 0 ? idx : CREATION_SKILL_FILTER_CATEGORY_ORDER.length
}

/**
 * Live Skills tab sections: book categories in creation filter order, with
 * stats-only physical training (`hasPhysicalTrainingProgression`) pulled into
 * their own **Physical** section pinned at the bottom.
 */
export function buildLiveSkillSections(
  skills: readonly SheetSkill[],
): LiveSkillSection[] {
  const byCategory = new Map<string, SheetSkill[]>()
  const statsOnly: SheetSkill[] = []

  for (const skill of skills) {
    const catalog = catalogForSkillId(skill.id)
    if (catalog && hasPhysicalTrainingProgression(catalog)) {
      statsOnly.push(skill)
      continue
    }
    const label = primaryBookCategory(catalog)
    const bucket = byCategory.get(label) ?? []
    bucket.push(skill)
    byCategory.set(label, bucket)
  }

  const sortByName = (a: SheetSkill, b: SheetSkill) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

  const sections: LiveSkillSection[] = [...byCategory.entries()]
    .map(([label, rows]) => ({
      id: label,
      label,
      skills: [...rows].sort(sortByName),
    }))
    .sort((a, b) => {
      const ai = categorySortIndex(a.label)
      const bi = categorySortIndex(b.label)
      if (ai !== bi) return ai - bi
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    })

  if (statsOnly.length > 0) {
    sections.push({
      id: LIVE_SKILL_STATS_ONLY_PHYSICAL_SECTION_ID,
      label: LIVE_SKILL_STATS_ONLY_PHYSICAL_LABEL,
      skills: [...statsOnly].sort(sortByName),
      statsOnlyPhysical: true,
    })
  }

  return sections
}
