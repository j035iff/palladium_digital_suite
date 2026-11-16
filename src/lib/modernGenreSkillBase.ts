/**
 * Modern-genre default skill base (Pillar 9 Unified Path).
 *
 * Nightbane (and future HU / BTS / Dead Reign) PCs always own:
 * - Language Native — flat 98%
 * - Literacy Native — +30% (skill_literacy; prereq ownership for Computer Operation etc.)
 * - Math: Basic — +10%
 *
 * Literacy / Math OCC bonusPercent stacks on top of this base (do not replace).
 */

import modernBaseDoc from '../data/content/skills/utils/modern_genre_default_skill_base.json'
import { genreUsesModernDefaultSkillBase } from '../data/genres'
import type { PalladiumOcc } from '../types'
import {
  isOccCoreSkillGrant,
  resolveEffectivePalladiumOcc,
} from './occComposition'
import { occStartingOccSkillIds } from './occCatalogEngine'

export type ModernGenreDefaultSkillRow = {
  skillId: string
  role: string
  flatBasePercent?: number
  bonusPercent: number
  notes?: string
}

const ROWS = (modernBaseDoc as { skills: readonly ModernGenreDefaultSkillRow[] })
  .skills

export function listModernGenreDefaultSkillRows(): readonly ModernGenreDefaultSkillRow[] {
  return ROWS
}

export function modernGenreDefaultSkillIds(): readonly string[] {
  return ROWS.map((r) => r.skillId)
}

export function modernGenreDefaultSkillRow(
  skillId: string,
): ModernGenreDefaultSkillRow | undefined {
  return ROWS.find((r) => r.skillId === skillId)
}

export function shouldApplyModernGenreDefaultSkillBase(
  genreId: string | null | undefined,
): boolean {
  return genreUsesModernDefaultSkillBase(genreId)
}

/** Additive educational bonus from the modern base (0 when genre does not use it). */
export function modernGenreDefaultBonusPercent(
  genreId: string | null | undefined,
  skillId: string,
): number {
  if (!shouldApplyModernGenreDefaultSkillBase(genreId)) return 0
  return modernGenreDefaultSkillRow(skillId)?.bonusPercent ?? 0
}

/**
 * Flat skill base % override (Language Native → 98).
 * Prefer an explicit OCC grant `basePercent` when present.
 */
export function resolveSkillEquationBasePercent(
  skillId: string,
  catalogBasePercent: number,
  opts: {
    genreId?: string | null
    occ?: PalladiumOcc
    specializationId?: string | null
  } = {},
): number {
  const occBase = occCoreGrantBasePercent(
    opts.occ,
    skillId,
    opts.specializationId,
  )
  if (occBase != null) return occBase
  if (shouldApplyModernGenreDefaultSkillBase(opts.genreId)) {
    const flat = modernGenreDefaultSkillRow(skillId)?.flatBasePercent
    if (flat != null) return flat
  }
  return catalogBasePercent
}

function occCoreGrantBasePercent(
  occ: PalladiumOcc | undefined,
  skillId: string,
  specializationId?: string | null,
): number | undefined {
  if (!occ) return undefined
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  for (const entry of effective.occSkillsCore) {
    if (isOccCoreSkillGrant(entry) && entry.skillId === skillId) {
      return entry.basePercent
    }
  }
  return undefined
}

/** Fixed OCC grants ∪ modern-base skill ids (deduped, OCC order then base-only ids). */
export function listEffectiveOccCoreGrantSkillIds(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  genreId: string | null | undefined,
): string[] {
  const occIds = occ ? occStartingOccSkillIds(occ, specializationId) : []
  if (!shouldApplyModernGenreDefaultSkillBase(genreId)) return [...occIds]
  const seen = new Set(occIds)
  const merged = [...occIds]
  for (const id of modernGenreDefaultSkillIds()) {
    if (!seen.has(id)) {
      seen.add(id)
      merged.push(id)
    }
  }
  return merged
}

/**
 * Book OCC raw bonus + modern-base Literacy/Math bonuses (before psychic tier tax).
 * Language native uses flat base % — modern bonusPercent is 0 for that row.
 */
export function stackModernGenreEducationalBonus(
  genreId: string | null | undefined,
  skillId: string,
  occRawBonus: number,
): number {
  return occRawBonus + modernGenreDefaultBonusPercent(genreId, skillId)
}
