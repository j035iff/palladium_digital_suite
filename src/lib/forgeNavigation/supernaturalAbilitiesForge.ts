import type { PalladiumOcc, Race } from '../../types'
import { creationTalentsAvailable } from '../creationChromeGates'
import type { OccCreationAbilityBudget } from '../occCreationDerivation'

/** Sub-forge lane inside Tab 7 (Supernatural Abilities). */
export type SupernaturalAbilityForgeLane = 'magic' | 'psionics' | 'talents'

export const SUPERNATURAL_ABILITY_FORGE_LANES: readonly SupernaturalAbilityForgeLane[] =
  ['magic', 'psionics', 'talents'] as const

export const SUPERNATURAL_ABILITY_LANE_LABELS: Record<
  SupernaturalAbilityForgeLane,
  string
> = {
  magic: 'Magic',
  psionics: 'Psionics',
  talents: 'Talents',
}

export type SupernaturalAbilityLaneChromeOpts = {
  /** Race/OCC `talentsAvailable` OR — sole Talents chrome gate. */
  talentsAvailable?: boolean
}

/** Lanes rendered in forge chrome (Talents omitted unless talentsAvailable). */
export function visibleSupernaturalAbilityLanes(
  opts?: SupernaturalAbilityLaneChromeOpts,
): SupernaturalAbilityForgeLane[] {
  if (opts?.talentsAvailable === true) {
    return [...SUPERNATURAL_ABILITY_FORGE_LANES]
  }
  return SUPERNATURAL_ABILITY_FORGE_LANES.filter((lane) => lane !== 'talents')
}

/** Lanes the character may pick from at creation (budget > 0 per pool). */
export function allowedSupernaturalAbilityLanes(
  budget: OccCreationAbilityBudget | undefined | null,
  opts?: SupernaturalAbilityLaneChromeOpts,
): SupernaturalAbilityForgeLane[] {
  if (!budget) return []
  const lanes: SupernaturalAbilityForgeLane[] = []
  if (budget.spellSlots > 0) lanes.push('magic')
  if (budget.psionicSlots > 0) lanes.push('psionics')
  if (budget.talentSlots > 0 && opts?.talentsAvailable === true) {
    lanes.push('talents')
  }
  return lanes
}

export function supernaturalAbilityLaneBudget(
  budget: OccCreationAbilityBudget,
  lane: SupernaturalAbilityForgeLane,
): number {
  if (lane === 'magic') return budget.spellSlots
  if (lane === 'psionics') return budget.psionicSlots
  return budget.talentSlots
}

export function isSupernaturalAbilityLaneAllowed(
  budget: OccCreationAbilityBudget | undefined | null,
  lane: SupernaturalAbilityForgeLane,
  opts?: SupernaturalAbilityLaneChromeOpts,
): boolean {
  if (lane === 'talents' && opts?.talentsAvailable !== true) return false
  if (!budget) return false
  return supernaturalAbilityLaneBudget(budget, lane) > 0
}

/** Resolve chrome opts from catalog race/OCC flags. */
export function supernaturalAbilityLaneChromeOpts(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): SupernaturalAbilityLaneChromeOpts {
  return { talentsAvailable: creationTalentsAvailable(race, occ) }
}

/** Tooltip / panel copy when a forge lane is not applicable to this build. */
export function supernaturalAbilityLaneNaReason(
  lane: SupernaturalAbilityForgeLane,
  occName?: string,
): string {
  const subject = occName ? `${occName} does not grant` : 'Your O.C.C. does not grant'
  if (lane === 'magic') {
    return `${subject} spell selections at creation (no P.P.E. engine / spell budget).`
  }
  if (lane === 'psionics') {
    return `${subject} psionic power selections at creation (no I.S.P. engine / psionic budget).`
  }
  return `${subject} Nightbane talent selections at creation.`
}
