import type { OccCategoryAccessRule } from '../types'
import {
  formatOccCategoryRuleDropdown,
  resolveOccCategoryRuleForFilter,
  type OccCategoryRuleTone,
} from './occCategoryRuleDisplay'

/** Joe availability checkboxes — same buckets as the Category dropdown rule labels. */
export type CreationCategoryAvailabilityKind =
  | 'any'
  | 'none'
  | 'restrictions'
  | 'bonus'

export type CreationCategoryAvailabilityFilter = Record<
  CreationCategoryAvailabilityKind,
  boolean
>

export const CREATION_CATEGORY_AVAILABILITY_KINDS: readonly CreationCategoryAvailabilityKind[] =
  ['any', 'none', 'restrictions', 'bonus'] as const

export const CREATION_CATEGORY_AVAILABILITY_LABELS: Record<
  CreationCategoryAvailabilityKind,
  string
> = {
  any: 'Any',
  none: 'None',
  restrictions: 'Restrictions',
  bonus: 'Bonus',
}

/** All kinds enabled — Joe default. */
export function createDefaultCreationCategoryAvailabilityFilter(): CreationCategoryAvailabilityFilter {
  return {
    any: true,
    none: true,
    restrictions: true,
    bonus: true,
  }
}

const TONE_TO_KIND: Record<OccCategoryRuleTone, CreationCategoryAvailabilityKind> = {
  default: 'any',
  blocked: 'none',
  exception: 'restrictions',
  bonus: 'bonus',
}

/**
 * Map an O.C.C. category rule to Joe’s availability checkbox kind.
 * Uses the same display path as {@link formatOccCategoryRuleDropdown}.
 */
export function resolveCreationCategoryAvailabilityKind(
  rule: OccCategoryAccessRule | undefined,
): CreationCategoryAvailabilityKind {
  const { tone } = formatOccCategoryRuleDropdown(rule)
  return TONE_TO_KIND[tone]
}

export function creationCategoryAvailabilityAllows(
  kind: CreationCategoryAvailabilityKind,
  filter: CreationCategoryAvailabilityFilter,
): boolean {
  return filter[kind] === true
}

/** Whether a library book category should appear in the Category dropdown. */
export function creationBookCategoryPassesAvailabilityFilter(
  filterCategory: string,
  rules: readonly OccCategoryAccessRule[],
  filter: CreationCategoryAvailabilityFilter,
): boolean {
  const rule = resolveOccCategoryRuleForFilter(filterCategory, rules)
  const kind = resolveCreationCategoryAvailabilityKind(rule)
  return creationCategoryAvailabilityAllows(kind, filter)
}

export function filterCreationBookCategoriesByAvailability(
  categories: readonly string[],
  rules: readonly OccCategoryAccessRule[],
  filter: CreationCategoryAvailabilityFilter,
): string[] {
  return categories.filter((category) =>
    creationBookCategoryPassesAvailabilityFilter(category, rules, filter),
  )
}

/**
 * True when at least one of the skill’s book categories is allowed by the
 * availability filter (multi-category skills stay visible via any matching lane).
 */
export function skillBookCategoriesPassAvailabilityFilter(
  bookCategories: readonly string[],
  rules: readonly OccCategoryAccessRule[],
  filter: CreationCategoryAvailabilityFilter,
): boolean {
  if (!bookCategories.length) {
    return creationCategoryAvailabilityAllows('any', filter)
  }
  return bookCategories.some((cat) =>
    creationBookCategoryPassesAvailabilityFilter(cat, rules, filter),
  )
}
