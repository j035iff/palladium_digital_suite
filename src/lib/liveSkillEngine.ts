import type {
  ActiveForm,
  Character,
  MorphusSurfaceType,
  SheetSkill,
} from '../types'
import { getLibraryOccById } from '../data/library/registry'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { getSkillById } from '../data/skillLibrary'
import { CREATION_SKILL_FILTER_CATEGORY_ORDER } from './creationSkillCatalog'
import {
  creationSkillIdsSet,
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import {
  resolveCreationPsychicTier,
  resolveOccSkillBonusPercent,
} from './creationPsychicSkills'
import { aggregateAllPassiveModifiers } from './featureEngine'
import {
  buildDisplayAttributesForLiveEngine,
  resolveLiveIqSkillBonus,
} from './liveStatEngine'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import { resolveOccCoreVoucherSkillBonus } from './occCoreSkillVouchers'
import { hasPhysicalTrainingProgression } from './skillCatalogProgression'
import { resolveActiveSynergyBonusLines } from './skillCreationDisplay'
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

/**
 * Joe portion buckets — tooltip order is
 * Base → IQ → OCC → Synergies → Other → Level → Temporary.
 */
export type LiveSkillPercentPortionGroup =
  | 'base'
  | 'iq'
  | 'occ'
  | 'synergy'
  | 'other'
  | 'level'
  | 'temporary'

export type LiveSkillTemporaryPercentLine = {
  label: string
  value: number
}

/**
 * Temporary skill % from abilities / status (master equation `statusModifiers`,
 * skill_selection.md §3). Live cast→skill % duration pipeline is not fully
 * wired yet (`docs/sn_abilities_selection.md`); when the runtime provides
 * named lines or a non-zero status total, surface them as Temporary portions.
 */
export function resolveLiveSkillTemporaryPercentLines(opts?: {
  statusModifiers?: number
  temporaryLines?: readonly LiveSkillTemporaryPercentLine[]
}): LiveSkillTemporaryPercentLine[] {
  if (opts?.temporaryLines?.length) {
    return opts.temporaryLines.filter((l) => l.value !== 0)
  }
  const n = opts?.statusModifiers ?? 0
  if (n === 0) return []
  return [{ label: 'Temporary', value: n }]
}

/** Inspectable source lines for the live Skills % hover tooltip. */
export type LiveSkillPercentBreakdownLine = {
  label: string
  value: number
  group: LiveSkillPercentPortionGroup
  /** Positive → green; negative → red; Base → neutral (Familiar Surface). */
  tone: 'neutral' | 'bonus' | 'penalty'
}

export function toneForLiveSkillPercentPortion(
  group: LiveSkillPercentPortionGroup,
  value: number,
): LiveSkillPercentBreakdownLine['tone'] {
  if (group === 'base') return 'neutral'
  if (value < 0) return 'penalty'
  if (value > 0) return 'bonus'
  return 'neutral'
}

function pushPortion(
  lines: LiveSkillPercentBreakdownLine[],
  group: LiveSkillPercentPortionGroup,
  label: string,
  value: number,
): void {
  if (value === 0) return
  lines.push({
    label,
    value,
    group,
    tone: toneForLiveSkillPercentPortion(group, value),
  })
}

/**
 * Bracketed source equation for % hover tooltips (plain-text / aria).
 * UI renders {@link LiveSkillPercentBreakdownLine} with green/red tones.
 */
export function formatLiveSkillPercentTooltip(
  lines: readonly LiveSkillPercentBreakdownLine[],
): string {
  return lines
    .filter((l) => l.value !== 0)
    .map((l) => `[${l.label}: ${l.value}]`)
    .join(' + ')
}

/** Owned catalog skill ids for synergy partners (sheet rows + creation picks). */
export function collectLiveOwnedSkillIds(
  character: Character,
  ownedSkills: readonly SheetSkill[],
): Set<string> {
  const related = getCreationRelatedPicks(character)
  const secondary = getCreationSecondaryPicks(character)
  const fromCreation = creationSkillIdsSet(
    character.creationOccSkillIds ?? [],
    related,
    secondary,
  )
  const ids = new Set<string>(fromCreation)
  for (const row of ownedSkills) {
    if (getPalladiumSkillCatalogEntryById(row.id)) ids.add(row.id)
    const def = getSkillById(row.id)
    if (def) ids.add(def.id)
  }
  return ids
}

/**
 * O.C.C. % bonus for a live sheet skill — same resolvers as spawn handoff
 * (`resolveOccSkillBonusPercent` / voucher core). Returns 0 when unknown.
 */
export function resolveLiveSkillOccBonusPercent(
  character: Character,
  skillId: string,
): number {
  const occ = getLibraryOccById(character.occ.id) ?? undefined
  if (!occ) return 0
  const related = getCreationRelatedPicks(character)
  const secondary = getCreationSecondaryPicks(character)
  const relatedIds = new Set(flattenCreationSkillIds(related))
  const selected = creationSkillIdsSet(
    character.creationOccSkillIds ?? [],
    related,
    secondary,
  )
  const psychicTier = resolveCreationPsychicTier(character)
  const isRelated = relatedIds.has(skillId)
  const relatedForBonus = isRelated
    ? new Set([...relatedIds, skillId])
    : relatedIds
  let occBonus = resolveOccSkillBonusPercent(
    occ,
    skillId,
    relatedForBonus,
    psychicTier,
    character.occSpecializationId,
  )
  if (
    occBonus === 0 &&
    (character.creationOccSkillIds ?? []).includes(skillId)
  ) {
    occBonus = resolveOccCoreVoucherSkillBonus(
      occ,
      character.occSpecializationId,
      skillId,
      character.creationOccCoreVoucherPicks,
      psychicTier,
    )
  }
  if (occBonus === 0 && selected.has(skillId) && !isRelated) {
    occBonus = resolveOccCoreVoucherSkillBonus(
      occ,
      character.occSpecializationId,
      skillId,
      character.creationOccCoreVoucherPicks,
      psychicTier,
    )
  }
  return occBonus
}

/**
 * List % + hover-tooltip breakdown for a percentile skill on the live Skills overlay.
 * Portion order (non-zero only): Base → IQ → OCC → Synergies → Other → Level → Temporary.
 */
export function buildLiveSkillPercentDetail(opts: {
  character: Character
  activeForm: ActiveForm
  skill: SheetSkill
  ownedSkills: readonly SheetSkill[]
  characterLevel?: number
  morphusSurfaceType?: MorphusSurfaceType
  /**
   * Optional precomputed Morphus/attr resolution — when omitted, resolved from
   * book base + OCC + synergies via {@link resolveLiveSkillPercent}.
   */
  morphusResolved?: SkillPercentBreakdown | null
  /**
   * Runtime temporary skill % (abilities / status). Feeds equation
   * `statusModifiers` and the Temporary tooltip bucket (after Level).
   */
  statusModifiers?: number
  temporaryLines?: readonly LiveSkillTemporaryPercentLine[]
}): {
  /** Closed-row % (engine total + level stair; Morphus total when usable). */
  listPercent: number
  /**
   * List-row % color: blue default; green/red when Temporary net ≠ 0
   * (Joe — Bonuses-style positive/negative).
   */
  listPercentTone: 'default' | 'bonus' | 'penalty'
  /** Net Temporary portion total (0 when none). */
  temporaryNet: number
  breakdownLines: readonly LiveSkillPercentBreakdownLine[]
  /** Plain-text hover equation for aria / fallbacks. */
  tooltipEquation: string
  /** Morphus engine total when form is Morphus and skill is usable. */
  morphusTotal: number | null
  impossibleInMorphus: boolean
} {
  const {
    character,
    activeForm,
    skill,
    ownedSkills,
    morphusSurfaceType,
  } = opts
  const level = opts.characterLevel ?? character.level
  const levelBonus = occSkillLevelBonusPercent(level)
  const catalog = catalogForSkillId(skill.id)
  const def = getSkillById(skill.id)
  const bookBase =
    def?.basePercent ??
    (typeof catalog?.basePercent === 'number' ? catalog.basePercent : 0)
  const iqBonus = resolveLiveIqSkillBonus(character, activeForm)
  const occBonus = resolveLiveSkillOccBonusPercent(character, skill.id)
  const ownedIds = collectLiveOwnedSkillIds(character, ownedSkills)
  const synergyLines = def
    ? resolveActiveSynergyBonusLines(def, ownedIds, [])
    : []
  const synergyTotal = synergyLines.reduce((s, l) => s + l.value, 0)
  const scaledAtt = def?.scaledAttBonuses ?? 0
  const temporaryLines = resolveLiveSkillTemporaryPercentLines({
    statusModifiers: opts.statusModifiers,
    temporaryLines: opts.temporaryLines,
  })
  const temporaryTotal = temporaryLines.reduce((s, l) => s + l.value, 0)

  const resolved =
    opts.morphusResolved ??
    resolveLiveSkillPercent(
      {
        id: skill.id,
        basePercent: bookBase,
        perLevel: 0,
        acquisitionLevel: 1,
        occBonus,
        synergyBonuses: synergyTotal,
        scaledAttBonuses: scaledAtt,
        statusModifiers: temporaryTotal,
      },
      character,
      activeForm,
      catalog,
      { morphusSurfaceType },
    )

  const impossibleInMorphus = Boolean(resolved.impossibleInMorphus)
  const morphusUsable =
    !impossibleInMorphus && activeForm === 'morphus' ? resolved : null

  const breakdownLines: LiveSkillPercentBreakdownLine[] = []
  pushPortion(breakdownLines, 'base', 'Base', bookBase)
  pushPortion(breakdownLines, 'iq', 'IQ', iqBonus)
  pushPortion(breakdownLines, 'occ', 'OCC', occBonus)
  for (const line of synergyLines) {
    pushPortion(breakdownLines, 'synergy', line.label, line.value)
  }
  pushPortion(breakdownLines, 'other', 'Attribute (skill)', scaledAtt)
  if (!impossibleInMorphus) {
    for (const line of resolved.lines) {
      if (line.value === 0) continue
      pushPortion(breakdownLines, 'other', line.label, line.value)
    }
  }
  pushPortion(breakdownLines, 'level', 'Level', levelBonus)
  for (const line of temporaryLines) {
    pushPortion(breakdownLines, 'temporary', line.label, line.value)
  }

  // When morphusResolved is injected without status baked in, still add Temporary.
  const resolvedIncludesTemporary =
    opts.morphusResolved == null || temporaryTotal === 0
  const stackTotal = impossibleInMorphus
    ? 0
    : resolved.total +
      levelBonus +
      (resolvedIncludesTemporary ? 0 : temporaryTotal)
  const listPercent = impossibleInMorphus
    ? 0
    : Math.min(98, Math.max(1, Math.round(stackTotal)))

  const listPercentTone: 'default' | 'bonus' | 'penalty' =
    temporaryTotal > 0 ? 'bonus' : temporaryTotal < 0 ? 'penalty' : 'default'

  return {
    listPercent,
    listPercentTone,
    temporaryNet: temporaryTotal,
    breakdownLines,
    tooltipEquation: formatLiveSkillPercentTooltip(breakdownLines),
    morphusTotal: morphusUsable ? morphusUsable.total : null,
    impossibleInMorphus,
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
