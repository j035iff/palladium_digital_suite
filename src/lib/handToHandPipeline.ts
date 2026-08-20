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
import {
  effectiveCreationHandToHandTier,
  handToHandCatalogIdForCreationTier,
  type CreationHandToHandTier,
} from './creationHandToHandChoice'
import { NIGHTBANE_MORPHUS_BASE_PROFILE } from './morphusNightbaneBase'
import { characterHasDualForms } from './raceFormPolicy'
import { hasPairedWeaponSupportWp } from './pairedWeaponSupport'
import type { ActiveForm } from '../types'

/** Combat catalog tier order (fallback when multiple HtH skills are unlocked). */
const HTH_CATALOG_TIER_ORDER = [
  'hth_basic',
  'hth_expert',
  'hth_martial_arts',
  'hth_assassin',
] as const

const HAND_TO_HAND_SKILL_PREFIX = 'skill_hand_to_hand_'
const LEGACY_HAND_TO_HAND_SKILL_PREFIX = 'hand_to_hand_'

/** Baseline combat table when the character has no formal Hand-to-Hand training. */
export const HTH_NONE_CATALOG_ID = 'hth_none' as const

/**
 * Sheet / O.C.C. skill ids (`skill_hand_to_hand_expert`) → combat catalog slugs (`hth_expert`).
 * Catalog ids and unknown ids pass through unchanged.
 */
export function mapSheetSkillIdToHandToHandCatalogId(skillId: string): string {
  if (skillId.startsWith('hth_')) return skillId
  if (skillId.startsWith(HAND_TO_HAND_SKILL_PREFIX)) {
    return `hth_${skillId.slice(HAND_TO_HAND_SKILL_PREFIX.length)}`
  }
  if (skillId.startsWith(LEGACY_HAND_TO_HAND_SKILL_PREFIX)) {
    return `hth_${skillId.slice(LEGACY_HAND_TO_HAND_SKILL_PREFIX.length)}`
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

function applyPairedWeaponSupportGate(
  accumulated: AccumulatedHandToHandBonuses,
  character: Character,
  activeForm: ActiveForm,
): AccumulatedHandToHandBonuses {
  if (!accumulated.pairedWeapons) return accumulated
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  if (hasPairedWeaponSupportWp(unlocked)) return accumulated
  return { ...accumulated, pairedWeapons: false }
}

function buildCombatProfile(
  skill: HandToHandSkill,
  character: Character,
  activeForm: ActiveForm,
): HandToHandCombatProfile {
  const accumulated = applyPairedWeaponSupportGate(
    accumulateHandToHandBonuses(skill, character.level),
    character,
    activeForm,
  )
  return {
    skillId: skill.id,
    skillName: skill.name,
    accumulated,
    attackApmCost: handToHandAttackApmCost(skill),
  }
}

function emptyProfile(
  character: Character,
  activeForm: ActiveForm,
): HandToHandCombatProfile {
  const none = getHandToHandSkillById(HTH_NONE_CATALOG_ID)
  if (none) {
    return buildCombatProfile(none, character, activeForm)
  }
  return {
    skillId: null,
    skillName: null,
    accumulated: createEmptyAccumulatedHandToHandBonuses(),
    attackApmCost: 1,
  }
}

function unlockedHandToHandCatalogIds(
  unlocked: ReadonlySet<string>,
  catalogIds: ReadonlySet<string>,
): string[] {
  return [...unlocked]
    .map((id) => mapSheetSkillIdToHandToHandCatalogId(id))
    .filter((id) => catalogIds.has(id) && id !== HTH_NONE_CATALOG_ID)
}

function hasUnlockedHandToHandTarget(
  unlocked: ReadonlySet<string>,
  targetSkillId: string,
): boolean {
  const targetCatalog = mapSheetSkillIdToHandToHandCatalogId(targetSkillId)
  for (const id of unlocked) {
    if (mapSheetSkillIdToHandToHandCatalogId(id) === targetCatalog) return true
  }
  return false
}

/** Nightbane Morphus uses R.C.C. innate Hand-to-Hand — not Facade O.C.C. picks. */
function usesMorphusInnateHandToHand(
  character: Character,
  activeForm: ActiveForm,
): boolean {
  return characterHasDualForms(character) && activeForm === 'morphus'
}

function morphusInnateHandToHandTier(): CreationHandToHandTier {
  return NIGHTBANE_MORPHUS_BASE_PROFILE.handToHandMorphus as CreationHandToHandTier
}

function morphusInnateHandToHandCatalogId(): string {
  return handToHandCatalogIdForCreationTier(morphusInnateHandToHandTier())
}

/** Same tier source as creation Skill Engine / Morphus ledger — not raw save fields alone. */
function combatHandToHandTier(
  character: Character,
  occ: PalladiumOcc | undefined,
  activeForm: ActiveForm,
) {
  if (usesMorphusInnateHandToHand(character, activeForm)) {
    return morphusInnateHandToHandTier()
  }
  return effectiveCreationHandToHandTier(character, occ)
}

export type OwnedHandToHandStyle = {
  catalogId: string
  name: string
}

function sortOwnedHandToHandIds(ids: Iterable<string>): string[] {
  const order = HTH_CATALOG_TIER_ORDER as readonly string[]
  const unique = [...new Set(ids)]
  return unique.sort((a, b) => {
    if (a === HTH_NONE_CATALOG_ID) return 1
    if (b === HTH_NONE_CATALOG_ID) return -1
    const ra = order.indexOf(a)
    const rb = order.indexOf(b)
    if (ra >= 0 && rb >= 0) return ra - rb
    if (ra >= 0) return -1
    if (rb >= 0) return 1
    return a.localeCompare(b)
  })
}

/**
 * Hand-to-Hand styles this form actually has — unlocked sheet/HTH skill ids, creation tier,
 * and a granted O.C.C. default. `hth_none` is listed only when no trained style is owned.
 * Same list feeds Combat Home Unarmed expand and the Skills tab roster.
 */
export function listOwnedHandToHandStyles(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): OwnedHandToHandStyle[] {
  if (usesMorphusInnateHandToHand(character, activeForm)) {
    const catalogId = morphusInnateHandToHandCatalogId()
    const row = getHandToHandSkillById(catalogId)
    return [{ catalogId, name: row?.name ?? catalogId }]
  }

  const catalogIds = new Set(listHandToHandSkillIds())
  const owned = new Set<string>()

  const add = (raw: string | null | undefined) => {
    if (!raw) return
    const mapped = mapSheetSkillIdToHandToHandCatalogId(raw)
    if (catalogIds.has(mapped)) owned.add(mapped)
  }

  for (const id of collectUnlockedSkillIds(character, activeForm)) {
    add(id)
  }

  const tier = combatHandToHandTier(character, occ, activeForm)
  if (tier && tier !== 'none') {
    add(handToHandCatalogIdForCreationTier(tier))
  }

  if (occ?.handToHandRules?.defaultSkillId != null && occGrantsDefaultHandToHand(occ)) {
    add(occ.handToHandRules.defaultSkillId)
  }

  const trained = [...owned].filter((id) => id !== HTH_NONE_CATALOG_ID)
  const ids = sortOwnedHandToHandIds(trained.length > 0 ? trained : [HTH_NONE_CATALOG_ID])
  return ids.map((catalogId) => {
    const row = getHandToHandSkillById(catalogId)
    return { catalogId, name: row?.name ?? catalogId }
  })
}

/**
 * Active Hand-to-Hand tier: combat override if owned, else highest unlocked upgrade path,
 * else O.C.C. default when known.
 */
export function resolveActiveHandToHandSkillId(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): string | undefined {
  if (usesMorphusInnateHandToHand(character, activeForm)) {
    return morphusInnateHandToHandCatalogId()
  }

  const unlocked = collectUnlockedSkillIds(character, activeForm)
  const catalogIds = new Set(listHandToHandSkillIds())

  const hasCatalog = (sheetSkillId: string) =>
    catalogIds.has(mapSheetSkillIdToHandToHandCatalogId(sheetSkillId))

  if (occ?.handToHandRules) {
    const { defaultSkillId, upgradePaths } = occ.handToHandRules
    for (let i = upgradePaths.length - 1; i >= 0; i--) {
      const target = upgradePaths[i]?.targetSkillId
      if (target && hasUnlockedHandToHandTarget(unlocked, target) && hasCatalog(target)) {
        return mapSheetSkillIdToHandToHandCatalogId(target)
      }
    }
  }

  const ownedTrained = unlockedHandToHandCatalogIds(unlocked, catalogIds)
  const highestOwned = pickHighestHandToHandCatalogId(ownedTrained)
  if (highestOwned) return highestOwned

  const tier = combatHandToHandTier(character, occ, activeForm)
  if (tier && tier !== 'none') {
    return handToHandCatalogIdForCreationTier(tier)
  }

  if (occ?.handToHandRules) {
    const { defaultSkillId } = occ.handToHandRules
    if (defaultSkillId != null && hasCatalog(defaultSkillId)) {
      const defaultGranted =
        occGrantsDefaultHandToHand(occ) || hasUnlockedHandToHandTarget(unlocked, defaultSkillId)
      if (defaultGranted) {
        return mapSheetSkillIdToHandToHandCatalogId(defaultSkillId)
      }
    }
  }

  return undefined
}

export function resolveHandToHandCombatProfile(
  character: Character,
  activeForm: ActiveForm,
  occ: PalladiumOcc | undefined,
): HandToHandCombatProfile {
  const owned = listOwnedHandToHandStyles(character, activeForm, occ)
  const override = character.activeCombatHandToHandSkillId
  const overrideOk = override && owned.some((s) => s.catalogId === override)
  const trainedId = overrideOk
    ? override
    : resolveActiveHandToHandSkillId(character, activeForm, occ)
  const catalogId = trainedId ?? HTH_NONE_CATALOG_ID
  const skill = getHandToHandSkillById(catalogId)
  if (!skill) return emptyProfile(character, activeForm)
  return buildCombatProfile(skill, character, activeForm)
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
