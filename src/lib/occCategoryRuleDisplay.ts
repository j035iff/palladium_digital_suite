import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { OccCategoryAccessRule, PalladiumOcc } from '../types'

export type OccCategoryRuleTone = 'default' | 'bonus' | 'blocked' | 'exception'

export type OccCategoryRuleDisplay = {
  label: string
  tone: OccCategoryRuleTone
}

const WP_FILTER_CATEGORIES = new Set(['WP: Ancient', 'WP: Modern'])

/** Map creation-library filter category to O.C.C. categoryRules.categoryName. */
export function mapFilterCategoryToOccCategory(filterCategory: string): string {
  if (WP_FILTER_CATEGORIES.has(filterCategory)) return 'Weapon Proficiencies'
  return filterCategory
}

export function resolveOccCategoryRuleForFilter(
  filterCategory: string,
  rules: readonly OccCategoryAccessRule[],
): OccCategoryAccessRule | undefined {
  if (filterCategory === '' || filterCategory === 'All') return undefined
  const occCategory = mapFilterCategoryToOccCategory(filterCategory)
  return rules.find((r) => r.categoryName === occCategory)
}

function resolveSkillLabel(skillId: string): string {
  return getPalladiumSkillCatalogEntryById(skillId)?.name ?? skillId
}

function buildExceptionLabel(rule: OccCategoryAccessRule): string {
  const exceptionNames = (rule.exceptions ?? []).map(resolveSkillLabel)
  const overrideEntries = rule.skillSpecificOverrides
    ? Object.entries(rule.skillSpecificOverrides)
    : []

  if (rule.accessType === 'only') {
    if (
      exceptionNames.length === 1 &&
      rule.bonusPercent === 0 &&
      overrideEntries.length === 0
    ) {
      return `${exceptionNames[0]} Only`
    }
    if (exceptionNames.length === 1 && overrideEntries.length === 1) {
      const [, pct] = overrideEntries[0]
      return `${exceptionNames[0]} Only (+${pct}%)`
    }
    let label =
      exceptionNames.length === 1
        ? `${exceptionNames[0]} Only`
        : `Only ${exceptionNames.join(', ')}`
    if (rule.bonusPercent > 0) label += ` (+${rule.bonusPercent}%)`
    return label
  }

  if (rule.accessType === 'except') {
    if (exceptionNames.length === 0) {
      return rule.bonusPercent > 0 ? `Any (+${rule.bonusPercent}%)` : 'Any'
    }
    if (rule.bonusPercent > 0) {
      return `Any (+${rule.bonusPercent}%) (Except ${exceptionNames.join(', ')})`
    }
    return `Any (Except ${exceptionNames.join(', ')})`
  }

  const bonusParts: string[] = []
  if (rule.bonusPercent > 0) bonusParts.push(`${rule.bonusPercent}%`)
  for (const [id, pct] of overrideEntries) {
    bonusParts.push(`${resolveSkillLabel(id)} +${pct}%`)
  }
  if (bonusParts.length > 0) return `Any (+${bonusParts.join(', ')})`
  if (exceptionNames.length > 0) return `Only ${exceptionNames.join(', ')}`
  return 'Any'
}

function resolveOccCategoryRuleDisplay(
  rule: OccCategoryAccessRule | undefined,
): OccCategoryRuleDisplay {
  if (!rule) return { label: 'Any', tone: 'default' }
  if (rule.accessType === 'none') return { label: 'None', tone: 'blocked' }

  const hasOverrides =
    rule.skillSpecificOverrides != null &&
    Object.keys(rule.skillSpecificOverrides).length > 0
  const hasExceptions = (rule.exceptions?.length ?? 0) > 0
  const isSimpleAny =
    rule.accessType === 'any' && !hasExceptions && !hasOverrides

  if (isSimpleAny) {
    if (rule.bonusPercent > 0) {
      return { label: `Any (+${rule.bonusPercent}%)`, tone: 'bonus' }
    }
    return { label: 'Any', tone: 'default' }
  }

  return { label: buildExceptionLabel(rule), tone: 'exception' }
}

/** Full rule text for the selected category header. */
export function formatOccCategoryRuleHeader(
  rule: OccCategoryAccessRule | undefined,
): OccCategoryRuleDisplay {
  return resolveOccCategoryRuleDisplay(rule)
}

/** Short rule text for the category dropdown (exceptions collapse to "Exception"). */
export function formatOccCategoryRuleDropdown(
  rule: OccCategoryAccessRule | undefined,
): OccCategoryRuleDisplay {
  const display = resolveOccCategoryRuleDisplay(rule)
  if (display.tone === 'exception') {
    return { label: 'Exception', tone: 'exception' }
  }
  return display
}

/** @deprecated Use {@link formatOccCategoryRuleHeader} or {@link formatOccCategoryRuleDropdown}. */
export function formatOccCategoryRuleDisplay(
  rule: OccCategoryAccessRule | undefined,
): OccCategoryRuleDisplay {
  return formatOccCategoryRuleHeader(rule)
}

export function occCategoryRuleToneClass(
  tone: OccCategoryRuleTone,
  morphus: boolean,
): string {
  switch (tone) {
    case 'bonus':
      return morphus ? 'text-emerald-400' : 'text-emerald-600'
    case 'blocked':
      return morphus ? 'text-red-400' : 'text-red-600'
    case 'exception':
      return morphus ? 'text-blue-400' : 'text-blue-600'
    default:
      return morphus ? 'text-violet-100' : 'text-slate-900'
  }
}

/** True when the active library filter category is entirely blocked (accessType none). */
export function isActiveFilterCategoryOccBlocked(
  activeFilterCategory: string | undefined,
  occ: PalladiumOcc | null | undefined,
): boolean {
  if (!activeFilterCategory || activeFilterCategory === 'All') return false
  if (!occ) return false
  const rule = resolveOccCategoryRuleForFilter(
    activeFilterCategory,
    occ.occRelatedSkills.categoryRules,
  )
  return rule?.accessType === 'none'
}
