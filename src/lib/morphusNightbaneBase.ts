import type { CharacterRootState, PalladiumOcc } from '../types'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from './attributeKeys'
import {
  applyCreationAttributesToForm,
  buildCreationAttributes,
} from './creationAttributeSync'
import { mapRaceStrengthToPsTier } from './raceEngine'
import nightbaneBaseMorphus from '../data/content/morphus/forge/nightbane_base_morphus.json'

export type NightbaneMorphusBaseProfile = typeof nightbaneBaseMorphus

export const NIGHTBANE_MORPHUS_BASE_PROFILE =
  nightbaneBaseMorphus as NightbaneMorphusBaseProfile

export const MORPHUS_HIT_POINTS_FORMULA =
  NIGHTBANE_MORPHUS_BASE_PROFILE.vitals?.hitPointsFormula ?? 'PEx2'

export const MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA =
  NIGHTBANE_MORPHUS_BASE_PROFILE.vitals?.hitPointsPerLevelFormula ?? '2D6'

export const MORPHUS_SDC_BONUS_DICE =
  NIGHTBANE_MORPHUS_BASE_PROFILE.vitals?.sdcBonusDice ?? '2D6*10'

function readScalar(
  attrs: CharacterRootState['morphus']['attributes'],
  attr: ForgeAttrKey,
): number {
  if (attr === 'ps') return attrs.ps.score
  return attrs[attr]
}

function writeScalar(
  attrs: CharacterRootState['morphus']['attributes'],
  attr: ForgeAttrKey,
  value: number,
): CharacterRootState['morphus']['attributes'] {
  const v = Math.max(1, Math.round(value))
  if (attr === 'ps') {
    return { ...attrs, ps: { ...attrs.ps, score: v } }
  }
  return { ...attrs, [attr]: v }
}

/** Apply Nightbane R.C.C. Morphus attribute bonuses on top of Facade pool assignments. */
export function applyNightbaneMorphusBaseAttributes(
  prev: CharacterRootState,
  occ: PalladiumOcc | undefined,
): CharacterRootState {
  const primaryBranch = applyCreationAttributesToForm(
    prev.primary,
    prev.creationAttributeAssignments ?? {},
    occ,
    prev.occSpecializationId,
    prev.creationOccVariableResolutions ?? {},
  )
  let attrs = buildCreationAttributes(
    primaryBranch.attributes,
    prev.creationAttributeAssignments ?? {},
    occ,
    prev.occSpecializationId,
    prev.creationOccVariableResolutions ?? {},
  )

  const bonuses = NIGHTBANE_MORPHUS_BASE_PROFILE.attributeBonuses
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const bump = bonuses[attr as keyof typeof bonuses]
    if (typeof bump === 'number' && bump !== 0) {
      attrs = writeScalar(attrs, attr, readScalar(attrs, attr) + bump)
    }
  }

  const tier = mapRaceStrengthToPsTier(
    NIGHTBANE_MORPHUS_BASE_PROFILE.morphusStrengthCategory,
  )
  attrs = { ...attrs, ps: { score: attrs.ps.score, tier } }

  return {
    ...prev,
    morphus: {
      ...prev.morphus,
      attributes: attrs,
    },
  }
}
