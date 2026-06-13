import type { Character, PalladiumOcc } from '../types'

import {
  HTH_NONE_CATALOG_ID,
  mapSheetSkillIdToHandToHandCatalogId,
} from './handToHandPipeline'

import { occGrantsDefaultHandToHand } from './occComposition'
import {
  alignmentSatisfiesRestrictions,
  formatAlignmentRestrictionReason,
} from './occAlignmentGate'



/** Player-selected Hand-to-Hand tier during creation (O.C.C. core skill choices). */

export type CreationHandToHandTier =

  | 'none'

  | 'basic'

  | 'expert'

  | 'martial_arts'

  | 'assassin'



const TIER_LABELS: Record<Exclude<CreationHandToHandTier, 'none'>, string> = {

  basic: 'Basic',

  expert: 'Expert',

  martial_arts: 'Martial Arts',

  assassin: 'Assassin',

}



export const CREATION_HAND_TO_HAND_OPTIONS: ReadonlyArray<{

  tier: CreationHandToHandTier

  label: string

  sheetSkillId: string | null

}> = [

  { tier: 'none', label: 'None', sheetSkillId: null },

  { tier: 'basic', label: 'Basic', sheetSkillId: 'skill_hand_to_hand_basic' },

  { tier: 'expert', label: 'Expert', sheetSkillId: 'skill_hand_to_hand_expert' },

  {

    tier: 'martial_arts',

    label: 'Martial Arts',

    sheetSkillId: 'skill_hand_to_hand_martial_arts',

  },

  { tier: 'assassin', label: 'Assassin', sheetSkillId: 'skill_hand_to_hand_assassin' },

]



export type OccHandToHandOption = {

  tier: CreationHandToHandTier

  label: string

  electiveSlotCost: number

  disabled?: boolean

  disabledReason?: string

}



export function creationHandToHandTierLabel(
  tier: CreationHandToHandTier | undefined,
): string | null {
  if (!tier || tier === 'none') return null
  return TIER_LABELS[tier]
}

export function sheetSkillIdForCreationHandToHandTier(

  tier: CreationHandToHandTier | undefined,

): string | null {

  if (!tier || tier === 'none') return null

  return (

    CREATION_HAND_TO_HAND_OPTIONS.find((o) => o.tier === tier)?.sheetSkillId ?? null

  )

}



export function handToHandCatalogIdForCreationTier(

  tier: CreationHandToHandTier | undefined,

): string {

  const sheetId = sheetSkillIdForCreationHandToHandTier(tier)

  if (!sheetId) return 'hth_none'

  return mapSheetSkillIdToHandToHandCatalogId(sheetId)

}



export function creationHandToHandTierFromSkillId(

  skillId: string | null | undefined,

): CreationHandToHandTier {

  if (!skillId || skillId === HTH_NONE_CATALOG_ID) return 'none'

  const normalized = skillId.replace(/^hand_to_hand_/, 'skill_hand_to_hand_')

  const match = CREATION_HAND_TO_HAND_OPTIONS.find(

    (o) => o.sheetSkillId === normalized || o.sheetSkillId === skillId,

  )

  return match?.tier ?? 'none'

}



/** Free Hand-to-Hand tier included with the O.C.C. (defaultSkillId only). */

export function occGrantedHandToHandTier(occ: PalladiumOcc): CreationHandToHandTier {

  if (!occGrantsDefaultHandToHand(occ)) return 'none'

  return creationHandToHandTierFromSkillId(occ.handToHandRules.defaultSkillId)

}



/** Bootstrap tier when an O.C.C. is selected (granted default, mandatory paid path, or none). */

export function occStartingHandToHandTier(occ: PalladiumOcc): CreationHandToHandTier {

  const granted = occGrantedHandToHandTier(occ)

  if (granted !== 'none') return granted

  // Mandatory paid style (e.g. A.D.A. Assassination Specialist): single upgrade path.

  const paths = occ.handToHandRules.upgradePaths ?? []

  if (paths.length === 1) {

    const tier = creationHandToHandTierFromSkillId(paths[0].targetSkillId)

    if (tier !== 'none') return tier

  }

  return 'none'

}



export function formatHandToHandOptionLabel(

  tier: CreationHandToHandTier,

  electiveSlotCost: number,

  isDefault: boolean,

): string {

  if (tier === 'none') return isDefault ? 'None (included)' : 'None'

  const base = TIER_LABELS[tier]

  if (isDefault && electiveSlotCost === 0) return `${base} (included)`

  if (electiveSlotCost === 0) return base

  const slotWord = electiveSlotCost === 1 ? 'slot' : 'slots'

  return `${base} (+${electiveSlotCost} O.C.C. related ${slotWord})`

}



/** Selectable Hand-to-Hand tiers for an effective O.C.C. (default + upgrade paths). */

function occOffersUntrainedHandToHandDefault(occ: PalladiumOcc): boolean {
  const defaultId = occ.handToHandRules.defaultSkillId
  return (
    defaultId == null ||
    defaultId === HTH_NONE_CATALOG_ID ||
    creationHandToHandTierFromSkillId(defaultId) === 'none'
  )
}

export function listOccHandToHandOptions(
  occ: PalladiumOcc,
  alignment?: string,
): OccHandToHandOption[] {

  const rules = occ.handToHandRules

  const grantedTier = occGrantedHandToHandTier(occ)

  const seen = new Set<CreationHandToHandTier>()

  const options: OccHandToHandOption[] = []

  const upgradePaths = rules.upgradePaths ?? []

  if (
    grantedTier === 'none' &&
    occOffersUntrainedHandToHandDefault(occ) &&
    (upgradePaths.length > 1 ||
      rules.defaultSkillId === HTH_NONE_CATALOG_ID)
  ) {
    seen.add('none')
    options.push({
      tier: 'none',
      label: formatHandToHandOptionLabel('none', 0, true),
      electiveSlotCost: 0,
    })
  }

  if (grantedTier !== 'none') {

    seen.add(grantedTier)

    options.push({

      tier: grantedTier,

      label: formatHandToHandOptionLabel(grantedTier, 0, true),

      electiveSlotCost: 0,

    })

  }



  for (const path of upgradePaths) {

    const tier = creationHandToHandTierFromSkillId(path.targetSkillId)

    if (tier === 'none' || seen.has(tier)) continue

    seen.add(tier)

    const alignmentOk = alignmentSatisfiesRestrictions(
      alignment,
      path.alignmentRestrictions,
    )
    const disabledReason = alignmentOk
      ? undefined
      : path.alignmentRestrictions
        ? formatAlignmentRestrictionReason(path.alignmentRestrictions)
        : undefined

    options.push({

      tier,

      label: formatHandToHandOptionLabel(tier, path.electiveSlotCost, false),

      electiveSlotCost: path.electiveSlotCost,

      disabled: !alignmentOk,

      disabledReason,

    })

  }



  return options

}



/**
 * Active Hand-to-Hand tier for creation UI and slot accounting.
 * Falls back to the O.C.C. bootstrap tier when the stored pick is missing or invalid
 * (e.g. A.D.A. Assassination Specialist requires Assassin before the player opens the dropdown).
 */
export function effectiveCreationHandToHandTier(
  character: Pick<Character, 'creationHandToHandTier' | 'facade'>,
  occ: PalladiumOcc | undefined,
): CreationHandToHandTier {
  if (!occ) return character.creationHandToHandTier ?? 'none'
  const stored = character.creationHandToHandTier
  const alignment = character.facade?.alignment
  const allowed = new Set(
    listOccHandToHandOptions(occ, alignment)
      .filter((o) => !o.disabled)
      .map((o) => o.tier),
  )
  if (stored && allowed.has(stored)) return stored
  return occStartingHandToHandTier(occ)
}

/** O.C.C. related slots reserved by the effective Hand-to-Hand choice. */
export function creationHandToHandReservedRelatedSlots(
  occ: PalladiumOcc,
  character: Pick<Character, 'creationHandToHandTier'>,
): number {
  return creationHandToHandElectiveSlotCost(
    occ,
    effectiveCreationHandToHandTier(character, occ),
  )
}

/** O.C.C. related slots consumed by the chosen tier above the O.C.C. default. */

export function creationHandToHandElectiveSlotCost(

  occ: PalladiumOcc,

  tier: CreationHandToHandTier | undefined,

): number {

  if (!tier || tier === 'none') return 0

  const grantedTier = occGrantedHandToHandTier(occ)

  if (tier === grantedTier) return 0

  const path = occ.handToHandRules.upgradePaths?.find(

    (p) => creationHandToHandTierFromSkillId(p.targetSkillId) === tier,

  )

  return path?.electiveSlotCost ?? 0

}



export function canAffordHandToHandTier(

  occ: PalladiumOcc,

  tier: CreationHandToHandTier,

  relatedCap: number,

  relatedSelectedCount: number,

): boolean {

  const cost = creationHandToHandElectiveSlotCost(occ, tier)

  return relatedSelectedCount + cost <= relatedCap

}


