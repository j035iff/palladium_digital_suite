export type SkillPercentAttributeSlug =
  | 'iq'
  | 'me'
  | 'ma'
  | 'ps'
  | 'pp'
  | 'pe'
  | 'pb'
  | 'spd'

export type PerNPointsRounding = 'floor' | 'round_up'

export type SkillPercentAttributeScores = Partial<
  Record<SkillPercentAttributeSlug, number>
>

export type SkillPercentModifierBonusPerPointAbove = {
  kind: 'bonusPerPointAbove'
  attribute: SkillPercentAttributeSlug
  threshold: number
  percentPerPoint: number
  perNPoints?: number
  perNPointsRounding?: PerNPointsRounding
}

export type SkillPercentModifierBonusPerStepAbove = {
  kind: 'bonusPerStepAbove'
  attribute: SkillPercentAttributeSlug
  threshold: number
  attributePointsPerStep: number
  percentPerStep: number
  perNPointsRounding?: PerNPointsRounding
}

export type SkillPercentModifierPenaltyWhenBelow = {
  kind: 'penaltyWhenBelow'
  attribute: SkillPercentAttributeSlug
  below: number
  skillPercentPenalty: number
}

export type SkillPercentAttributeModifierRule =
  | SkillPercentModifierBonusPerPointAbove
  | SkillPercentModifierBonusPerStepAbove
  | SkillPercentModifierPenaltyWhenBelow

export type SkillPercentAttributeModifiers = {
  summary?: string
  multiAttributeAggregation?: 'sum_all_applicable_rules' | 'take_largest_contribution_only' | 'custom'
  rules: readonly SkillPercentAttributeModifierRule[]
}

export type SkillPercentAttributeModifierLine = {
  label: string
  value: number
}

function attributeLabel(slug: SkillPercentAttributeSlug): string {
  switch (slug) {
    case 'iq':
      return 'I.Q.'
    case 'me':
      return 'M.E.'
    case 'ma':
      return 'M.A.'
    case 'ps':
      return 'P.S.'
    case 'pp':
      return 'P.P.'
    case 'pe':
      return 'P.E.'
    case 'pb':
      return 'P.B.'
    case 'spd':
      return 'Spd'
  }
}

function countStepUnits(
  excess: number,
  stepSize: number,
  rounding: PerNPointsRounding,
): number {
  if (excess <= 0 || stepSize <= 0) return 0
  const steps = excess / stepSize
  return rounding === 'round_up' ? Math.ceil(steps) : Math.floor(steps)
}

function evaluateRule(
  rule: SkillPercentAttributeModifierRule,
  scores: SkillPercentAttributeScores,
): SkillPercentAttributeModifierLine | null {
  const score = scores[rule.attribute]
  if (typeof score !== 'number') return null

  if (rule.kind === 'bonusPerPointAbove') {
    const excess = Math.max(0, score - rule.threshold)
    if (excess <= 0) return null
    const stepSize = rule.perNPoints ?? 1
    const rounding = rule.perNPointsRounding ?? 'floor'
    const units =
      stepSize <= 1 ? excess : countStepUnits(excess, stepSize, rounding)
    const value = units * rule.percentPerPoint
    if (value === 0) return null
    const stepNote =
      stepSize > 1
        ? ` per ${stepSize} ${attributeLabel(rule.attribute)} over ${rule.threshold}`
        : ` per ${attributeLabel(rule.attribute)} over ${rule.threshold}`
    return {
      label: `${attributeLabel(rule.attribute)} bonus${stepNote}`,
      value,
    }
  }

  if (rule.kind === 'bonusPerStepAbove') {
    const excess = Math.max(0, score - rule.threshold)
    if (excess <= 0) return null
    const rounding = rule.perNPointsRounding ?? 'floor'
    const units = countStepUnits(excess, rule.attributePointsPerStep, rounding)
    const value = units * rule.percentPerStep
    if (value === 0) return null
    return {
      label: `${attributeLabel(rule.attribute)} bonus (per ${rule.attributePointsPerStep} over ${rule.threshold})`,
      value,
    }
  }

  if (score < rule.below) {
    return {
      label: `${attributeLabel(rule.attribute)} below ${rule.below}`,
      value: rule.skillPercentPenalty,
    }
  }

  return null
}

/** Sum catalog attribute-driven skill % modifiers for the active attribute scores. */
export function sumSkillPercentAttributeModifierPercent(
  block: SkillPercentAttributeModifiers | undefined,
  scores: SkillPercentAttributeScores,
): { total: number; lines: readonly SkillPercentAttributeModifierLine[] } {
  if (!block?.rules?.length) return { total: 0, lines: [] }

  const lines: SkillPercentAttributeModifierLine[] = []
  for (const rule of block.rules) {
    const line = evaluateRule(rule, scores)
    if (line) lines.push(line)
  }

  if (block.multiAttributeAggregation === 'take_largest_contribution_only') {
    const max = lines.reduce((best, line) => Math.max(best, line.value), 0)
    const winner = lines.find((line) => line.value === max)
    return {
      total: max,
      lines: winner ? [winner] : [],
    }
  }

  const total = lines.reduce((sum, line) => sum + line.value, 0)
  return { total, lines }
}
