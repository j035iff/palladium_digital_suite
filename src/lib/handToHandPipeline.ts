import type {
  AccumulatedHandToHandBonuses,
  Character,
  HandToHandSkill,
  PalladiumOcc,
} from '../types'
import { getHandToHandSkillById, listHandToHandSkillIds } from '../data/library/handToHandCatalogLoader'
import {
  accumulateHandToHandBonuses,
  createEmptyAccumulatedHandToHandBonuses,
  handToHandAttackApmCost,
} from '../utils/combatCalculator'
import { occGrantsDefaultHandToHand } from './occComposition'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import type { ActiveForm } from '../types'

/** Combat catalog tier order (fallback when multiple HtH skills are unlocked). */
const HTH_CATALOG_TIER_ORDER = [
  'hth_basic',
  'hth_expert',
  'hth_martial_arts',
  'hth_assassin',
] as const

const HAND_TO_HAND_SKILL_PREFIX = 'hand_to_hand_'

/** Baseline combat table when the character has no formal Hand-to-Hand training. */
export const HTH_NONE_CATALOG_ID = 'hth_none' as const

/**
 * Sheet / O.C.C. skill ids (`hand_to_hand_expert`) → combat catalog slugs (`hth_expert`).
 * Catalog ids and unknown ids pass through unchanged.
 */
export function mapSheetSkillIdToHandToHandCatalogId(skillId: string): string {
  if (skillId.startsWith('hth_')) return skillId
  if (skillId.startsWith(HAND_TO_HAND_SKILL_PREFIX)) {
    return `hth_${skillId.slice(HAND_TO_HAND_SKILL_PREFIX.length)}`
  }
  return skillId
}

function pickHighestHandToHandCatalogId(catalogIds: Iterable<string>): string | undefined {
  const order = HTH_CATALOG_TIER_ORDER as readonly string[]
  let best: string | undefined
  let bestRank = -1
  for (const id of catalogIds) {
    const rank = order.indexOf(id)
    if (rank > bestRank) {
      bestRank = rank
      best = id
    }
  }
  return best
}

export type HandToHandCombatProfile = {
  skillId: string | null
  skillName: string | null
  accumulated: AccumulatedHandToHandBonuses
  /** APM spent per attack maneuver (1 for trained styles unless overridden). */
  attackApmCost: number
}

function buildCombatProfile(
  skill: HandToHandSkill,
  characterLevel: number,
): HandToHandCombatProfile {
  return {
    skillId: skill.id,
    skillName: skill.name,
    accumulated: accumulateHandToHandBonuses(skill, characterLevel),
    attackApmCost: handToHandAttackApmCost(skill),
  }
}

function emptyProfile(): HandToHandCombatProfile {
  const none = getHandToHandSkillById(HTH_NONE_CATALOG_ID)
  if (none) {
    return buildCombatProfile(none, 1)
  }
  return {
    skillId: null,
    skillName: null,
    accumulated: createEmptyAccumulatedHandToHandBonuses(),
    attackApmCost: 1,
  }
}

/**
 * Active Hand-to-Hand tier: highest unlocked upgrade path, else O.C.C. default when known.
 */
export function resolveActiveHandToHandSkillId(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): string | undefined {
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  const catalogIds = new Set(listHandToHandSkillIds())

  const hasCatalog = (sheetSkillId: string) =>
    catalogIds.has(mapSheetSkillIdToHandToHandCatalogId(sheetSkillId))

  if (occ?.handToHandRules) {
    const { defaultSkillId, upgradePaths } = occ.handToHandRules
    for (let i = upgradePaths.length - 1; i >= 0; i--) {
      const target = upgradePaths[i]?.targetSkillId
      if (target && unlocked.has(target) && hasCatalog(target)) {
        return mapSheetSkillIdToHandToHandCatalogId(target)
      }
    }
    if (defaultSkillId != null && hasCatalog(defaultSkillId)) {
      const defaultGranted =
        occGrantsDefaultHandToHand(occ) || unlocked.has(defaultSkillId)
      if (defaultGranted) {
        return mapSheetSkillIdToHandToHandCatalogId(defaultSkillId)
      }
    }
  }

  const known = [...unlocked]
    .map((id) => mapSheetSkillIdToHandToHandCatalogId(id))
    .filter((id) => catalogIds.has(id))
  return pickHighestHandToHandCatalogId(known)
}

export function resolveHandToHandCombatProfile(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): HandToHandCombatProfile {
  const trainedId = resolveActiveHandToHandSkillId(character, activeForm, occ)
  const catalogId = trainedId ?? HTH_NONE_CATALOG_ID
  const skill = getHandToHandSkillById(catalogId)
  if (!skill) return emptyProfile()
  return buildCombatProfile(skill, character.level)
}

export function occRequiresHandToHandPurchase(occ: PalladiumOcc | undefined): boolean {
  if (!occ?.handToHandRules) return false
  return !occGrantsDefaultHandToHand(occ)
}

export function getHandToHandSkillForCharacter(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): HandToHandSkill | undefined {
  const id = resolveActiveHandToHandSkillId(character, activeForm, occ)
  return id ? getHandToHandSkillById(id) : undefined
}
