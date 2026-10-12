import type {
  ActiveForm,
  Character,
  MorphusSurfaceType,
  SheetSkill,
} from '../types'
import { getLibraryOccById } from '../data/library/registry'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import { getSkillById } from '../data/skillLibrary'
import { isWeaponProficiencySkill } from './skillDisplayDetails'
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
import { mapSheetSkillIdToHandToHandCatalogId } from './handToHandPipeline'
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

/**
 * Catalog sub-task / sub-skill with its own percentile column
 * (`subTasks[]` / `subSkills[]` — see palladium-skill.schema).
 */
export type LiveSkillSubPercentTrack = {
  /** Stable key within the parent (catalog `id` or slug from name). */
  trackKey: string
  name: string
  basePercent: number
  percentPerLevel: number
  description?: string
}

/** One Skills-list row (parent, `Parent (Sub)`, or stats-only Physical). */
export type LiveSkillListRow = {
  rowId: string
  skill: SheetSkill
  displayName: string
  /** When set, list % / tooltip use this sub-track’s base and %/level. */
  subPercentTrack?: LiveSkillSubPercentTrack
}

export type LiveSkillSection = {
  id: string
  label: string
  rows: LiveSkillListRow[]
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

/**
 * Canonical catalog id for a live sheet skill row.
 * Creation picks often store UUID `instanceId` on {@link SheetSkill.id}; category
 * and % math must use {@link SheetSkill.catalogSkillId} (Pillar 9).
 */
export function resolveSheetSkillCatalogId(
  skill: Pick<SheetSkill, 'id' | 'catalogSkillId'>,
): string {
  const stamped = skill.catalogSkillId?.trim()
  if (stamped) return stamped
  return skill.id
}

/**
 * Hand-to-Hand combat styles belong in the dedicated H2H control — not the
 * percentile category list (Joe 2026-10-12).
 */
export function isHandToHandSheetSkill(
  skill: Pick<SheetSkill, 'id' | 'name' | 'catalogSkillId'>,
): boolean {
  const catalogId = resolveSheetSkillCatalogId(skill)
  const mapped = mapSheetSkillIdToHandToHandCatalogId(catalogId)
  if (mapped.startsWith('hth_')) return true
  if (
    catalogId.startsWith('skill_hand_to_hand_') ||
    catalogId.startsWith('hand_to_hand_')
  ) {
    return true
  }
  return /^hand\s*to\s*hand\b/i.test(skill.name.trim())
}

/**
 * Weapon proficiencies are not percentile skills — no list % / fake d100
 * (Joe 2026-10-12; same spirit as stats-only Physical).
 */
export function isWeaponProficiencySheetSkill(
  skill: Pick<SheetSkill, 'id' | 'catalogSkillId'>,
): boolean {
  const catalogId = resolveSheetSkillCatalogId(skill)
  if (catalogId.startsWith('wp_')) return true
  if (getWeaponProficiencyCatalogEntryById(catalogId)) return true
  const def = getSkillById(catalogId)
  return def ? isWeaponProficiencySkill(def) : false
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
    const catalogId = resolveSheetSkillCatalogId(row)
    if (getPalladiumSkillCatalogEntryById(catalogId)) ids.add(catalogId)
    const def = getSkillById(catalogId)
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
   * When set (list `Parent (Sub)` row), Base and Level come from the catalog
   * sub-track — not the parent root %.
   */
  subPercentTrack?: LiveSkillSubPercentTrack | null
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
    subPercentTrack,
  } = opts
  const level = opts.characterLevel ?? character.level
  const catalogId = resolveSheetSkillCatalogId(skill)
  const catalog = catalogForSkillId(catalogId)
  const def = getSkillById(catalogId)
  const bookBase = subPercentTrack
    ? subPercentTrack.basePercent
    : (def?.basePercent ??
      (typeof catalog?.basePercent === 'number' ? catalog.basePercent : 0))
  const levelBonus = subPercentTrack
    ? Math.max(0, Math.floor(level) - 1) * subPercentTrack.percentPerLevel
    : occSkillLevelBonusPercent(level)
  const iqBonus = resolveLiveIqSkillBonus(character, activeForm)
  const occBonus = resolveLiveSkillOccBonusPercent(character, catalogId)
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
        id: catalogId,
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

function primaryBookCategory(catalogId: string): string {
  const catalog = catalogForSkillId(catalogId)
  const cat = catalog?.categories?.[0]?.trim()
  if (cat && cat.length > 0) return cat
  const def = getSkillById(catalogId)
  const bookCat = def?.bookCategories?.[0]?.trim()
  if (bookCat) return bookCat
  const legacy = def?.category?.trim()
  if (legacy && legacy !== 'Misc' && legacy !== 'Other') return legacy
  return 'Other'
}

function categorySortIndex(label: string): number {
  const idx = CREATION_SKILL_FILTER_CATEGORY_ORDER.indexOf(label)
  return idx >= 0 ? idx : CREATION_SKILL_FILTER_CATEGORY_ORDER.length
}

function slugTrackKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Percentile sub-tracks from catalog `subTasks[]` / `subSkills[]`
 * (same discovery as creation `listSubPercentLines`).
 */
export function listLiveSkillSubPercentTracks(
  catalog: PalladiumSkillCatalogEntry | undefined,
): LiveSkillSubPercentTrack[] {
  if (!catalog) return []
  const entry = catalog as PalladiumSkillCatalogEntry & {
    subTasks?: readonly {
      id?: string
      name?: string
      basePercent?: number
      percentPerLevel?: number
      description?: string
    }[]
    subSkills?: readonly {
      id?: string
      name?: string
      basePercent?: number
      percentPerLevel?: number
      description?: string
    }[]
  }
  const tracks: LiveSkillSubPercentTrack[] = []
  const push = (
    row: {
      id?: string
      name?: string
      basePercent?: number
      percentPerLevel?: number
      description?: string
    },
    fallbackKey: string,
  ) => {
    if (typeof row.basePercent !== 'number') return
    const name = row.name?.trim() || 'Sub-skill'
    tracks.push({
      trackKey: row.id?.trim() || slugTrackKey(name) || fallbackKey,
      name,
      basePercent: row.basePercent,
      percentPerLevel:
        typeof row.percentPerLevel === 'number' ? row.percentPerLevel : 5,
      description: row.description?.trim() || undefined,
    })
  }
  ;(entry.subTasks ?? []).forEach((row, i) => push(row, `sub_task_${i}`))
  ;(entry.subSkills ?? []).forEach((row, i) => push(row, `sub_skill_${i}`))
  return tracks
}

/** Parent has a scalar root % column (not only sub-tracks / split maps). */
export function hasLiveSkillRootScalarPercent(
  catalog: PalladiumSkillCatalogEntry | undefined,
  catalogId: string,
): boolean {
  if (typeof catalog?.basePercent === 'number') return true
  const def = getSkillById(catalogId)
  return typeof def?.basePercent === 'number' && def.basePercent > 0
}

/**
 * Attribute / combat training side present on the catalog row
 * (`physicalSkillBonuses` or related training markers).
 */
export function hasLiveSkillPhysicalBonusSide(
  catalog: PalladiumSkillCatalogEntry | undefined,
): boolean {
  if (!catalog) return false
  const entry = catalog as PalladiumSkillCatalogEntry & {
    physicalSkillBonuses?: unknown
    naturalRollOutcomes?: readonly unknown[] | null
    mechanicProgressions?: readonly unknown[] | null
  }
  return (
    entry.physicalSkillBonuses != null ||
    (entry.naturalRollOutcomes?.length ?? 0) > 0 ||
    (entry.mechanicProgressions?.length ?? 0) > 0
  )
}

export function formatLiveSkillSubRowDisplayName(
  parentName: string,
  subName: string,
): string {
  return `${parentName} (${subName})`
}

function makeParentListRow(skill: SheetSkill): LiveSkillListRow {
  return {
    rowId: skill.id,
    skill,
    displayName: skill.name,
  }
}

function makeSubListRow(
  skill: SheetSkill,
  track: LiveSkillSubPercentTrack,
): LiveSkillListRow {
  return {
    rowId: `${skill.id}::${track.trackKey}`,
    skill,
    displayName: formatLiveSkillSubRowDisplayName(skill.name, track.name),
    subPercentTrack: track,
  }
}

/**
 * Live Skills tab sections: book categories in creation filter order, with
 * stats-only physical training pinned at the bottom.
 * Sub-% tracks (`subTasks` / `subSkills`) expand to `Parent (Sub)` rows.
 * Dual-nature skills (sub-% + physical bonuses) also appear in bottom Physical.
 * Hand-to-Hand styles are omitted (dedicated H2H control at top of Skills).
 */
export function buildLiveSkillSections(
  skills: readonly SheetSkill[],
): LiveSkillSection[] {
  const byCategory = new Map<string, LiveSkillListRow[]>()
  const statsOnly: LiveSkillListRow[] = []

  for (const skill of skills) {
    if (isHandToHandSheetSkill(skill)) continue
    const catalogId = resolveSheetSkillCatalogId(skill)
    const catalog = catalogForSkillId(catalogId)
    const subTracks = listLiveSkillSubPercentTracks(catalog)
    const pureStatsOnly = Boolean(
      catalog && hasPhysicalTrainingProgression(catalog),
    )
    const dualPhysAndSub =
      subTracks.length > 0 && hasLiveSkillPhysicalBonusSide(catalog)

    if (pureStatsOnly || dualPhysAndSub) {
      statsOnly.push(makeParentListRow(skill))
    }

    if (pureStatsOnly && subTracks.length === 0) {
      continue
    }

    const label = primaryBookCategory(catalogId)
    const bucket = byCategory.get(label) ?? []
    const hasRoot = hasLiveSkillRootScalarPercent(catalog, catalogId)

    if (subTracks.length > 0) {
      if (hasRoot) {
        bucket.push(makeParentListRow(skill))
      }
      for (const track of subTracks) {
        bucket.push(makeSubListRow(skill, track))
      }
    } else if (!pureStatsOnly) {
      bucket.push(makeParentListRow(skill))
    }

    if (bucket.length > 0) byCategory.set(label, bucket)
  }

  const sortByName = (a: LiveSkillListRow, b: LiveSkillListRow) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: 'base',
    })

  const sections: LiveSkillSection[] = [...byCategory.entries()]
    .map(([label, rows]) => ({
      id: label,
      label,
      rows: [...rows].sort(sortByName),
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
      rows: [...statsOnly].sort(sortByName),
      statsOnlyPhysical: true,
    })
  }

  return sections
}

/** Familiar Surface — category dropdown “All” value. */
export const LIVE_SKILL_FILTER_ALL_CATEGORIES = 'all'

export type LiveSkillListFilter = {
  /** Section label (e.g. Communications) or {@link LIVE_SKILL_FILTER_ALL_CATEGORIES}. */
  category?: string | null
  /** Case-insensitive substring match on skill display name. */
  nameQuery?: string | null
}

/**
 * Category dropdown options from the character’s current sections
 * (unique labels in list order) plus All.
 */
export function listLiveSkillFilterCategoryOptions(
  sections: readonly LiveSkillSection[],
): readonly { value: string; label: string }[] {
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = [
    { value: LIVE_SKILL_FILTER_ALL_CATEGORIES, label: 'All categories' },
  ]
  for (const section of sections) {
    if (seen.has(section.label)) continue
    seen.add(section.label)
    options.push({ value: section.label, label: section.label })
  }
  return options
}

/**
 * Filter live Skills sections by category label and/or name query (AND when both set).
 * Empty sections are dropped; H2H is already excluded from {@link buildLiveSkillSections}.
 */
export function filterLiveSkillSections(
  sections: readonly LiveSkillSection[],
  filter: LiveSkillListFilter = {},
): LiveSkillSection[] {
  const category = filter.category?.trim() || LIVE_SKILL_FILTER_ALL_CATEGORIES
  const query = filter.nameQuery?.trim().toLowerCase() ?? ''

  return sections
    .filter(
      (section) =>
        category === LIVE_SKILL_FILTER_ALL_CATEGORIES ||
        section.label === category,
    )
    .map((section) => {
      if (!query) return section
      const rows = section.rows.filter((row) =>
        row.displayName.toLowerCase().includes(query),
      )
      if (rows.length === section.rows.length) return section
      return { ...section, rows }
    })
    .filter((section) => section.rows.length > 0)
}
