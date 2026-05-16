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
} from '../utils/combatCalculator'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import type { ActiveForm } from '../types'

/** Palladium skill ids on the sheet → Hand-to-Hand catalog slugs. */
const SHEET_SKILL_TO_HTH_CATALOG: Record<string, string> = {
  hand_to_hand_basic: 'hth_basic',
}

export function mapSheetSkillIdToHandToHandCatalogId(skillId: string): string {
  return SHEET_SKILL_TO_HTH_CATALOG[skillId] ?? skillId
}

export type HandToHandCombatProfile = {
  skillId: string | null
  skillName: string | null
  accumulated: AccumulatedHandToHandBonuses
}

function emptyProfile(): HandToHandCombatProfile {
  return {
    skillId: null,
    skillName: null,
    accumulated: createEmptyAccumulatedHandToHandBonuses(),
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
    if (unlocked.has(defaultSkillId) && hasCatalog(defaultSkillId)) {
      return mapSheetSkillIdToHandToHandCatalogId(defaultSkillId)
    }
  }

  const known = [...unlocked]
    .map((id) => mapSheetSkillIdToHandToHandCatalogId(id))
    .filter((id) => catalogIds.has(id))
  if (known.length === 0) return undefined
  return known.sort()[known.length - 1]
}

export function resolveHandToHandCombatProfile(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): HandToHandCombatProfile {
  const skillId = resolveActiveHandToHandSkillId(character, activeForm, occ)
  if (!skillId) return emptyProfile()

  const skill = getHandToHandSkillById(skillId)
  if (!skill) return emptyProfile()

  return {
    skillId,
    skillName: skill.name,
    accumulated: accumulateHandToHandBonuses(skill, character.level),
  }
}

export function getHandToHandSkillForCharacter(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): HandToHandSkill | undefined {
  const id = resolveActiveHandToHandSkillId(character, activeForm, occ)
  return id ? getHandToHandSkillById(id) : undefined
}
