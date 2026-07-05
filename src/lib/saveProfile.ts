import type { ActiveForm, Character, FeatureModifiers, Race } from '../types'
import { aggregateAllPassiveModifiers, listApplyingFeatures } from './featureEngine'
import { getSkillById } from '../data/skillLibrary'
import { racePassiveModifiers } from './raceEngine'
import {
  buildMorphusCreationBasePassiveModifiers,
  MORPHUS_LEDGER_RACE_LABEL,
} from './morphusCreationLedger'
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'
import {
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { SAVING_THROW_REGISTRY } from '../data/constants'
import { computeAttributeSaveProfile, type AttributeSaveEntry } from './attributeSaves'
import {
  buildSaveStatStack,
  resolveExceptionalDisplayValue,
  statStackTotal,
  statStackToLedgerLines,
} from './creationStatEngine'
import {
  buildDisplayAttributesForLiveEngine,
  displayPeMeToAttributes,
  resolveLiveHorrorFactorFlatTotal,
  resolveLiveHorrorFactorRaceBaseline,
  resolveLiveMorphusTraitHorrorFactorFlat,
} from './liveStatEngine'
import {
  formatAdditiveSaveTooltip,
  type SaveRollBonusLine,
} from './saveRollDisplay'

/**
 * Natural save bonus from displayed P.E. / M.E. (production attribute engine).
 */
export function saveAttributeBonusFromDisplayedScore(score: number): number {
  return resolveExceptionalDisplayValue(
    'pe_save_magic',
    displayPeMeToAttributes(score, 0),
  )
}

export function saveMeBonusFromDisplayedScore(score: number): number {
  return resolveExceptionalDisplayValue(
    'me_save_psionics',
    displayPeMeToAttributes(0, score),
  )
}

/** @deprecated Use {@link SaveRollBonusLine} — kept for existing imports. */
export type SaveDeductionLine = SaveRollBonusLine

export type SaveRollEntry = {
  id: string
  sheetLabel: string
  /** GM-called save target (book number). */
  baseTarget: number
  /** Total bonus added to the player’s d20 roll. */
  totalBonus: number
  bonuses: SaveRollBonusLine[]
  tooltipEquation: string
}

export type HorrorFactorProfile = {
  /** `null` when the race / form has no Horror Factor aura (display N/A). */
  total: number | null
  contributions: SaveRollBonusLine[]
  tooltipEquation: string
}

export type SaveProfileDerived = {
  saves: SaveRollEntry[]
  /** Base P.E. / M.E. bonuses and Nightbane Becoming — attribute only, no stacked save modifiers. */
  attributeSaves: AttributeSaveEntry[]
  horrorFactor: HorrorFactorProfile
}

function passiveSumForKeys(passive: Record<string, number>, keys: readonly string[]): number {
  let s = 0
  for (const k of keys) {
    const v = passive[k]
    if (v != null && v !== 0) s += v
  }
  return s
}

/** Per-feature/-skill attribution for modifiers matching registry keys on this row. */
export function saveModifierAttribution(
  keys: readonly string[],
  character: Character,
  activeForm: ActiveForm,
): SaveRollBonusLine[] {
  const out: SaveRollBonusLine[] = []

  const addFromMods = (
    mods: Record<string, number> | undefined,
    sourceLabel: string,
  ): void => {
    if (!mods) return
    let sum = 0
    for (const k of keys) {
      const v = mods[k]
      if (v != null && v !== 0) sum += v
    }
    if (sum !== 0) out.push({ label: sourceLabel, amount: sum })
  }

  for (const feat of listApplyingFeatures(character.selectedAbilities ?? [], activeForm)) {
    addFromMods(feat.modifiers as Record<string, number> | undefined, feat.identity.name)
  }

  const skillIds = new Set<string>([
    ...(character.creationOccSkillIds ?? []),
    ...getCreationRelatedPicks(character).map((p) => p.skillId),
    ...getCreationSecondaryPicks(character).map((p) => p.skillId),
  ])
  for (const sid of skillIds) {
    const sk = getSkillById(sid)
    addFromMods(sk?.modifiers as Record<string, number> | undefined, sk?.name ?? sid)
  }

  return out.sort((a, b) => a.label.localeCompare(b.label))
}

function passiveSumFromMods(
  mods: FeatureModifiers | undefined,
  keys: readonly string[],
): number {
  if (!mods) return 0
  let sum = 0
  for (const k of keys) {
    const v = mods[k]
    if (v != null && v !== 0) sum += v
  }
  return sum
}

/** Explicit Race / Traits / feature / skill attribution for creation-ledger save rows. */
export function creationLedgerSaveModifierAttribution(
  keys: readonly string[],
  character: Character,
  activeForm: ActiveForm,
  opts: { supportsDualForm?: boolean; race?: Race } = {},
): SaveRollBonusLine[] {
  const out: SaveRollBonusLine[] = []

  if (opts.supportsDualForm && activeForm === 'morphus') {
    const mBase = buildMorphusCreationBasePassiveModifiers()
    const mBaseAmt = passiveSumFromMods(mBase, keys)
    if (mBaseAmt !== 0) {
      out.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: mBaseAmt })
    }
    const traits = buildMorphusPassiveBundle(character, 'morphus', {})?.modifiers ?? {}
    const traitAmt = passiveSumFromMods(traits, keys)
    if (traitAmt !== 0) {
      out.push({ label: 'Traits', amount: traitAmt })
    }
    return out.sort((a, b) => a.label.localeCompare(b.label))
  }

  out.push(...saveModifierAttribution(keys, character, activeForm))
  const raceAmt = passiveSumFromMods(racePassiveModifiers(opts.race), keys)
  if (raceAmt !== 0) {
    out.push({ label: 'Race', amount: raceAmt })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** Passive keys that add to the character's Horror Factor aura (not save vs HF). */
const HF_AURA_MODIFIER_KEYS = ['horror_factor'] as const

function horrorFactorMorphusBaseline(
  supportsDualForm: boolean,
  activeForm: ActiveForm,
): number {
  if (supportsDualForm && activeForm === 'morphus') {
    return resolveLiveHorrorFactorRaceBaseline('morphus')
  }
  return resolveLiveHorrorFactorRaceBaseline('primary')
}

/**
 * Horror Factor aura — N/A for most races unless Morphus baseline or explicit `horror_factor` mods apply.
 * `save_horror` / `save_horror_factor` are save bonuses only (Save vs block), not aura.
 */
export function computeHorrorFactorAura(
  character: Character,
  activeForm: ActiveForm,
  passive: FeatureModifiers,
  supportsDualForm: boolean,
  race?: Race,
): HorrorFactorProfile {
  const explicitBase =
    typeof passive.horror_factor_base === 'number' && passive.horror_factor_base > 0
      ? passive.horror_factor_base
      : null
  const traitHf =
    supportsDualForm && activeForm === 'morphus'
      ? resolveLiveMorphusTraitHorrorFactorFlat(character)
      : 0
  const passiveHf = passiveSumForKeys(passive, HF_AURA_MODIFIER_KEYS)
  const morphusBaseline = horrorFactorMorphusBaseline(supportsDualForm, activeForm)
  const baseline = explicitBase ?? morphusBaseline

  const hfContributions = creationLedgerSaveModifierAttribution(
    [...HF_AURA_MODIFIER_KEYS],
    character,
    activeForm,
    { supportsDualForm, race },
  )

  const hasMorphusAura = supportsDualForm && activeForm === 'morphus'
  const hasExplicitAura = explicitBase != null || passiveHf !== 0

  if (!hasMorphusAura && !hasExplicitAura) {
    return { total: null, contributions: [], tooltipEquation: '' }
  }

  const engineFlatTotal = resolveLiveHorrorFactorFlatTotal({
    form: activeForm === 'morphus' ? 'morphus' : 'primary',
    traitFlatTotal: traitHf + passiveHf,
  })
  const total = Math.max(
    0,
    Math.round(explicitBase != null ? baseline + traitHf + passiveHf : engineFlatTotal),
  )
  const baselineLabel =
    supportsDualForm && activeForm === 'morphus'
      ? MORPHUS_LEDGER_RACE_LABEL
      : 'Baseline'
  const baselineLine: SaveRollBonusLine[] =
    baseline > 0 ? [{ label: baselineLabel, amount: baseline }] : []

  return {
    total,
    contributions: [...baselineLine, ...hfContributions],
    tooltipEquation: formatHorrorTooltip(baseline, hfContributions, total),
  }
}

function formatHorrorTooltip(
  baseline: number,
  contributions: SaveRollBonusLine[],
  total: number,
): string {
  const parts: string[] = [`[Baseline: ${baseline}]`]
  for (const c of contributions) {
    parts.push(`+ [${c.label}: ${c.amount}]`)
  }
  parts.push(`= HF ${total}`)
  return parts.join(' ')
}

/**
 * Saving throw targets + Horror Factor for the active form (sheet-first).
 */
export function computeSaveProfile(
  character: Character,
  activeForm: ActiveForm,
  psionicSaveTarget: number,
  supportsDualForm = false,
  characterLevel = character.level ?? 1,
): SaveProfileDerived {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const displayAttrs = buildDisplayAttributesForLiveEngine(
    character,
    activeForm,
    passive,
  )
  const primaryPassive = supportsDualForm
    ? aggregateAllPassiveModifiers(character, 'primary')
    : passive
  const primaryDisplayAttrs = supportsDualForm
    ? buildDisplayAttributesForLiveEngine(character, 'primary', primaryPassive)
    : displayAttrs

  const saves: SaveRollEntry[] = SAVING_THROW_REGISTRY.map((row) => {
    const base = row.usePsionicsTierBase ? psionicSaveTarget : row.baseTarget
    let exceptional: { label: string; amount: number } | null = null

    if (row.appliesPhysicalEnduranceBonus) {
      const amount = resolveExceptionalDisplayValue('pe_save_magic', displayAttrs)
      if (amount !== 0) exceptional = { label: 'P.E. bonus', amount }
    }
    if (row.appliesMentalEnduranceBonus) {
      const key =
        row.id === 'insanity' ? 'me_save_insanity' : 'me_save_psionics'
      const amount = resolveExceptionalDisplayValue(key, displayAttrs)
      if (amount !== 0) exceptional = { label: 'M.E. bonus', amount }
    }

    const attributionParts = creationLedgerSaveModifierAttribution(
      row.featureModifierKeys,
      character,
      activeForm,
      { supportsDualForm },
    )

    const stack = buildSaveStatStack({
      exceptional,
      occParts: [],
      attributionParts,
    })
    const totalBonus = statStackTotal(stack)
    const bonuses = statStackToLedgerLines(stack)

    return {
      id: row.id,
      sheetLabel: row.sheetLabel,
      baseTarget: base,
      totalBonus,
      bonuses,
      tooltipEquation: formatAdditiveSaveTooltip(base, bonuses, totalBonus),
    }
  })

  const horrorFactor = computeHorrorFactorAura(
    character,
    activeForm,
    passive,
    supportsDualForm,
  )

  const attributeSaves = computeAttributeSaveProfile(
    displayAttrs.pe,
    displayAttrs.me,
    characterLevel,
    supportsDualForm,
    { primaryMe: primaryDisplayAttrs.me },
  )

  return { saves, attributeSaves, horrorFactor }
}

