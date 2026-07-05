import type {
  ActiveForm,
  AccumulatedHandToHandBonuses,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  PalladiumOcc,
} from '../types'
import { getFormState } from '../types'
import { handToHandAttackBonus } from '../utils/combatCalculator'
import {
  buildCombatStatStack,
  buildCreationStatStack,
  resolveExceptionalDisplayValue,
  statStackTotal,
  type CombatStatKey,
  type StatStackTerm,
} from './creationStatEngine'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import { buildMorphusCreationBasePassiveModifiers } from './morphusCreationLedger'
import { aggregateAllPassiveModifiers } from './featureEngine'
import { aggregatePhysicalSkillCombatBonuses } from './skillPhysicalBonuses'
import { getIqBonuses, getPpBonuses } from './attributeBonuses'
import { buildMorphusTraitHorrorFactorDetails } from './morphusCreationLedger'
import { DEFAULT_HORROR_FACTOR_BY_FORM } from '../data/constants'

export type SheetBonusLine = { label: string; amount: number }

export type SheetCombatStatDetails = {
  total: number
  lines: SheetBonusLine[]
}

export type LiveCombatContext = {
  character: Character
  activeForm: ActiveForm
  displayAttrs: CharacterAttributes
  passive: FeatureModifiers
  morphusBase: FeatureModifiers
  skillIds: readonly string[]
  physical: ReturnType<typeof aggregatePhysicalSkillCombatBonuses>
  occ?: PalladiumOcc
  specId: string | null | undefined
  resolutions: Readonly<Record<string, number>>
  handToHand?: {
    skillName: string | null
    accumulated: AccumulatedHandToHandBonuses
  }
  supportsDualForm: boolean
}

/** Display attribute totals for Tier-2 exceptional table lookups (base + passive attr keys). */
export function buildDisplayAttributesForLiveEngine(
  character: Character,
  activeForm: ActiveForm,
  passive: FeatureModifiers,
): CharacterAttributes {
  const base = getFormState(character, activeForm).attributes
  return {
    ...base,
    iq: base.iq + (passive.iq ?? 0),
    me: base.me + (passive.me ?? 0),
    ma: base.ma + (passive.ma ?? 0),
    pp: base.pp + (passive.pp ?? 0),
    pe: base.pe + (passive.pe ?? 0),
    pb: base.pb + (passive.pb ?? 0),
    spd: base.spd + (passive.spd ?? 0),
    ps: { ...base.ps, score: base.ps.score + (passive.ps ?? 0) },
  }
}

export function buildLiveCombatContext(
  character: Character,
  activeForm: ActiveForm,
  opts?: {
    extraSkillIds?: readonly string[]
    occ?: PalladiumOcc
    supportsDualForm?: boolean
    handToHand?: {
      skillName: string | null
      accumulated: AccumulatedHandToHandBonuses
    }
  },
): LiveCombatContext {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const supportsDualForm = opts?.supportsDualForm ?? false
  const morphusBase =
    supportsDualForm && activeForm === 'morphus'
      ? buildMorphusCreationBasePassiveModifiers()
      : {}
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  for (const id of opts?.extraSkillIds ?? []) unlocked.add(id)
  const skillIds = [...unlocked]
  return {
    character,
    activeForm,
    displayAttrs: buildDisplayAttributesForLiveEngine(character, activeForm, passive),
    passive,
    morphusBase,
    skillIds,
    physical: aggregatePhysicalSkillCombatBonuses(skillIds),
    occ: opts?.occ,
    specId: character.occSpecializationId,
    resolutions: character.creationOccVariableResolutions ?? {},
    handToHand: opts?.handToHand,
    supportsDualForm,
  }
}

export function statStackToSheetBonusLines(
  terms: readonly StatStackTerm[],
): SheetBonusLine[] {
  return terms
    .filter((term) => term.amount !== 0)
    .map((term) => ({
      label:
        term.bucket === 'exceptional' && term.label === 'P.P.'
          ? 'P.P. natural'
          : term.label,
      amount: term.amount,
    }))
}

function hthLabelForStat(
  ctx: LiveCombatContext,
  amount: number | undefined,
): string | null {
  if (!amount || !ctx.handToHand?.skillName) return null
  return `HtH (${ctx.handToHand.skillName})`
}

function buildLiveCombatStack(
  ctx: LiveCombatContext,
  combatKey: CombatStatKey,
): StatStackTerm[] {
  const hth = ctx.handToHand?.accumulated
  const hthShort = ctx.handToHand?.skillName ?? null

  if (combatKey === 'initiative') {
    return buildCombatStatStack({
      combatKey: 'initiative',
      attrs: ctx.displayAttrs,
      occ: ctx.occ,
      specializationId: ctx.specId,
      occResolutions: ctx.resolutions,
      morphusRaceBonus: ctx.morphusBase.initiative ?? 0,
      traitMisc: ctx.passive.initiative ?? 0,
      traitMiscLabel: 'Passive initiative',
      hth: hth?.initiative,
      hthLabel:
        hth?.initiative && hthShort ? `HtH (${hthShort})` : null,
    })
  }

  if (combatKey === 'rollWithImpact' || combatKey === 'pullPunch') {
    const hthAmount =
      combatKey === 'rollWithImpact' ? hth?.rollWithPunch : hth?.pullPunch
    return buildCombatStatStack({
      combatKey,
      attrs: ctx.displayAttrs,
      occ: ctx.occ,
      specializationId: ctx.specId,
      occResolutions: ctx.resolutions,
      morphusRaceBonus:
        combatKey === 'rollWithImpact'
          ? (ctx.morphusBase.rollWithPunch ?? 0)
          : 0,
      hth: hthAmount,
      hthLabel: hthAmount && hthShort ? `HtH (${hthShort})` : null,
      skillAmount: ctx.physical.combat[combatKey] ?? 0,
    })
  }

  const meleeKey = combatKey as 'strike' | 'parry' | 'dodge'
  return buildCombatStatStack({
    combatKey: meleeKey,
    attrs: ctx.displayAttrs,
    occ: ctx.occ,
    specializationId: ctx.specId,
    occResolutions: ctx.resolutions,
    passiveOcc: ctx.passive[meleeKey] ?? 0,
    morphusRaceBonus: ctx.morphusBase[meleeKey] ?? 0,
    hth: hth?.[meleeKey],
    hthLabel: hthLabelForStat(ctx, hth?.[meleeKey]),
    skillAmount: ctx.physical.combat[meleeKey] ?? 0,
  })
}

export function resolveLiveCombatStatDetails(
  ctx: LiveCombatContext,
  combatKey: 'strike' | 'parry' | 'dodge' | 'initiative',
): SheetCombatStatDetails {
  const stack = buildLiveCombatStack(ctx, combatKey)
  return {
    total: statStackTotal(stack),
    lines: statStackToSheetBonusLines(stack),
  }
}

/** Roll w/ impact + pull punch — same engine keys as creation ledger (spec §4.5). */
export function resolveLiveRollWithImpactDetails(
  ctx: LiveCombatContext,
): SheetCombatStatDetails {
  const rollStack = buildLiveCombatStack(ctx, 'rollWithImpact')
  const pullStack = buildLiveCombatStack(ctx, 'pullPunch')
  const lines = [
    ...statStackToSheetBonusLines(rollStack),
    ...statStackToSheetBonusLines(pullStack).map((line) => ({
      ...line,
      label: `Pull punch — ${line.label}`,
    })),
  ]
  return {
    total: statStackTotal(rollStack) + statStackTotal(pullStack),
    lines,
  }
}

/** Live-play max APM — `2 + statStackTotal(apm_modifiers)` (matches creation ledger). */
export function resolveLiveCharacterMaxApm(
  character: Character,
  activeForm: ActiveForm,
  supportsDualForm: boolean,
  handToHand: AccumulatedHandToHandBonuses,
  passive: FeatureModifiers,
): number {
  const skillApm =
    aggregatePhysicalSkillCombatBonuses([
      ...collectUnlockedSkillIds(character, activeForm),
    ]).combat.apm ?? 0
  const traitApm = passive.apm ?? 0
  const morphusRaceApm =
    supportsDualForm && activeForm === 'morphus'
      ? (buildMorphusCreationBasePassiveModifiers().apm ?? 0)
      : 0
  const modifierStack = buildCreationStatStack({
    kind: 'apm_modifiers',
    hthApm: handToHandAttackBonus(handToHand),
    hthLabel: 'Hand-to-hand',
    skillApm,
    morphusRaceApm,
    traitApm,
  })
  return 2 + statStackTotal(modifierStack)
}

/** Quick HUD combat totals — full live stack (display attrs + skills + passive). */
export function resolveLiveQuickActionTotals(
  ctx: LiveCombatContext,
): {
  strike: number
  parry: number
  dodge: number
  rollWithImpact: number
} {
  return {
    strike: resolveLiveCombatStatDetails(ctx, 'strike').total,
    parry: resolveLiveCombatStatDetails(ctx, 'parry').total,
    dodge: resolveLiveCombatStatDetails(ctx, 'dodge').total,
    rollWithImpact: resolveLiveRollWithImpactDetails(ctx).total,
  }
}

export function displayPeMeToAttributes(
  displayPe: number,
  displayMe: number,
): CharacterAttributes {
  return {
    iq: 0,
    me: displayMe,
    ma: 0,
    pp: 0,
    pe: displayPe,
    pb: 0,
    spd: 0,
    ps: { score: 0, type: 'normal' },
  }
}

export function resolveLiveAttributeSaveBonus(
  key: 'pe_save' | 'me_save',
  displayAttrs: CharacterAttributes,
): number {
  return resolveExceptionalDisplayValue(key, displayAttrs)
}

/** I.Q. skill % bump from display I.Q. (exceptional table). */
export function resolveLiveIqSkillBonus(
  character: Character,
  activeForm: ActiveForm,
): number {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const attrs = buildDisplayAttributesForLiveEngine(character, activeForm, passive)
  return getIqBonuses(attrs.iq).skillBonus
}

/** P.P. melee natural (exceptional table on display P.P.). */
export function resolveLivePpMeleeNatural(
  character: Character,
  activeForm: ActiveForm,
): number {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const attrs = buildDisplayAttributesForLiveEngine(character, activeForm, passive)
  return getPpBonuses(attrs.pp).strike
}

export type LiveCombatMirrorBonuses = {
  strike: number
  parry: number
  dodge: number
  handToHandDamage: number
}

/** Full live combat mirror — same stack as sheet combat lines. */
export function resolveLiveCombatMirrorBonuses(
  character: Character,
  activeForm: ActiveForm,
  opts?: {
    occ?: PalladiumOcc
    supportsDualForm?: boolean
    handToHand?: {
      skillName: string | null
      accumulated: AccumulatedHandToHandBonuses
    }
  },
): LiveCombatMirrorBonuses {
  const ctx = buildLiveCombatContext(character, activeForm, opts)
  const damageStack = buildCombatStatStack({
    combatKey: 'damage',
    attrs: ctx.displayAttrs,
    occ: ctx.occ,
    specializationId: ctx.specId,
    occResolutions: ctx.resolutions,
    passiveOcc: ctx.passive.bonusHthDamage ?? 0,
    hth: ctx.handToHand?.accumulated.damage,
    hthLabel: ctx.handToHand?.accumulated.damage ? 'Hand-to-hand' : null,
  })
  return {
    strike: resolveLiveCombatStatDetails(ctx, 'strike').total,
    parry: resolveLiveCombatStatDetails(ctx, 'parry').total,
    dodge: resolveLiveCombatStatDetails(ctx, 'dodge').total,
    handToHandDamage: statStackTotal(damageStack),
  }
}

/** Unarmed strike — full engine total aligned with sheet strike. */
export function resolveLiveUnarmedStrikeBreakdown(
  character: Character,
  activeForm: ActiveForm,
  handToHand?: {
    skillName: string | null
    accumulated: AccumulatedHandToHandBonuses
  },
  opts?: { occ?: PalladiumOcc; supportsDualForm?: boolean },
): {
  ppBonus: number
  hthBonus: number
  wpBonus: number
  weaponBonus: number
  total: number
  skillSourceLabel: string | null
} {
  const ctx = buildLiveCombatContext(character, activeForm, {
    ...opts,
    handToHand,
  })
  const strike = resolveLiveCombatStatDetails(ctx, 'strike')
  const ppLine = strike.lines.find(
    (line) => line.label === 'P.P. natural' || line.label === 'P.P.',
  )
  const hthLine = strike.lines.find((line) => line.label.includes('HtH'))
  const ppBonus = ppLine?.amount ?? 0
  const hthBonus = hthLine?.amount ?? 0
  const other = strike.total - ppBonus - hthBonus
  return {
    ppBonus,
    hthBonus,
    wpBonus: 0,
    weaponBonus: other > 0 ? other : 0,
    total: strike.total,
    skillSourceLabel: handToHand?.skillName ?? null,
  }
}

/** Morphus / trait Horror Factor flat total via Tier-2 `horror_factor_flat` stack. */
export function resolveLiveHorrorFactorFlatTotal(input: {
  form: 'primary' | 'morphus'
  traitFlatTotal: number
  traitDiceFlat?: number
}): number {
  return statStackTotal(
    buildCreationStatStack({
      kind: 'horror_factor_flat',
      form: input.form,
      traitFlatTotal: input.traitFlatTotal,
      traitDiceFlat: input.traitDiceFlat,
    }),
  )
}

/** Engine baseline for Morphus HF (race term from stack). */
export function resolveLiveHorrorFactorRaceBaseline(
  form: 'primary' | 'morphus',
): number {
  return form === 'morphus'
    ? DEFAULT_HORROR_FACTOR_BY_FORM.morphus
    : DEFAULT_HORROR_FACTOR_BY_FORM.primary
}

export function resolveLiveMorphusTraitHorrorFactorFlat(
  character: Character,
): number {
  return buildMorphusTraitHorrorFactorDetails(character).flatTotal
}
