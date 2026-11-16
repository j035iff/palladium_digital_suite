import type { CreationSkillPick } from '../types'
import {
  CREATION_SKILL_FILTER_CATEGORY_ORDER,
  getSkillBookCategories,
  WP_ERA_BOOK_CATEGORY,
} from './creationSkillCatalog'
import { LIVE_SKILL_LANGUAGE_LITERACY_LABEL } from './liveSkillEngine'

/** Default Selected skills sorter — show every selected skill. */
export const CREATION_SELECTED_SKILLS_SORTER_ALL = 'All'

/** Joe: Language + Literacy combined sorter option. */
export const CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY =
  LIVE_SKILL_LANGUAGE_LITERACY_LABEL

/** Joe: Lore peeled out of Technical for Selected skills sorter only. */
export const CREATION_SELECTED_SKILLS_SORTER_LORE = 'Lore'

/** Joe: Ancient + Modern W.P. combined sorter option. */
export const CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES =
  'Weapon Proficiencies'

const LANGUAGE_LITERACY_SKILL_IDS: ReadonlySet<string> = new Set([
  'skill_language',
  'skill_literacy',
])

const WP_BOOK_CATEGORIES: ReadonlySet<string> = new Set([
  WP_ERA_BOOK_CATEGORY.ancient,
  WP_ERA_BOOK_CATEGORY.modern,
])

/** Stable dropdown order (All is prepended separately). */
const SORTER_CATEGORY_ORDER: readonly string[] = [
  CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY,
  ...CREATION_SKILL_FILTER_CATEGORY_ORDER.flatMap((label) => {
    if (label === WP_ERA_BOOK_CATEGORY.ancient) {
      return [CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES]
    }
    if (label === WP_ERA_BOOK_CATEGORY.modern) return []
    if (label === 'Technical') {
      return ['Technical', CREATION_SELECTED_SKILLS_SORTER_LORE]
    }
    return [label]
  }),
]

function isLoreSkillId(skillId: string): boolean {
  return skillId.startsWith('skill_lore_')
}

function isWeaponProficiencySkillId(skillId: string): boolean {
  if (skillId.startsWith('wp_')) return true
  const cats = getSkillBookCategories(skillId)
  return cats.some((c) => WP_BOOK_CATEGORIES.has(c))
}

function primaryBookCategory(skillId: string): string {
  const cats = getSkillBookCategories(skillId)
  const first = cats[0]?.trim()
  return first && first.length > 0 ? first : 'Other'
}

/**
 * Sorter bucket for a creation pick (Selected skills panel only).
 * Prefers recorded {@link CreationSkillPick.selectionCategory} for multi-category
 * skills; peels Language/Literacy, Lore, and W.P. into Joe combined options.
 */
export function resolveCreationSelectedSkillSorterCategory(
  pick: CreationSkillPick,
): string {
  const skillId = pick.skillId
  if (LANGUAGE_LITERACY_SKILL_IDS.has(skillId)) {
    return CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY
  }
  if (isLoreSkillId(skillId)) {
    return CREATION_SELECTED_SKILLS_SORTER_LORE
  }
  if (isWeaponProficiencySkillId(skillId)) {
    return CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES
  }

  const selected = pick.selectionCategory?.trim()
  if (selected) {
    if (WP_BOOK_CATEGORIES.has(selected)) {
      return CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES
    }
    const cats = getSkillBookCategories(skillId)
    if (cats.includes(selected)) return selected
  }

  const primary = primaryBookCategory(skillId)
  if (WP_BOOK_CATEGORIES.has(primary)) {
    return CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES
  }
  return primary
}

export function creationSelectedSkillMatchesSorter(
  pick: CreationSkillPick,
  filter: string | undefined | null,
): boolean {
  const active = filter?.trim() || CREATION_SELECTED_SKILLS_SORTER_ALL
  if (active === CREATION_SELECTED_SKILLS_SORTER_ALL) return true
  return resolveCreationSelectedSkillSorterCategory(pick) === active
}

function sorterOptionSortIndex(label: string): number {
  const idx = SORTER_CATEGORY_ORDER.indexOf(label)
  return idx >= 0 ? idx : SORTER_CATEGORY_ORDER.length
}

/**
 * Dropdown options from the character’s current selected picks:
 * All + only categories that have at least one pick.
 */
export function listCreationSelectedSkillSorterOptions(
  picks: readonly CreationSkillPick[],
): readonly { value: string; label: string }[] {
  const present = new Set<string>()
  for (const pick of picks) {
    present.add(resolveCreationSelectedSkillSorterCategory(pick))
  }
  const labels = [...present].sort(
    (a, b) =>
      sorterOptionSortIndex(a) - sorterOptionSortIndex(b) ||
      a.localeCompare(b),
  )
  return [
    {
      value: CREATION_SELECTED_SKILLS_SORTER_ALL,
      label: 'All',
    },
    ...labels.map((label) => ({ value: label, label })),
  ]
}
