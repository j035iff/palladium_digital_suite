import type {
  FeatureActivationCost,
  TalentFormRestriction,
  TalentLimitations,
  TalentPpeEconomy,
  TalentUsableInNightbaneForm,
} from '../types'

const FORM_LABELS: Record<TalentFormRestriction['form'], string> = {
  morphus_only: 'Morphus only',
  facade_only: 'Facade only',
  either_form: 'Facade or Morphus',
}

const EFFECTIVENESS_LABELS: Record<
  NonNullable<TalentFormRestriction['effectiveness']>,
  string
> = {
  full: 'full effect (base + enhancements)',
  base_only: 'base effect only (no P.P.E. enhancement)',
  reduced: 'reduced effect',
}

const SIMPLE_FORM_LABELS: Record<TalentUsableInNightbaneForm, string> = {
  morphus_only: 'Morphus only',
  facade_only: 'Facade only',
  either_form: 'Facade or Morphus',
  varies_by_scope: 'Varies by target or phase',
  both_forms_note_special: 'Varies by target or phase',
}

export type TalentFormUsageLine = {
  label: string
  value: string
}

function formatFormRestriction(rule: TalentFormRestriction): string {
  const parts = [FORM_LABELS[rule.form]]
  if (rule.effectiveness) {
    parts.push(EFFECTIVENESS_LABELS[rule.effectiveness])
  }
  if (rule.notes?.trim()) {
    parts.push(rule.notes.trim())
  }
  return parts.join(' · ')
}

/** One display line per structured form scope (target or phase). */
export function listTalentFormUsageLines(
  limitations?: TalentLimitations | null,
): TalentFormUsageLine[] {
  const usage = limitations?.formUsage
  if (!usage) return []

  const lines: TalentFormUsageLine[] = []
  const byTarget = usage.byTarget
  if (byTarget?.self) {
    lines.push({ label: 'On self', value: formatFormRestriction(byTarget.self) })
  }
  if (byTarget?.willing) {
    lines.push({
      label: 'On willing subject',
      value: formatFormRestriction(byTarget.willing),
    })
  }
  if (byTarget?.others) {
    lines.push({
      label: 'On others',
      value: formatFormRestriction(byTarget.others),
    })
  }

  const phases = usage.phases
  if (phases?.activation) {
    lines.push({
      label: 'Activation',
      value: formatFormRestriction(phases.activation),
    })
  }
  if (phases?.ongoingUse) {
    lines.push({
      label: 'After activation',
      value: formatFormRestriction(phases.ongoingUse),
    })
  }

  return lines
}

/** Summary when no structured `formUsage` is present. */
export function formatTalentSimpleFormRule(
  limitations?: TalentLimitations | null,
): string | undefined {
  const form = limitations?.usableInNightbaneForm
  if (!form || form === 'varies_by_scope' || form === 'both_forms_note_special') {
    return undefined
  }
  return SIMPLE_FORM_LABELS[form]
}

/** Structured lines first; otherwise a single simple form label. */
export function formatTalentFormRules(
  limitations?: TalentLimitations | null,
): TalentFormUsageLine[] {
  const structured = listTalentFormUsageLines(limitations)
  if (structured.length > 0) return structured

  const simple = formatTalentSimpleFormRule(limitations)
  return simple ? [{ label: 'Form', value: simple }] : []
}

function formatPpeValue(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'object') {
    const block = value as Record<string, unknown>
    const summary =
      typeof block.relativeToSummary === 'string'
        ? block.relativeToSummary
        : typeof block.summary === 'string'
          ? block.summary
          : undefined
    if (summary) return summary
    return 'Variable'
  }
  return undefined
}

/** Permanent P.P.E. burn to acquire a Nightbane talent. */
export function formatTalentPpeAcquireCost(
  ppe?: TalentPpeEconomy | null,
): string | undefined {
  return formatPpeValue(ppe?.permanentBurnToAcquire)
}

/** P.P.E. (or other energy) spent to activate a talent. */
export function formatTalentActivationCost(
  ppe?: TalentPpeEconomy | null,
  activationCost?: FeatureActivationCost,
): string | undefined {
  const fromPpe = formatPpeValue(ppe?.baseActivation)
  if (fromPpe) return fromPpe
  if (!activationCost || activationCost.type === 'none') return undefined
  return formatPpeValue(activationCost.value)
}
