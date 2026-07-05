import type {
  AccumulatedHandToHandBonuses,
  CharacterAttributes,
  FeatureModifiers,
  MorphusAttributeRollBonuses,
  PalladiumOcc,
  Race,
} from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import {
  getIqBonuses,
  getMaBonuses,
  getMeBonuses,
  getPbBonuses,
  getPeBonuses,
  getPpBonuses,
  getPsBonuses,
} from './attributeBonuses'
import { occStaticNumericBonus } from './creationOccBonuses'
import { occVariableAttributeResolution } from './occVariableBonus'
import type { SaveRollBonusLine } from './saveRollDisplay'
import { formatBonus } from './combatQuickBonuses'
import {
  buildForgeAttributeStatBonuses,
  formatAttributeValueTooltip,
  type LedgerFlatContribution,
  type LedgerStatDiceGroup,
} from './ledgerStatBonuses'
import { NIGHTBANE_MORPHUS_BASE_PROFILE } from './morphusNightbaneBase'
import type { PendingDiceBlock } from './spawnDiceBlocks'
import { pendingDiceBlockRunningTotal } from './spawnDiceBlocks'
import { DEFAULT_HORROR_FACTOR_BY_FORM } from '../data/constants'
import {
  buildSourcedVitalFlatTerms,
  type VitalAttrFlatTerm,
} from './ledgerVitalFormula'

// ---------------------------------------------------------------------------
// Two-tier stat model (source of truth)
//
// Tier 1 — AGGREGATED ATTRIBUTE:
//   (raceDice + raceFlat + occDice + occFlat + occPerLevel
//    + skillDice + skillFlat + skillPerLevel + misc) × constant
//
// Tier 2 — DERIVED STAT (strike, saves, vitals, etc.):
//   ((aggregatedAttr × attrConstant1) + exceptionalModifier
//    + raceDice + raceFlat + … + misc) × constant2
//
// Morphus aggregated attributes use Facade aggregated totals as facade_baseline,
// then apply Morphus-only modifiers through the same Tier-1 formula.
// ---------------------------------------------------------------------------

export type AggregateModifierKind =
  | 'race_dice'
  | 'race_flat'
  | 'race_per_level'
  | 'occ_dice'
  | 'occ_flat'
  | 'occ_per_level'
  | 'skill_dice'
  | 'skill_flat'
  | 'skill_per_level'
  | 'facade_baseline'
  | 'misc'

export type AggregateModifierTerm = {
  kind: AggregateModifierKind
  label: string
  amount: number
  notation?: string
}

export type AggregatedAttributeInput = {
  terms: readonly AggregateModifierTerm[]
  /** Post-sum multiplier (e.g. Spd × 0.5). Defaults to 1. */
  constant?: number
}

export type AggregatedAttributeResult = {
  preConstant: number
  constant: number
  total: number
  terms: readonly AggregateModifierTerm[]
}

export type DerivedStatInput = {
  /** Tier-1 aggregated score for the driving attribute (P.P., P.E., etc.). */
  aggregatedAttribute: number
  /** Attribute multiplier before exceptional adds (e.g. Morphus H.P. P.E. × 2). */
  attrConstant1?: number
  /** Hard-coded table lookup from aggregated attribute (`attributeBonuses.ts`). */
  exceptionalModifier?: number
  terms: readonly AggregateModifierTerm[]
  constant2?: number
}

export type DerivedStatResult = {
  attrPortion: number
  preConstant2: number
  constant2: number
  total: number
}

export function pushAggregateTerm(
  terms: AggregateModifierTerm[],
  kind: AggregateModifierKind,
  label: string,
  amount: number,
  notation?: string,
): void {
  if (amount === 0 && !notation?.trim()) return
  terms.push({ kind, label, amount, notation })
}

export function sumAggregateModifierTerms(
  terms: readonly AggregateModifierTerm[],
): number {
  return terms.reduce((sum, term) => sum + term.amount, 0)
}

/** Tier 1 — compute an aggregated attribute total. */
export function resolveAggregatedAttribute(
  input: AggregatedAttributeInput,
): AggregatedAttributeResult {
  const constant = input.constant ?? 1
  const preConstant = sumAggregateModifierTerms(input.terms)
  const raw = preConstant * constant
  const total = Number.isInteger(raw) ? raw : Math.round(raw)
  return { preConstant, constant, total, terms: input.terms }
}

/** Tier 2 — compute any stat that derives from an aggregated attribute. */
/** Nightbane defaults only — prefer attrConstant1 compiled from schema (race hpFormula, morphus profile). */
export const FACADE_HIT_POINTS_ATTR_CONSTANT = 1
export const MORPHUS_HIT_POINTS_ATTR_CONSTANT = 2

/** H.P. Tier-2 — aggregated P.E. × schema constant1 + entered level dice (no exceptional term). */
export function resolveHitPointsDerivedStat(input: {
  aggregatedPe: number
  /** From compiled schema (e.g. PE+1D6 → 1, PE*3 → 3, PEx2 → 2). Overrides form defaults when set. */
  attrConstant1?: number
  form?: 'primary' | 'morphus'
  levelDiceTotal?: number
  extraTerms?: readonly AggregateModifierTerm[]
  constant2?: number
}): DerivedStatResult {
  const attrConstant1 =
    input.attrConstant1 ??
    (input.form === 'morphus'
      ? MORPHUS_HIT_POINTS_ATTR_CONSTANT
      : FACADE_HIT_POINTS_ATTR_CONSTANT)
  return resolveDerivedStat({
    aggregatedAttribute: input.aggregatedPe,
    attrConstant1,
    exceptionalModifier: 0,
    terms: [
      ...(input.extraTerms ?? []),
      ...(input.levelDiceTotal
        ? [{ kind: 'skill_dice' as const, label: 'H.P. dice', amount: input.levelDiceTotal }]
        : []),
    ],
    constant2: input.constant2,
  })
}

export function resolveDerivedStat(input: DerivedStatInput): DerivedStatResult {
  const attrConstant1 = input.attrConstant1 ?? 1
  const constant2 = input.constant2 ?? 1
  // Step 1: aggregated attribute × constant1 (default 1)
  const attrPortion = input.aggregatedAttribute * attrConstant1
  // Step 2: add exceptional + rolls/flats; step 3: × constant2 (default 1)
  const preConstant2 =
    attrPortion +
    (input.exceptionalModifier ?? 0) +
    sumAggregateModifierTerms(input.terms)
  const raw = preConstant2 * constant2
  const total = Number.isInteger(raw) ? raw : Math.round(raw)
  return { attrPortion, preConstant2, constant2, total }
}

/** Map vital flat terms to Tier-2 aggregate modifier terms. */
export function vitalFlatTermsToAggregateTerms(
  flatTerms: readonly VitalAttrFlatTerm[],
): AggregateModifierTerm[] {
  const terms: AggregateModifierTerm[] = []
  for (const term of flatTerms) {
    if (term.kind === 'flat') {
      const kind: AggregateModifierKind =
        term.source === 'race' ? 'race_flat' : 'occ_flat'
      pushAggregateTerm(terms, kind, term.label, term.amount)
    }
  }
  return terms
}

/**
 * Resolve the flat (pre-dice) portion of a vital formula through Tier 2.
 * Single attr term → aggregatedAttr × constant1; multiple attrs → each as misc.
 */
export function resolveVitalFlatFromTerms(
  flatTerms: readonly VitalAttrFlatTerm[],
): DerivedStatResult {
  const attrTerms = flatTerms.filter(
    (term): term is Extract<VitalAttrFlatTerm, { kind: 'attr' }> =>
      term.kind === 'attr',
  )
  const integerTerms = vitalFlatTermsToAggregateTerms(flatTerms)

  if (attrTerms.length === 1) {
    const anchor = attrTerms[0]!
    return resolveDerivedStat({
      aggregatedAttribute: anchor.score,
      attrConstant1: anchor.multiplier,
      exceptionalModifier: 0,
      terms: integerTerms,
    })
  }

  const terms = [...integerTerms]
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
  })
}

/** Tier-2 flat total for S.D.C. integer flats (dice entered separately on Review). */
export function resolveSdcFlatDerivedStat(input: {
  flatVitalTerms: readonly VitalAttrFlatTerm[]
  skillFlats: readonly LedgerFlatContribution[]
}): DerivedStatResult {
  const terms = vitalFlatTermsToAggregateTerms(input.flatVitalTerms)
  for (const skill of input.skillFlats) {
    pushAggregateTerm(terms, 'skill_flat', skill.label, skill.amount)
  }
  return resolveDerivedStat({
    aggregatedAttribute: 0,
    attrConstant1: 0,
    exceptionalModifier: 0,
    terms,
  })
}

/** Morphus S.D.C. flat baseline: Facade total + trait flats (dice entered separately). */
export function resolveMorphusSdcFlatDerivedStat(input: {
  facadeSdcTotal: number
  traitFlats: readonly LedgerFlatContribution[]
  traitFlatFromDice?: number
}): DerivedStatResult {
  const terms: AggregateModifierTerm[] = []
  if (input.facadeSdcTotal > 0) {
    pushAggregateTerm(
      terms,
      'facade_baseline',
      'Facade S.D.C.',
      input.facadeSdcTotal,
    )
  }
  for (const trait of input.traitFlats) {
    pushAggregateTerm(terms, 'misc', trait.label, trait.amount)
  }
  if (input.traitFlatFromDice) {
    pushAggregateTerm(terms, 'misc', 'Traits (flat dice)', input.traitFlatFromDice)
  }
  return resolveDerivedStat({
    aggregatedAttribute: 0,
    attrConstant1: 0,
    exceptionalModifier: 0,
    terms,
  })
}

/** Tier-2 flat total from race/OCC sourced formula parts (P.P.E., etc.). */
export function resolveSourcedVitalFormulaFlat(
  sources: ReadonlyArray<{ source: 'race' | 'occ'; formula: string }>,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  attrScores?: Partial<Record<ForgeAttrKey, number>>,
  attrFormLabels?: Partial<Record<ForgeAttrKey, string>>,
): DerivedStatResult {
  const flatTerms = buildSourcedVitalFlatTerms(
    sources,
    assignments,
    attrScores,
    attrFormLabels,
  )
  return resolveVitalFlatFromTerms(flatTerms)
}

export type FacadeAggregateBuildInput = {
  poolRoll: number | null
  flatBreakdown: readonly LedgerFlatContribution[]
  occVariableBonus: number
  enteredSkillDice: readonly LedgerFlatContribution[]
  raceFlat?: number
  misc?: number
  constant?: number
}

/** Build Tier-1 terms for a Facade (primary-form) aggregated attribute. */
export function buildFacadeAggregatedAttributeInput(
  input: FacadeAggregateBuildInput,
): AggregatedAttributeInput {
  const terms: AggregateModifierTerm[] = []
  if (input.poolRoll != null) {
    pushAggregateTerm(terms, 'race_dice', 'Race roll', input.poolRoll)
  }
  if (input.raceFlat) {
    pushAggregateTerm(terms, 'race_flat', 'Race', input.raceFlat)
  }
  for (const item of input.flatBreakdown) {
    const isOcc =
      item.label === 'O.C.C.' || item.label.startsWith('O.C.C.')
    pushAggregateTerm(
      terms,
      isOcc ? 'occ_flat' : 'skill_flat',
      item.label,
      item.amount,
    )
  }
  if (input.occVariableBonus !== 0) {
    pushAggregateTerm(terms, 'occ_dice', 'O.C.C. dice', input.occVariableBonus)
  }
  for (const roll of input.enteredSkillDice) {
    pushAggregateTerm(
      terms,
      'skill_dice',
      roll.label,
      roll.amount,
      roll.notation,
    )
  }
  if (input.misc) {
    pushAggregateTerm(terms, 'misc', 'Misc', input.misc)
  }
  return { terms, constant: input.constant ?? 1 }
}

export type MorphusAggregateBuildInput = {
  facadeAggregated: number
  raceBump: number
  traitDeltas: readonly LedgerFlatContribution[]
  enteredTraitDice?: readonly LedgerFlatContribution[]
  misc?: number
  constant?: number
}

/** Build Tier-1 terms for a Morphus aggregated attribute (Facade baseline + deltas). */
export function buildMorphusAggregatedAttributeInput(
  input: MorphusAggregateBuildInput,
): AggregatedAttributeInput {
  const terms: AggregateModifierTerm[] = []
  pushAggregateTerm(
    terms,
    'facade_baseline',
    'Facade',
    input.facadeAggregated,
  )
  if (input.raceBump !== 0) {
    pushAggregateTerm(terms, 'race_flat', 'Race', input.raceBump)
  }
  for (const delta of input.traitDeltas) {
    pushAggregateTerm(terms, 'misc', delta.label, delta.amount)
  }
  for (const roll of input.enteredTraitDice ?? []) {
    pushAggregateTerm(
      terms,
      'skill_dice',
      roll.label,
      roll.amount,
      roll.notation,
    )
  }
  if (input.misc) {
    pushAggregateTerm(terms, 'misc', 'Misc', input.misc)
  }
  return { terms, constant: input.constant ?? 1 }
}

export function resolveFacadeAggregatedAttribute(
  input: FacadeAggregateBuildInput,
): AggregatedAttributeResult | null {
  const hasPool = input.poolRoll != null
  const hasTerms =
    input.flatBreakdown.some((t) => t.amount !== 0) ||
    input.occVariableBonus !== 0 ||
    (input.enteredSkillDice?.length ?? 0) > 0 ||
    (input.raceFlat ?? 0) !== 0 ||
    (input.misc ?? 0) !== 0
  if (!hasPool && !hasTerms) return null
  return resolveAggregatedAttribute(buildFacadeAggregatedAttributeInput(input))
}

export function resolveMorphusAggregatedAttribute(
  input: MorphusAggregateBuildInput,
): AggregatedAttributeResult {
  return resolveAggregatedAttribute(buildMorphusAggregatedAttributeInput(input))
}

/**
 * Canonical modifier buckets — ledger display mapping for Tier-1 / Tier-2 terms.
 * Every stat uses the same stack; unused buckets default to 0.
 */
export type StatBucket =
  | 'pool'
  | 'exceptional'
  | 'race'
  | 'occ'
  | 'skills'
  | 'hth'
  | 'traits'
  | 'misc'

export type StatStackTerm = {
  bucket: StatBucket
  label: string
  amount: number
  notation?: string
}

export const STAT_STACK_ORDER: readonly StatBucket[] = [
  'pool',
  'exceptional',
  'race',
  'occ',
  'skills',
  'hth',
  'traits',
  'misc',
]

export type CombatStatKey =
  | 'strike'
  | 'parry'
  | 'dodge'
  | 'rollWithImpact'
  | 'pullPunch'
  | 'initiative'
  | 'damage'
  | 'entangle'
  | 'disarm'
  | 'perception'

export type ExceptionalDisplayKey =
  | 'iq_skill'
  | 'iq_perception'
  | 'me_save'
  | 'ma_trust'
  | 'ps_damage'
  | 'pp_combat'
  | 'pe_save'
  | 'pe_coma_death'
  | 'pb_charm'
  | 'pe_save_magic'
  | 'pe_save_poison'
  | 'me_save_insanity'
  | 'me_save_possession'
  | 'me_save_psionics'
  | 'iq_save_illusion'

/** Single entry point — all creation stats resolve through this union. */
export type CreationStatInput =
  | FacadeAttributeStatInput
  | MorphusAttributeModifierStatInput
  | CombatStatInput
  | SaveStatInput
  | ExceptionalStatInput
  | ManeuverStatInput
  | ApmModifierStatInput
  | HorrorFactorFlatStatInput
  | NaturalArmorStatInput

export type FacadeAttributeStatInput = {
  kind: 'facade_attribute'
  flatBreakdown: readonly LedgerFlatContribution[]
  occVariableBonus: number
  enteredSkillDice: readonly LedgerFlatContribution[]
}

export type MorphusAttributeModifierStatInput = {
  kind: 'morphus_attribute_modifiers'
  raceBump: number
  traitDeltas: readonly LedgerFlatContribution[]
}

export type CombatStatInput = {
  kind: 'combat'
  combatKey: CombatStatKey
  attrs: CharacterAttributes
  occ?: PalladiumOcc
  specializationId?: string | null
  occResolutions?: Readonly<Record<string, number>>
  passiveOcc?: number
  morphusRaceBonus?: number
  traitMisc?: number
  traitMiscLabel?: string
  hth?: number
  hthLabel?: string | null
  skillAmount?: number
}

export type SaveStatInput = {
  kind: 'save'
  exceptional?: { label: string; amount: number } | null
  occParts: readonly SaveRollBonusLine[]
  attributionParts: readonly SaveRollBonusLine[]
}

export type ExceptionalStatInput = {
  kind: 'exceptional'
  key: ExceptionalDisplayKey
  attrs: CharacterAttributes
  morphusRollBonuses?: MorphusAttributeRollBonuses
}

export type ManeuverStatInput = {
  kind: 'maneuver'
  maneuver: 'entangle' | 'disarm'
  morphusRaceBonus: number
  traitBonus: number
  hth?: number
  hthLabel?: string | null
}

export type ApmModifierStatInput = {
  kind: 'apm_modifiers'
  hthApm: number
  hthLabel?: string | null
  skillApm: number
  morphusRaceApm: number
  traitApm: number
}

export type HorrorFactorFlatStatInput = {
  kind: 'horror_factor_flat'
  form: 'primary' | 'morphus'
  traitFlatTotal: number
  traitDiceFlat?: number
}

export type NaturalArmorStatInput = {
  kind: 'natural_armor'
  passive: FeatureModifiers
}

export function pushStatTerm(
  terms: StatStackTerm[],
  bucket: StatBucket,
  label: string,
  amount: number,
  notation?: string,
): void {
  if (amount === 0 && !notation?.trim()) return
  terms.push({ bucket, label, amount, notation })
}

export function statStackTotal(terms: readonly StatStackTerm[]): number {
  return terms.reduce((sum, term) => sum + term.amount, 0)
}

export function statStackToLedgerLines(
  terms: readonly StatStackTerm[],
): SaveRollBonusLine[] {
  return terms.map((term) => ({ label: term.label, amount: term.amount }))
}

/** Map aggregate modifier terms to legacy ledger stack buckets for tooltips. */
export function aggregateTermsToStatStack(
  terms: readonly AggregateModifierTerm[],
  exceptional?: { label: string; amount: number },
): StatStackTerm[] {
  const out: StatStackTerm[] = []
  if (exceptional?.amount) {
    pushStatTerm(out, 'exceptional', exceptional.label, exceptional.amount)
  }
  for (const term of terms) {
    const bucket: StatBucket =
      term.kind === 'race_dice' ||
      term.kind === 'race_flat' ||
      term.kind === 'race_per_level'
        ? 'race'
        : term.kind === 'occ_dice' ||
            term.kind === 'occ_flat' ||
            term.kind === 'occ_per_level'
          ? 'occ'
          : term.kind === 'skill_dice' ||
              term.kind === 'skill_flat' ||
              term.kind === 'skill_per_level'
            ? 'skills'
            : 'misc'
    pushStatTerm(out, bucket, term.label, term.amount, term.notation)
  }
  return out
}

/** Authoritative stat stack for any creation-ledger stat. */
export function buildCreationStatStack(input: CreationStatInput): StatStackTerm[] {
  const terms: StatStackTerm[] = []

  switch (input.kind) {
    case 'facade_attribute': {
      for (const item of input.flatBreakdown) {
        const bucket: StatBucket =
          item.label === 'O.C.C.' || item.label.startsWith('O.C.C.')
            ? 'occ'
            : 'skills'
        pushStatTerm(terms, bucket, item.label, item.amount)
      }
      if (input.occVariableBonus !== 0) {
        pushStatTerm(terms, 'occ', 'O.C.C. dice', input.occVariableBonus)
      }
      for (const roll of input.enteredSkillDice) {
        pushStatTerm(terms, 'skills', roll.label, roll.amount, roll.notation)
      }
      break
    }

    case 'morphus_attribute_modifiers': {
      pushStatTerm(terms, 'race', 'Race', input.raceBump)
      for (const delta of input.traitDeltas) {
        pushStatTerm(terms, 'traits', delta.label, delta.amount)
      }
      break
    }

    case 'combat': {
      appendCombatStatTerms(terms, input)
      break
    }

    case 'save': {
      if (input.exceptional?.amount) {
        pushStatTerm(
          terms,
          'exceptional',
          input.exceptional.label,
          input.exceptional.amount,
        )
      }
      for (const part of input.occParts) {
        const bucket: StatBucket = part.label === 'O.C.C.' ? 'occ' : 'misc'
        pushStatTerm(terms, bucket, part.label, part.amount)
      }
      for (const part of input.attributionParts) {
        const bucket: StatBucket =
          part.label === 'Race'
            ? 'race'
            : part.label === 'Traits'
              ? 'traits'
              : part.label === 'O.C.C.'
                ? 'occ'
                : 'misc'
        pushStatTerm(terms, bucket, part.label, part.amount)
      }
      break
    }

    case 'exceptional': {
      appendExceptionalDisplayTerms(terms, input.key, input.attrs, input.morphusRollBonuses)
      break
    }

    case 'maneuver': {
      if (input.hth && input.hthLabel) {
        pushStatTerm(terms, 'hth', input.hthLabel, input.hth)
      }
      pushStatTerm(terms, 'race', 'Race', input.morphusRaceBonus)
      pushStatTerm(terms, 'traits', 'Traits', input.traitBonus)
      break
    }

    case 'apm_modifiers': {
      if (input.hthApm > 0 && input.hthLabel) {
        pushStatTerm(terms, 'hth', input.hthLabel, input.hthApm)
      } else if (input.hthApm > 0) {
        pushStatTerm(terms, 'hth', 'Hand-to-hand', input.hthApm)
      }
      pushStatTerm(terms, 'skills', 'Skills', input.skillApm)
      pushStatTerm(terms, 'race', 'Race', input.morphusRaceApm)
      pushStatTerm(terms, 'traits', 'O.C.C. / features', input.traitApm)
      break
    }

    case 'horror_factor_flat': {
      const base =
        input.form === 'morphus'
          ? DEFAULT_HORROR_FACTOR_BY_FORM.morphus
          : DEFAULT_HORROR_FACTOR_BY_FORM.primary
      pushStatTerm(terms, 'race', 'Race', base)
      pushStatTerm(terms, 'traits', 'Traits', input.traitFlatTotal)
      if (input.traitDiceFlat) {
        pushStatTerm(terms, 'traits', 'Trait dice flats', input.traitDiceFlat)
      }
      break
    }

    case 'natural_armor': {
      const ar = passiveSumKeys(input.passive, [
        'ar',
        'natural_armor',
        'armor_rating',
        'natural_armor_rating',
      ])
      pushStatTerm(terms, 'race', 'Race', ar)
      break
    }
  }

  return terms
}

const COMBAT_OCC_STAT_KEY: Partial<Record<CombatStatKey, string>> = {
  strike: 'strike',
  parry: 'parry',
  dodge: 'dodge',
  rollWithImpact: 'rollWithPunch',
  pullPunch: 'pullPunch',
  initiative: 'initiative',
  damage: 'damage',
}

function aggregatedAttributeForCombatKey(
  attrs: CharacterAttributes,
  combatKey: CombatStatKey,
): number {
  switch (combatKey) {
    case 'strike':
    case 'parry':
    case 'dodge':
    case 'initiative':
      return attrs.pp
    case 'damage':
      return attrs.ps.score
    case 'perception':
      return attrs.iq
    default:
      return 0
  }
}

function buildCombatDerivedStatInput(input: CombatStatInput): DerivedStatInput {
  const terms: AggregateModifierTerm[] = []
  const exceptional = exceptionalCombatBonus(input.attrs, input.combatKey)

  if (input.combatKey === 'perception') {
    const iqPerception = getIqBonuses(input.attrs.iq).perceptionBonus
    if (input.morphusRaceBonus) {
      pushAggregateTerm(terms, 'race_flat', 'Race', input.morphusRaceBonus)
    }
    if (input.traitMisc) {
      pushAggregateTerm(
        terms,
        'misc',
        input.traitMiscLabel ?? 'Features',
        input.traitMisc,
      )
    }
    return {
      aggregatedAttribute: input.attrs.iq,
      attrConstant1: 0,
      exceptionalModifier: iqPerception,
      terms,
    }
  }

  const occStatKey = COMBAT_OCC_STAT_KEY[input.combatKey]
  const occStatic =
    occStatKey && input.occ
      ? occStaticNumericBonus(
          input.occ,
          input.specializationId,
          'combat',
          occStatKey,
          input.occResolutions ?? {},
        )
      : 0
  const occTotal = occStatic + (input.passiveOcc ?? 0)
  if (occTotal) pushAggregateTerm(terms, 'occ_flat', 'OCC', occTotal)
  if (input.morphusRaceBonus) {
    pushAggregateTerm(terms, 'race_flat', 'Race', input.morphusRaceBonus)
  }
  if (input.traitMisc) {
    pushAggregateTerm(
      terms,
      'misc',
      input.traitMiscLabel ?? 'Features',
      input.traitMisc,
    )
  }
  if (input.hth) {
    pushAggregateTerm(terms, 'misc', input.hthLabel ?? 'HtH', input.hth)
  }
  if (
    input.combatKey !== 'initiative' &&
    input.combatKey !== 'damage' &&
    input.skillAmount
  ) {
    pushAggregateTerm(terms, 'skill_flat', 'Skills', input.skillAmount)
  }

  return {
    aggregatedAttribute: aggregatedAttributeForCombatKey(input.attrs, input.combatKey),
    /** Combat bonuses use table lookups from aggregated attrs, not raw attr score. */
    attrConstant1: 0,
    exceptionalModifier: exceptional?.amount ?? 0,
    terms,
  }
}

export function resolveCombatDerivedStat(input: CombatStatInput): DerivedStatResult {
  return resolveDerivedStat(buildCombatDerivedStatInput(input))
}

function appendCombatStatTerms(terms: StatStackTerm[], input: CombatStatInput): void {
  const derivedInput = buildCombatDerivedStatInput(input)
  const exceptional = exceptionalCombatBonus(input.attrs, input.combatKey)
  if (input.combatKey === 'perception') {
    terms.push(
      ...aggregateTermsToStatStack(derivedInput.terms, {
        label: 'I.Q.',
        amount: getIqBonuses(input.attrs.iq).perceptionBonus,
      }),
    )
    return
  }
  terms.push(
    ...aggregateTermsToStatStack(
      derivedInput.terms,
      exceptional ?? undefined,
    ),
  )
}

function exceptionalCombatBonus(
  attrs: CharacterAttributes,
  combatKey: CombatStatKey,
): { label: string; amount: number } | null {
  if (combatKey === 'strike' || combatKey === 'parry' || combatKey === 'dodge') {
    const pp = getPpBonuses(attrs.pp)
    const amount =
      combatKey === 'strike' ? pp.strike : combatKey === 'parry' ? pp.parry : pp.dodge
    return amount ? { label: 'P.P.', amount } : null
  }
  if (combatKey === 'damage') {
    const amount = getPsBonuses(attrs.ps.score).damageBonus
    return amount ? { label: 'P.S.', amount } : null
  }
  if (combatKey === 'initiative') {
    const amount = getPpBonuses(attrs.pp).initiativeSuper
    return amount ? { label: 'P.P. (31+)', amount } : null
  }
  return null
}

function appendExceptionalDisplayTerms(
  terms: StatStackTerm[],
  key: ExceptionalDisplayKey,
  attrs: CharacterAttributes,
  morphusRollBonuses?: MorphusAttributeRollBonuses,
): void {
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const ma = getMaBonuses(attrs.ma)
  const ps = getPsBonuses(attrs.ps.score)
  const pp = getPpBonuses(attrs.pp)
  const pe = getPeBonuses(attrs.pe)
  const pb = getPbBonuses(attrs.pb)

  switch (key) {
    case 'iq_skill':
      pushStatTerm(terms, 'exceptional', 'I.Q.', iq.skillBonusStandard)
      break
    case 'iq_perception':
      pushStatTerm(terms, 'exceptional', 'I.Q.', iq.perceptionStandard)
      break
    case 'me_save':
      pushStatTerm(terms, 'exceptional', 'M.E.', me.saveStandard)
      break
    case 'me_save_insanity':
      pushStatTerm(terms, 'exceptional', 'M.E.', me.saveInsanity)
      break
    case 'me_save_possession':
      pushStatTerm(terms, 'exceptional', 'M.E. (31+)', me.savePossession)
      break
    case 'ma_trust': {
      const amount =
        ma.trustStandard + (morphusRollBonuses?.maTrustIntimidatePercent ?? 0)
      pushStatTerm(terms, 'exceptional', 'M.A.', amount)
      break
    }
    case 'ps_damage':
      pushStatTerm(terms, 'exceptional', 'P.S.', ps.damageBonus)
      break
    case 'pp_combat':
      pushStatTerm(terms, 'exceptional', 'P.P.', pp.combatStandard)
      break
    case 'pe_save':
      pushStatTerm(terms, 'exceptional', 'P.E.', pe.saveStandard)
      break
    case 'pe_coma_death':
      pushStatTerm(terms, 'exceptional', 'P.E.', pe.comaDeathStandard)
      break
    case 'pb_charm': {
      let amount =
        pb.charmStandard + (morphusRollBonuses?.pbCharmImpressPercent ?? 0)
      const pbMin = morphusRollBonuses?.pbCharmImpressMinPercent
      if (pbMin != null) amount = Math.max(amount, pbMin)
      pushStatTerm(terms, 'exceptional', 'P.B.', amount)
      break
    }
    case 'iq_save_illusion':
      pushStatTerm(terms, 'exceptional', 'I.Q. (31+)', iq.saveIllusion)
      break
    case 'pe_save_magic':
      pushStatTerm(terms, 'exceptional', 'P.E.', pe.saveMagic)
      break
    case 'pe_save_poison':
      pushStatTerm(terms, 'exceptional', 'P.E.', pe.savePoison)
      break
    case 'me_save_psionics':
      pushStatTerm(terms, 'exceptional', 'M.E.', me.savePsionics)
      break
  }
}

function passiveSumKeys(passive: FeatureModifiers, keys: readonly string[]): number {
  let total = 0
  for (const key of keys) {
    const value = passive[key]
    if (value != null && value !== 0) total += value
  }
  return total
}

/** Facade aggregated attribute total (Tier 1). */
export function facadeAttributeTotalFromStack(
  poolRoll: number | null,
  terms: readonly StatStackTerm[],
): number | null {
  const flatBreakdown: LedgerFlatContribution[] = []
  let occVariableBonus = 0
  const enteredSkillDice: LedgerFlatContribution[] = []
  for (const term of terms) {
    if (term.label === 'O.C.C. dice') {
      occVariableBonus = term.amount
      continue
    }
    if (term.bucket === 'occ') {
      flatBreakdown.push({ label: term.label, amount: term.amount })
    } else if (term.bucket === 'skills') {
      if (term.notation) {
        enteredSkillDice.push({
          label: term.label,
          amount: term.amount,
          notation: term.notation,
        })
      } else {
        flatBreakdown.push({ label: term.label, amount: term.amount })
      }
    }
  }
  return resolveFacadeAggregatedAttribute({
    poolRoll,
    flatBreakdown,
    occVariableBonus,
    enteredSkillDice,
  })?.total ?? null
}

export function resolveCreationStatTotal(
  input: CreationStatInput,
  opts: { poolRoll?: number | null; facadeBaseline?: number } = {},
): number {
  const stack = buildCreationStatStack(input)
  if (input.kind === 'facade_attribute') {
    return facadeAttributeTotalFromStack(opts.poolRoll ?? null, stack) ?? 0
  }
  if (input.kind === 'morphus_attribute_modifiers') {
    return (opts.facadeBaseline ?? 0) + statStackTotal(stack)
  }
  return statStackTotal(stack)
}

// --- Tooltip formatters ---

export function formatFacadeAttributeStackTooltip(
  poolRoll: number | null,
  flatBreakdown: readonly LedgerFlatContribution[],
  occVariableBonus: number,
  enteredSkillDice: readonly LedgerFlatContribution[] = [],
  pendingRolls = false,
): string | undefined {
  const tooltip = formatAttributeValueTooltip(
    poolRoll,
    flatBreakdown,
    occVariableBonus > 0 ? occVariableBonus : 0,
    enteredSkillDice,
  )
  if (!tooltip && !pendingRolls) return undefined
  if (!tooltip && pendingRolls) return '(+pending rolls)'
  if (pendingRolls) return tooltip!.replace(/\)\s*$/, ', +pending rolls)')
  return tooltip
}

export function formatCombatStatStackTooltip(
  terms: readonly StatStackTerm[],
  skillEntries: readonly { name: string; amount: number }[] = [],
): string | undefined {
  const detailParts: string[] = []
  for (const term of terms) {
    if (term.amount === 0) continue
    if (term.label === 'Skills' && skillEntries.length > 0) {
      for (const entry of skillEntries) {
        detailParts.push(`${entry.name} ${formatBonus(entry.amount)}`)
      }
      continue
    }
    detailParts.push(`${term.label} ${formatBonus(term.amount)}`)
  }
  if (detailParts.length === 0) return undefined
  return `(${detailParts.join(', ')})`
}

export function formatSaveStatStackTooltip(
  terms: readonly StatStackTerm[],
): string | undefined {
  const parts = terms
    .filter((term) => term.amount !== 0)
    .map((term) => `${term.label} ${formatBonus(term.amount)}`)
  if (parts.length === 0) return undefined
  return `(${parts.join(', ')})`
}

export function formatMorphusRelativeStatTooltip(
  facadeTotal: number,
  deltas: readonly LedgerFlatContribution[],
  pendingRolls = false,
): string | undefined {
  const parts: string[] = [`Facade ${facadeTotal}`]
  for (const item of deltas) {
    if (item.amount === 0) continue
    parts.push(`${item.label} ${item.amount >= 0 ? '+' : ''}${item.amount}`)
  }
  if (pendingRolls) parts.push('+pending rolls')
  if (parts.length <= 1 && !pendingRolls) return undefined
  return parts.join(', ')
}

// --- Back-compat aliases (all delegate to buildCreationStatStack) ---

export function buildFacadeAttributeStatStack(input: {
  flatBreakdown: readonly LedgerFlatContribution[]
  occVariableBonus: number
  enteredSkillDice: readonly LedgerFlatContribution[]
  poolRoll?: number | null
}): StatStackTerm[] {
  return buildCreationStatStack({
    kind: 'facade_attribute',
    flatBreakdown: input.flatBreakdown,
    occVariableBonus: input.occVariableBonus,
    enteredSkillDice: input.enteredSkillDice,
  })
}

export type CombatStatStackInput = Omit<CombatStatInput, 'kind'>

export function buildCombatStatStack(input: CombatStatStackInput): StatStackTerm[] {
  return buildCreationStatStack({ kind: 'combat', ...input })
}

export type SaveStatStackInput = Omit<SaveStatInput, 'kind'>

export function buildSaveStatStack(input: SaveStatStackInput): StatStackTerm[] {
  return buildCreationStatStack({ kind: 'save', ...input })
}

export function morphusAttributeModifierStack(
  raceBump: number,
  traitDeltas: readonly LedgerFlatContribution[],
): StatStackTerm[] {
  return buildCreationStatStack({
    kind: 'morphus_attribute_modifiers',
    raceBump,
    traitDeltas,
  })
}

export function morphusAttributeFlatBaseline(
  facadeTotal: number | null,
  raceBump: number,
  traitFlatTotal: number,
): number {
  return resolveMorphusAggregatedAttribute({
    facadeAggregated: facadeTotal ?? 0,
    raceBump,
    traitDeltas:
      traitFlatTotal !== 0 ? [{ label: 'Traits', amount: traitFlatTotal }] : [],
  }).total
}

// --- Pending dice / facade snapshot (creation ledger attributes) ---

export function pendingBlockHasUnresolvedRolls(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): boolean {
  if (!block) return false
  return block.groups.some((group) =>
    group.rolls.some((roll) => {
      const value = resolutions[roll.id]
      return value == null || !Number.isFinite(value)
    }),
  )
}

export type FacadeAttributeSnapshot = {
  poolRoll: number | null
  inlineRaceRoll?: string
  diceGroups: LedgerStatDiceGroup[]
  flatBreakdown: LedgerFlatContribution[]
  variableBonus: number
  enteredDice: LedgerFlatContribution[]
  total: number | null
  valueTooltip: string | undefined
  valueModified: boolean
  hasPendingRolls: boolean
}

export function resolveFacadeAttributeSnapshot(
  attr: ForgeAttrKey,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillIds: readonly string[],
  occVariableResolutions: Readonly<Record<string, number>>,
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>>,
  pendingAttrDiceBreakdown: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>>,
  attrPendingBlock: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): FacadeAttributeSnapshot {
  const bundle = buildForgeAttributeStatBonuses(
    attr,
    race,
    occ,
    specializationId,
    skillIds,
  )
  const poolRoll =
    assignments[attr] != null && Number.isFinite(assignments[attr]!)
      ? assignments[attr]!
      : null
  const variableBonus = occVariableAttributeResolution(
    attr,
    occ,
    specializationId,
    occVariableResolutions,
  )
  const enteredDice = pendingAttrDiceBreakdown[attr] ?? []
  const enteredDiceBonus = pendingAttrBonuses[attr] ?? 0
  const aggregated = resolveFacadeAggregatedAttribute({
    poolRoll,
    flatBreakdown: bundle.flatBreakdown,
    occVariableBonus: variableBonus,
    enteredSkillDice: enteredDice,
  })
  const total = aggregated?.total ?? null
  const hasPendingRolls = pendingBlockHasUnresolvedRolls(attrPendingBlock, resolutions)
  const valueModified =
    (bundle.flatTotal !== 0 || variableBonus !== 0 || enteredDiceBonus !== 0) &&
    total != null

  return {
    poolRoll,
    inlineRaceRoll: bundle.inlineRaceRoll,
    diceGroups: bundle.diceGroups,
    flatBreakdown: bundle.flatBreakdown,
    variableBonus,
    enteredDice,
    total,
    valueTooltip: formatFacadeAttributeStackTooltip(
      poolRoll,
      bundle.flatBreakdown,
      variableBonus,
      enteredDice,
      hasPendingRolls,
    ),
    valueModified,
    hasPendingRolls,
  }
}

export function nightbaneMorphusAttributeBump(attr: ForgeAttrKey): number {
  const bump =
    NIGHTBANE_MORPHUS_BASE_PROFILE.attributeBonuses[
      attr as keyof typeof NIGHTBANE_MORPHUS_BASE_PROFILE.attributeBonuses
    ]
  return typeof bump === 'number' ? bump : 0
}

export function computeMorphusAttributeTotalFromFacade(
  facadeTotal: number | null,
  morphusDeltas: readonly LedgerFlatContribution[],
  enteredTraitDice: number,
  minFloor?: number,
  applyMinFloor = false,
): number | null {
  if (facadeTotal == null) return null
  const raceBump = morphusDeltas.find((d) => d.label === 'Race')?.amount ?? 0
  const traitOnly = morphusDeltas.filter((d) => d.label !== 'Race')
  let total = resolveMorphusAggregatedAttribute({
    facadeAggregated: facadeTotal,
    raceBump,
    traitDeltas: traitOnly,
  }).total + enteredTraitDice
  if (applyMinFloor && minFloor != null) {
    total = Math.max(total, minFloor)
  }
  return total
}

export function computeMorphusAttributeTotalFromBlock(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  minFloor?: number,
  applyMinFloor = false,
): number | null {
  if (!block) return null
  const hasRolls = block.groups.some((group) => group.rolls.length > 0)
  if (block.flatBaseline <= 0 && !hasRolls) return null
  let total = pendingDiceBlockRunningTotal(block, resolutions)
  if (applyMinFloor && minFloor != null) {
    total = Math.max(total, minFloor)
  }
  return total
}

export function facadePendingBlocksByAttr(
  pendingById: Readonly<Record<string, PendingDiceBlock>>,
): Partial<Record<ForgeAttrKey, PendingDiceBlock>> {
  const out: Partial<Record<ForgeAttrKey, PendingDiceBlock>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const block = pendingById[`attr_${attr}`]
    if (block) out[attr] = block
  }
  return out
}

export function morphusPendingBlocksByAttr(
  pendingById: Readonly<Record<string, PendingDiceBlock>>,
): Partial<Record<ForgeAttrKey, PendingDiceBlock>> {
  const out: Partial<Record<ForgeAttrKey, PendingDiceBlock>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const block = pendingById[`morphus_attr_${attr}`]
    if (block) out[attr] = block
  }
  return out
}

/** Combat ledger numeric totals — same stack as ledger rows, HtH + skills only when provided. */
export function resolveCombatLedgerTotals(input: {
  attrs: CharacterAttributes
  skillAmounts: Partial<Record<'strike' | 'parry' | 'dodge' | 'rollWithImpact' | 'pullPunch', number>>
  handToHand?: AccumulatedHandToHandBonuses
  hthLabel?: string | null
  effectivePs?: number
  occ?: PalladiumOcc
  specializationId?: string | null
  occResolutions?: Readonly<Record<string, number>>
  passive?: FeatureModifiers
}): {
  strike: number
  parry: number
  dodge: number
  rollWithPunchFallImpact: number
  pullPunch: number
  handToHandDamage: number
} {
  const hth = input.handToHand
  const hthLabel = input.hthLabel ?? null
  const attrs =
    input.effectivePs != null
      ? { ...input.attrs, ps: { ...input.attrs.ps, score: input.effectivePs } }
      : input.attrs

  const strike = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'strike',
    attrs,
    hth: hth?.strike,
    hthLabel: hth?.strike ? hthLabel ?? 'HtH' : null,
    skillAmount: input.skillAmounts.strike ?? 0,
  }).total
  const parry = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'parry',
    attrs,
    hth: hth?.parry,
    hthLabel: hth?.parry ? hthLabel ?? 'HtH' : null,
    skillAmount: input.skillAmounts.parry ?? 0,
  }).total
  const dodge = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'dodge',
    attrs,
    hth: hth?.dodge,
    hthLabel: hth?.dodge ? hthLabel ?? 'HtH' : null,
    skillAmount: input.skillAmounts.dodge ?? 0,
  }).total
  const rollWithPunchFallImpact = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'rollWithImpact',
    attrs,
    hth: hth?.rollWithPunch,
    hthLabel: hth?.rollWithPunch ? hthLabel ?? 'HtH' : null,
    skillAmount: input.skillAmounts.rollWithImpact ?? 0,
  }).total
  const pullPunch = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'pullPunch',
    attrs,
    hth: hth?.pullPunch,
    hthLabel: hth?.pullPunch ? hthLabel ?? 'HtH' : null,
    skillAmount: input.skillAmounts.pullPunch ?? 0,
  }).total

  const handToHandDamage = resolveCombatDerivedStat({
    kind: 'combat',
    combatKey: 'damage',
    attrs,
    occ: input.occ,
    specializationId: input.specializationId,
    occResolutions: input.occResolutions,
    passiveOcc: input.passive?.bonusHthDamage ?? 0,
    hth: hth?.damage,
    hthLabel: hth?.damage ? 'Hand-to-hand' : null,
  }).total

  return {
    strike,
    parry,
    dodge,
    rollWithPunchFallImpact,
    pullPunch,
    handToHandDamage,
  }
}

export function resolveExceptionalDisplayValue(
  key: ExceptionalDisplayKey,
  attrs: CharacterAttributes,
  morphusRollBonuses?: MorphusAttributeRollBonuses,
): number {
  return statStackTotal(
    buildCreationStatStack({
      kind: 'exceptional',
      key,
      attrs,
      morphusRollBonuses,
    }),
  )
}

export function resolveAllFacadeAggregatedAttributes(
  perAttr: (
    attr: ForgeAttrKey,
  ) => FacadeAggregateBuildInput,
  attrs: readonly ForgeAttrKey[] = FORGE_ATTRIBUTE_KEYS,
): Partial<Record<ForgeAttrKey, number>> {
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const attr of attrs) {
    const result = resolveFacadeAggregatedAttribute(perAttr(attr))
    if (result != null) out[attr] = result.total
  }
  return out
}
