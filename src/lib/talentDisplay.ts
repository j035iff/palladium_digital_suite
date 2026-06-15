import type { FeatureActivationCost, TalentPpeEconomy } from '../types'

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
