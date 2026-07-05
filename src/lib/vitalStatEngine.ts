import type { ForgeAttrKey } from './attributeKeys'
import {
  pushAggregateTerm,
  resolveDerivedStat,
  resolveVitalFlatFromTerms,
  type AggregateModifierTerm,
  type DerivedStatResult,
} from './creationStatEngine'
import {
  buildVitalAttrFlatBundle,
  parseVitalFormulaAttrTerm,
  splitFormulaTerms,
  type VitalAttrFlatTerm,
} from './ledgerVitalFormula'
import type { PendingDiceBlock } from './spawnDiceBlocks'
import { pendingDiceBlockRunningTotal } from './spawnDiceBlocks'

export type CompiledVitalFormula = {
  anchorAttr: ForgeAttrKey | null
  attrConstant1: number
  flatTerms: readonly VitalAttrFlatTerm[]
}

/** Compile a schema formula string into Tier-2 inputs (display terms preserved). */
export function compileVitalFormula(
  formula: string | undefined,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  attrScores?: Partial<Record<ForgeAttrKey, number>>,
): CompiledVitalFormula {
  const bundle = buildVitalAttrFlatBundle(formula, assignments, attrScores)
  const attrTerms = bundle.terms.filter(
    (term): term is Extract<VitalAttrFlatTerm, { kind: 'attr' }> =>
      term.kind === 'attr',
  )
  return {
    anchorAttr: attrTerms.length === 1 ? attrTerms[0]!.attr : null,
    attrConstant1: attrTerms.length === 1 ? attrTerms[0]!.multiplier : 0,
    flatTerms: bundle.terms,
  }
}

/** Tier-2 flat total for a single schema formula string (no entered dice). */
export function resolveVitalFormulaFlat(
  formula: string | undefined,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  attrScores?: Partial<Record<ForgeAttrKey, number>>,
): DerivedStatResult {
  const bundle = buildVitalAttrFlatBundle(formula, assignments, attrScores)
  return resolveVitalFlatFromTerms(bundle.terms)
}

/** Full vital total: Tier-2 flat baseline + entered physical dice on Review. */
export function resolveVitalPendingBlockTotal(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>>,
): number {
  return pendingDiceBlockRunningTotal(block, resolutions)
}

/** H.P. Tier-2 — schema formula + entered level dice. */
export function resolveHitPointsFromSchema(input: {
  hpFormula: string | undefined
  assignments: Partial<Record<ForgeAttrKey, number>>
  attrScores?: Partial<Record<ForgeAttrKey, number>>
  enteredDiceTotal?: number
  extraTerms?: readonly AggregateModifierTerm[]
  constant2?: number
}): DerivedStatResult {
  const compiled = compileVitalFormula(
    input.hpFormula,
    input.assignments,
    input.attrScores,
  )
  const attrTerms = compiled.flatTerms.filter(
    (term): term is Extract<VitalAttrFlatTerm, { kind: 'attr' }> =>
      term.kind === 'attr',
  )
  const terms: AggregateModifierTerm[] = [...(input.extraTerms ?? [])]
  for (const term of compiled.flatTerms) {
    if (term.kind === 'flat') {
      pushAggregateTerm(
        terms,
        term.source === 'race' ? 'race_flat' : 'occ_flat',
        term.label,
        term.amount,
      )
    }
  }
  if (input.enteredDiceTotal) {
    pushAggregateTerm(terms, 'skill_dice', 'H.P. dice', input.enteredDiceTotal)
  }

  if (attrTerms.length === 1) {
    return resolveDerivedStat({
      aggregatedAttribute: attrTerms[0]!.score,
      attrConstant1: attrTerms[0]!.multiplier,
      exceptionalModifier: 0,
      terms,
      constant2: input.constant2,
    })
  }

  for (const anchor of attrTerms) {
    pushAggregateTerm(
      terms,
      'misc',
      anchor.label,
      anchor.score * anchor.multiplier,
    )
  }
  return resolveDerivedStat({
    aggregatedAttribute: 0,
    attrConstant1: 0,
    exceptionalModifier: 0,
    terms,
    constant2: input.constant2,
  })
}

/** Extract attrConstant1 from a schema formula string (e.g. PE*3 → 3, PE → 1). */
export function vitalFormulaAttrConstant1(formula: string | undefined): number {
  if (!formula?.trim()) return 1
  const attrParts = splitFormulaTerms(formula)
    .map((part) => parseVitalFormulaAttrTerm(part))
    .filter((parsed): parsed is NonNullable<typeof parsed> => parsed != null)
  if (attrParts.length === 1) return attrParts[0]!.multiplier
  return 0
}
