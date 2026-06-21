/**
 * Skill trait registry ids and source list files (see skill_trait_registry.json).
 */

export const SKILL_TRAIT_DEXTERITY = 'requires_dexterity'
export const SKILL_TRAIT_LIGHT_TOUCH = 'requires_light_touch'
export const SKILL_TRAIT_ELECTRICAL = 'related_to_electrical'
export const SKILL_TRAIT_REPAIR = 'related_to_repair'
export const SKILL_TRAIT_MECHANICS = 'related_to_mechanics'
export const SKILL_TRAIT_PERFORMANCE = 'related_to_performance'
export const SKILL_TRAIT_TIMING = 'requires_timing'
export const SKILL_TRAIT_FOCUS = 'requires_focus'
export const SKILL_TRAIT_WORK_EDUCATION = 'work_education_related'

/** Canonical trait ids in display order. */
export const ALL_SKILL_TRAIT_IDS = [
  SKILL_TRAIT_DEXTERITY,
  SKILL_TRAIT_LIGHT_TOUCH,
  SKILL_TRAIT_ELECTRICAL,
  SKILL_TRAIT_REPAIR,
  SKILL_TRAIT_MECHANICS,
  SKILL_TRAIT_PERFORMANCE,
  SKILL_TRAIT_TIMING,
  SKILL_TRAIT_FOCUS,
  SKILL_TRAIT_WORK_EDUCATION,
]

/** Trait id → source list file under src/data/source/skill_trait_lists/. */
export const SKILL_TRAIT_LIST_FILES = {
  [SKILL_TRAIT_DEXTERITY]: 'skills_requiring_dexterity.txt',
  [SKILL_TRAIT_LIGHT_TOUCH]: 'skills_requiring_light_touch.txt',
  [SKILL_TRAIT_ELECTRICAL]: 'skills_related_to_electrical.txt',
  [SKILL_TRAIT_REPAIR]: 'skills_related_to_repair.txt',
  [SKILL_TRAIT_MECHANICS]: 'skills_related_to_mechanics.txt',
  [SKILL_TRAIT_PERFORMANCE]: 'skills_related_to_performance.txt',
  [SKILL_TRAIT_TIMING]: 'skills_requiring_timing.txt',
  [SKILL_TRAIT_FOCUS]: 'skills_requiring_focus.txt',
  [SKILL_TRAIT_WORK_EDUCATION]: 'skills_work_education_related.txt',
}
