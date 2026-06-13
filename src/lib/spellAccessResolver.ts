import { getFeatureById, listPalladiumMagicForGameSystem } from '../data/library/registry'
import type { Feature, OccSupernaturalProgressionStep, PalladiumMagicSpell, PalladiumOcc, SpellCaveat } from '../types'
import { magicSchoolFilterLabel } from './magicSchoolLabels'
import { magicSchoolForFeature, normalizeMagicSchool, occMagicSchools, spellLevelForFeature } from './magicSchool'
import {
  nativeSupersededBorrowedIds,
  occSpellAccessRules,
  resolveSpellAccessMatch,
  type SpellAccessPath,
} from './spellAccessPath'

export type { SpellAccessMatch, SpellAccessPath } from './spellAccessPath'

export type SpellOccAccess = {
  spell: PalladiumMagicSpell
  accessPath: SpellAccessPath
  canonicalSchool: string
  displayLabel: string
  matchedRuleLabel?: string
  crossListId?: string
  caveats: readonly SpellCaveat[]
  pickGate: { allowed: boolean; reason?: string }
}

export type ResolveSpellsForOccOptions = {
  gameSystem: string
  characterLevel?: number
  spellCap: number
  genreId?: string | null
}

function flattenSpellRestrictions(
  roadmap: readonly OccSupernaturalProgressionStep[] | undefined,
  maxLevel: number,
): string[] {
  if (!roadmap?.length) return []
  const out: string[] = []
  for (const step of roadmap) {
    if (step.level > maxLevel) continue
    for (const r of step.categoryRestrictions ?? []) {
      if (r.trim()) out.push(r.trim())
    }
  }
  return [...new Set(out)]
}

function maxSpellLevelFromRestriction(restriction: string): number | undefined {
  const match = restriction.match(/level\s+(\d+)/i)
  if (!match) return undefined
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : undefined
}

function restrictionMatches(
  restriction: string,
  ctx: {
    level?: number
    school?: string
    structuredSchoolGate?: boolean
  },
): boolean {
  const r = restriction.toLowerCase()
  const maxSpellLevel = maxSpellLevelFromRestriction(restriction)
  if (maxSpellLevel != null && (ctx.level == null || ctx.level > maxSpellLevel)) {
    return false
  }
  if (
    !ctx.structuredSchoolGate &&
    r.includes('necromancy') &&
    ctx.school?.toLowerCase() !== 'necromancy'
  ) {
    return false
  }
  return true
}

/** Level cap and roadmap restrictions for spell picks (access path already granted). */
export function evaluateSpellPickGate(
  occ: PalladiumOcc,
  feature: Feature,
  spellCap: number,
  maxRoadmapLevel = 1,
): { allowed: boolean; reason?: string } {
  const level = spellLevelForFeature(feature)
  const school = magicSchoolForFeature(feature)
  const structuredSchoolGate = (occ.ppeEngine?.magicSchools?.length ?? 0) > 0

  if (level != null && level > spellCap) {
    return {
      allowed: false,
      reason: `Spell level ${level} exceeds O.C.C. spell strength cap (${spellCap}).`,
    }
  }

  for (const r of flattenSpellRestrictions(occ.ppeEngine?.progressionRoadmap, maxRoadmapLevel)) {
    if (!restrictionMatches(r, { level, school, structuredSchoolGate })) {
      return { allowed: false, reason: r }
    }
  }

  return { allowed: true }
}

export function spellAccessDisplayLabel(
  accessPath: SpellAccessPath,
  school: string,
  genreId: string,
): string {
  const schoolLabel = magicSchoolFilterLabel(genreId, school)
  return accessPath === 'borrowed' ? `${schoolLabel} · Borrowed` : schoolLabel
}

export function browseMagicSchoolsForOcc(
  genreId: string,
  occ: PalladiumOcc | undefined,
  allSchools: readonly string[],
): string[] {
  if (!occ) return [...allSchools]
  const native = occMagicSchools(occ)
  const borrowed = occSpellAccessRules(occ).map((r) => normalizeMagicSchool(r.school))
  const merged = [...new Set([...native, ...borrowed])]
  if (merged.length === 0) return [...allSchools]
  return allSchools.filter((school) => merged.includes(school))
}

function evaluatePickGate(
  occ: PalladiumOcc,
  spell: PalladiumMagicSpell,
  options: ResolveSpellsForOccOptions,
): { allowed: boolean; reason?: string } {
  const feature = getFeatureById(spell.id)
  if (!feature) return { allowed: false, reason: 'Spell not registered in feature catalog.' }
  return evaluateSpellPickGate(
    occ,
    feature,
    options.spellCap,
    options.characterLevel ?? 1,
  )
}

/**
 * All spells this O.C.C. may ever learn (native + borrowed). Spells with no access path are
 * omitted — intentional Radical Visibility exception for out-of-discipline catalog noise.
 */
export function resolveSpellsForOcc(
  occ: PalladiumOcc,
  options: ResolveSpellsForOccOptions,
): SpellOccAccess[] {
  const gameSystem = options.gameSystem.toLowerCase()
  const catalog = listPalladiumMagicForGameSystem(gameSystem)
  const superseded = nativeSupersededBorrowedIds(occ, catalog)
  const out: SpellOccAccess[] = []

  for (const spell of catalog) {
    const match = resolveSpellAccessMatch(occ, spell, { supersededBorrowedIds: superseded })
    if (!match) continue

    const displayLabel = spellAccessDisplayLabel(
      match.accessPath,
      spell.school,
      gameSystem,
    )

    out.push({
      spell,
      accessPath: match.accessPath,
      canonicalSchool: spell.school,
      displayLabel,
      matchedRuleLabel: match.matchedRule?.label,
      crossListId: match.crossListId,
      caveats: match.caveats,
      pickGate: evaluatePickGate(occ, spell, options),
    })
  }

  return out.sort(
    (a, b) =>
      a.spell.spellLevel - b.spell.spellLevel ||
      a.spell.name.localeCompare(b.spell.name),
  )
}

export function resolveSpellOccAccessById(
  occ: PalladiumOcc,
  spellId: string,
  options: ResolveSpellsForOccOptions,
): SpellOccAccess | undefined {
  return resolveSpellsForOcc(occ, options).find((row) => row.spell.id === spellId)
}

/** Schools represented in an O.C.C.'s resolved spell list (for forge tabs). */
export function resolvedSpellSchoolTabs(
  rows: readonly SpellOccAccess[],
): string[] {
  return [...new Set(rows.map((row) => row.canonicalSchool))].sort()
}

export function formatSpellCaveatLine(caveats: readonly SpellCaveat[]): string {
  if (!caveats.length) return ''
  return caveats.map((c) => c.summary).join(' · ')
}

export { occSpellAccessRules, spellAccessibleToOcc, resolveSpellAccessMatch } from './spellAccessPath'
