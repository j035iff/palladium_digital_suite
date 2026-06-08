import type { ActiveForm, Character, FeatureModifiers } from '../types'
import { aggregateAllPassiveModifiers, listApplyingFeatures } from './featureEngine'
import { computeDisplayScalars } from './sheetBonuses'
import { getSkillById } from '../data/skillLibrary'
import {
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { DEFAULT_HORROR_FACTOR_BY_FORM, SAVING_THROW_REGISTRY } from '../data/constants'
import { getMeBonuses, getPeBonuses } from './attributeBonuses'

const MIN_EFFECTIVE_SAVE_TARGET = 4

/**
 * Natural save bonus from displayed P.E. / M.E. (production attribute engine).
 */
export function saveAttributeBonusFromDisplayedScore(score: number): number {
  return getPeBonuses(score).saveMagic
}

export function saveMeBonusFromDisplayedScore(score: number): number {
  return getMeBonuses(score).savePsionics
}

export type SaveDeductionLine = {
  label: string
  /** Positive — lowers the threshold you must meet on your roll. */
  amount: number
}

export type SaveRollEntry = {
  id: string
  sheetLabel: string
  baseTarget: number
  totalBonus: number
  effectiveTarget: number
  reductions: SaveDeductionLine[]
  tooltipEquation: string
}

export type HorrorFactorProfile = {
  /** `null` when the race / form has no Horror Factor aura (display N/A). */
  total: number | null
  contributions: SaveDeductionLine[]
  tooltipEquation: string
}

export type SaveProfileDerived = {
  saves: SaveRollEntry[]
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
): SaveDeductionLine[] {
  const out: SaveDeductionLine[] = []

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

function formatSaveTooltip(
  base: number,
  reductions: SaveDeductionLine[],
  effective: number,
): string {
  const parts: string[] = [`[Base: ${base}]`]
  for (const d of reductions) {
    parts.push(`− [${d.label}: ${d.amount}]`)
  }
  parts.push(`= ${effective}+ required`)
  return parts.join(' ')
}

function clampTarget(n: number): number {
  return Math.max(MIN_EFFECTIVE_SAVE_TARGET, Math.round(n))
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

  const hfContributions: SaveDeductionLine[] = [...hfAttr]
  if (hfOrphan !== 0) {
    hfContributions.push({ label: 'Other modifiers', amount: hfOrphan })
  }

  const hasMorphusAura = supportsDualForm && activeForm === 'morphus'
  const hasExplicitAura = explicitBase != null || passiveAura !== 0

  if (!hasMorphusAura && !hasExplicitAura) {
    return { total: null, contributions: [], tooltipEquation: '' }
  }

  const total = Math.max(0, Math.round(baseline + passiveAura))
  const baselineLine: SaveDeductionLine[] =
    baseline > 0 ? [{ label: `${activeForm} baseline`, amount: baseline }] : []

  return {
    total,
    contributions: [...baselineLine, ...hfContributions],
    tooltipEquation: formatHorrorTooltip(baseline, hfContributions, total),
  }
}

function formatHorrorTooltip(
  baseline: number,
  contributions: SaveDeductionLine[],
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
 * Saving throw thresholds + Horror Factor for the active form (sheet-first).
 */
export function computeSaveProfile(
  character: Character,
  activeForm: ActiveForm,
  psionicSaveTarget: number,
  supportsDualForm = false,
): SaveProfileDerived {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const display = computeDisplayScalars(character, activeForm, passive)
  const peSave = getPeBonuses(display.pe).saveMagic
  const meSavePsionics = getMeBonuses(display.me).savePsionics
  const meSaveInsanity = getMeBonuses(display.me).saveInsanity

  const saves: SaveRollEntry[] = SAVING_THROW_REGISTRY.map((row) => {
    const base = row.usePsionicsTierBase ? psionicSaveTarget : row.baseTarget
    const reductions: SaveDeductionLine[] = []

    if (row.appliesPhysicalEnduranceBonus && peSave !== 0) {
      reductions.push({ label: 'P.E. bonus', amount: peSave })
    }
    if (row.appliesMentalEnduranceBonus) {
      const meAmt = row.id === 'insanity' ? meSaveInsanity : meSavePsionics
      if (meAmt !== 0) {
        reductions.push({ label: 'M.E. bonus', amount: meAmt })
      }
    }

    const attrLines = saveModifierAttribution(row.featureModifierKeys, character, activeForm)
    reductions.push(...attrLines)

    const passiveTotal = passiveSumForKeys(passive, row.featureModifierKeys)
    const attributed = attrLines.reduce((s, l) => s + l.amount, 0)
    const orphan = passiveTotal - attributed
    if (orphan !== 0) {
      reductions.push({ label: 'Other modifiers', amount: orphan })
    }

    const totalBonus = reductions.reduce((s, d) => s + d.amount, 0)
    const effectiveTarget = clampTarget(base - totalBonus)

    return {
      id: row.id,
      sheetLabel: row.sheetLabel,
      baseTarget: base,
      totalBonus,
      effectiveTarget,
      reductions,
      tooltipEquation: formatSaveTooltip(base, reductions, effectiveTarget),
    }
  })

  const horrorFactor = computeHorrorFactorAura(
    character,
    activeForm,
    passive,
    supportsDualForm,
  )

  return { saves, horrorFactor }
}
