import type { ActiveForm, Character, FeatureModifiers } from '../types'
import { aggregateAllPassiveModifiers, listApplyingFeatures } from './featureEngine'
import { computeDisplayScalars } from './sheetBonuses'
import { getSkillById } from '../data/skillLibrary'
import {
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { DEFAULT_HORROR_FACTOR_BY_FORM, SAVING_THROW_REGISTRY } from '../data/constants'
import { computeAttributeSaveProfile, type AttributeSaveEntry } from './attributeSaves'
import { getMeBonuses, getPeBonuses } from './attributeBonuses'
import {
  formatAdditiveSaveTooltip,
  formatSaveRollBonus,
  type SaveRollBonusLine,
} from './saveRollDisplay'

/**
 * Natural save bonus from displayed P.E. / M.E. (production attribute engine).
 */
export function saveAttributeBonusFromDisplayedScore(score: number): number {
  return getPeBonuses(score).saveMagic
}

export function saveMeBonusFromDisplayedScore(score: number): number {
  return getMeBonuses(score).savePsionics
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

/** Passive keys that add to the character's Horror Factor aura (not save vs HF). */
const HF_AURA_MODIFIER_KEYS = ['horror_factor'] as const

function horrorFactorMorphusBaseline(
  supportsDualForm: boolean,
  activeForm: ActiveForm,
): number {
  if (supportsDualForm && activeForm === 'morphus') {
    return DEFAULT_HORROR_FACTOR_BY_FORM.morphus
  }
  return 0
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
): HorrorFactorProfile {
  const explicitBase =
    typeof passive.horror_factor_base === 'number' && passive.horror_factor_base > 0
      ? passive.horror_factor_base
      : null
  const morphusBaseline = horrorFactorMorphusBaseline(supportsDualForm, activeForm)
  const baseline = explicitBase ?? morphusBaseline

  const hfAttr = saveModifierAttribution(
    [...HF_AURA_MODIFIER_KEYS],
    character,
    activeForm,
  )
  const passiveAura = passiveSumForKeys(passive, HF_AURA_MODIFIER_KEYS)
  const hfAttributed = hfAttr.reduce((s, l) => s + l.amount, 0)
  const hfOrphan = passiveAura - hfAttributed

  const hfContributions: SaveRollBonusLine[] = [...hfAttr]
  if (hfOrphan !== 0) {
    hfContributions.push({ label: 'Other modifiers', amount: hfOrphan })
  }

  const hasMorphusAura = supportsDualForm && activeForm === 'morphus'
  const hasExplicitAura = explicitBase != null || passiveAura !== 0

  if (!hasMorphusAura && !hasExplicitAura) {
    return { total: null, contributions: [], tooltipEquation: '' }
  }

  const total = Math.max(0, Math.round(baseline + passiveAura))
  const baselineLine: SaveRollBonusLine[] =
    baseline > 0 ? [{ label: `${activeForm} baseline`, amount: baseline }] : []

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
  const display = computeDisplayScalars(character, activeForm, passive)
  const facadePassive = supportsDualForm
    ? aggregateAllPassiveModifiers(character, 'facade')
    : passive
  const facadeDisplay = supportsDualForm
    ? computeDisplayScalars(character, 'facade', facadePassive)
    : display
  const peSave = getPeBonuses(display.pe).saveMagic
  const meSavePsionics = getMeBonuses(display.me).savePsionics
  const meSaveInsanity = getMeBonuses(display.me).saveInsanity

  const saves: SaveRollEntry[] = SAVING_THROW_REGISTRY.map((row) => {
    const base = row.usePsionicsTierBase ? psionicSaveTarget : row.baseTarget
    const bonuses: SaveRollBonusLine[] = []

    if (row.appliesPhysicalEnduranceBonus && peSave !== 0) {
      bonuses.push({ label: 'P.E. bonus', amount: peSave })
    }
    if (row.appliesMentalEnduranceBonus) {
      const meAmt = row.id === 'insanity' ? meSaveInsanity : meSavePsionics
      if (meAmt !== 0) {
        bonuses.push({ label: 'M.E. bonus', amount: meAmt })
      }
    }

    const attrLines = saveModifierAttribution(row.featureModifierKeys, character, activeForm)
    bonuses.push(...attrLines)

    const passiveTotal = passiveSumForKeys(passive, row.featureModifierKeys)
    const attributed = attrLines.reduce((s, l) => s + l.amount, 0)
    const orphan = passiveTotal - attributed
    if (orphan !== 0) {
      bonuses.push({ label: 'Other modifiers', amount: orphan })
    }

    const totalBonus = bonuses.reduce((s, d) => s + d.amount, 0)

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
    display.pe,
    display.me,
    characterLevel,
    supportsDualForm,
    { facadeMe: facadeDisplay.me },
  )

  return { saves, attributeSaves, horrorFactor }
}
