import type { FeatureModifiers } from '../types'
import { getSkillById } from '../data/library/skills'
import type { ActiveForm, Character } from '../types'

const STAGED_PHYSICAL_ATTR_KEYS = ['ps', 'pp', 'pe', 'spd', 'sdc'] as const

/** True when staged physical skill attribute flats are already in stored form.attributes / S.D.C. */
export function physicalSkillAttributeFlatsAlreadyBaked(
  character: Character,
  activeForm: ActiveForm,
): boolean {
  if (activeForm === 'morphus') {
    return character.morphusForgeState?.baseStatsApplied === true
  }
  return character.physicalSkillModsApplied === true
}

export function aggregateSkillModifiers(
  skillIds: readonly string[],
): FeatureModifiers {
  const out: FeatureModifiers = {}
  for (const id of skillIds) {
    const s = getSkillById(id)
    if (!s?.modifiers) continue
    for (const [key, val] of Object.entries(s.modifiers)) {
      out[key] = (out[key] ?? 0) + val
    }
  }
  return out
}

/** Strip attribute / S.D.C. staging keys when spawn or Morphus base already baked them. */
export function omitBakedPhysicalSkillModifiers(
  mods: FeatureModifiers,
  character: Character,
  activeForm: ActiveForm,
): FeatureModifiers {
  if (!physicalSkillAttributeFlatsAlreadyBaked(character, activeForm)) return mods
  const out = { ...mods }
  for (const key of STAGED_PHYSICAL_ATTR_KEYS) {
    delete out[key]
  }
  return out
}
