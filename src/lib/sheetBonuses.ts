import type { ActiveForm, Character, Feature, FeatureModifiers } from '../types'
import { getFormState } from '../types'
import {
  aggregateAllPassiveModifiers,
  listApplyingFeatures,
} from './featureEngine'
import {
  SKILL_MELEE,
  collectUnlockedSkillIds,
} from './combatQuickBonuses'
import { getSkillById } from '../data/skillLibrary'
import { getPpBonuses } from './attributeBonuses'

export type SheetBonusLine = { label: string; amount: number }

export type SheetCombatStatDetails = {
  total: number
  lines: SheetBonusLine[]
}

export type SheetCombatDerived = {
  strike: SheetCombatStatDetails
  parry: SheetCombatStatDetails
  dodge: SheetCombatStatDetails
  rollWithImpact: SheetCombatStatDetails
  initiative: SheetCombatStatDetails
}

/** Human-readable tooltip: "(P.P. natural: +2) + … = +7" */
export function formatSheetBonusEquation(
  detail: SheetCombatStatDetails,
  formatBonusFn: (n: number) => string,
): string {
  const parts = detail.lines.map((l) => `(${l.label}: ${formatBonusFn(l.amount)})`)
  return `${parts.join(' + ')} = ${formatBonusFn(detail.total)}`
}

function sumLines(lines: SheetBonusLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0)
}

/** P.P. → Strike/Parry melee natural; display P.P. includes passive bumps (sheet-first). */
export function meleeNaturalBonusFromDisplayedPp(pp: number): number {
  return getPpBonuses(pp).strike
}

export function getPpMeleeNaturalForActiveForm(
  character: Character,
  activeForm: ActiveForm,
): number {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const d = computeDisplayScalars(character, activeForm, passive)
  return meleeNaturalBonusFromDisplayedPp(d.pp)
}

function featureStrikeLines(features: Feature[], key: 'strike' | 'parry' | 'dodge'): SheetBonusLine[] {
  const out: SheetBonusLine[] = []
  for (const f of features) {
    const m = f.modifiers?.[key]
    if (m == null || m === 0) continue
    out.push({ label: `${f.identity.name} (${key})`, amount: m })
  }
  return out
}

/** Display-only attribute totals = base scalar + passive modifier keys matching sheet attributes. */
export function computeDisplayScalars(
  character: Character,
  activeForm: ActiveForm,
  passive: FeatureModifiers,
): {
  iq: number
  me: number
  ma: number
  pp: number
  pe: number
  pb: number
  spd: number
  psScore: number
} {
  const a = getFormState(character, activeForm).attributes
  return {
    iq: a.iq + (passive.iq ?? 0),
    me: a.me + (passive.me ?? 0),
    ma: a.ma + (passive.ma ?? 0),
    pp: a.pp + (passive.pp ?? 0),
    pe: a.pe + (passive.pe ?? 0),
    pb: a.pb + (passive.pb ?? 0),
    spd: a.spd + (passive.spd ?? 0),
    psScore: a.ps.score + (passive.ps ?? 0),
  }
}

/** Format short attribute delta line from passive modifiers affecting the sheet. */
export function formatPassiveAttributeBonuses(passive: FeatureModifiers): string {
  const pairs: string[] = []
  const ORDER = ['iq', 'me', 'ma', 'pp', 'pe', 'pb', 'spd', 'ps'] as const
  for (const k of ORDER) {
    const v = passive[k]
    if (v == null || v === 0) continue
    pairs.push(`${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`)
  }
  return pairs.join(' · ')
}

export function computeSheetCombatDerived(
  character: Character,
  activeForm: ActiveForm,
): SheetCombatDerived {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  const displayed = computeDisplayScalars(character, activeForm, passive)
  const ppBonus = meleeNaturalBonusFromDisplayedPp(displayed.pp)

  const strikeLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]
  const parryLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]
  const dodgeLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]

  for (const id of unlocked) {
    const row = SKILL_MELEE[id]
    if (!row) continue
    const def = getSkillById(id)
    const nm = def?.name ?? id
    if (row.strike) strikeLines.push({ label: `Skill (${nm})`, amount: row.strike })
    if (row.parry) parryLines.push({ label: `Skill (${nm})`, amount: row.parry })
    if (row.dodge) dodgeLines.push({ label: `Skill (${nm})`, amount: row.dodge })
  }

  const applyingFeatures = listApplyingFeatures(
    character.selectedAbilities ?? [],
    activeForm,
  )
  const featStrikeLines = featureStrikeLines(applyingFeatures, 'strike')
  const featParryLines = featureStrikeLines(applyingFeatures, 'parry')
  const featDodgeLines = featureStrikeLines(applyingFeatures, 'dodge')

  const sumAmt = (ls: SheetBonusLine[]) => ls.reduce((s, x) => s + x.amount, 0)
  const orphanStrike = (passive.strike ?? 0) - sumAmt(featStrikeLines)
  const orphanParry = (passive.parry ?? 0) - sumAmt(featParryLines)
  const orphanDodge = (passive.dodge ?? 0) - sumAmt(featDodgeLines)

  strikeLines.push(...featStrikeLines)
  parryLines.push(...featParryLines)
  dodgeLines.push(...featDodgeLines)
  if (orphanStrike)
    strikeLines.push({ label: 'Skill / other modifiers', amount: orphanStrike })
  if (orphanParry)
    parryLines.push({ label: 'Skill / other modifiers', amount: orphanParry })
  if (orphanDodge)
    dodgeLines.push({ label: 'Skill / other modifiers', amount: orphanDodge })

  const strikeTotal = sumLines(strikeLines)
  const parryTotal = sumLines(parryLines)
  const dodgeTotal = sumLines(dodgeLines)

  const peDiv = Math.floor(displayed.pe / 10)
  const rollLines: SheetBonusLine[] = [
    ...dodgeLines.map((l) => ({ ...l, label: `Dodge ← ${l.label}` })),
    { label: 'P.E. (÷10)', amount: peDiv },
  ]
  /** Avoid double-count: roll is dodge total already + pe divisor */
  const rollTotal = dodgeTotal + peDiv

  const spdDiv = Math.floor(displayed.spd / 10)
  const initExtra = passive.initiative ?? 0
  const initiativeLines: SheetBonusLine[] = [
    { label: 'Spd (÷10)', amount: spdDiv },
    { label: 'P.E. (÷10)', amount: peDiv },
  ]
  if (initExtra) initiativeLines.push({ label: 'Passive initiative', amount: initExtra })
  const initiativeTotal = spdDiv + peDiv + initExtra

  return {
    strike: { total: strikeTotal, lines: strikeLines },
    parry: { total: parryTotal, lines: parryLines },
    dodge: { total: dodgeTotal, lines: dodgeLines },
    rollWithImpact: { total: rollTotal, lines: rollLines },
    initiative: { total: initiativeTotal, lines: initiativeLines },
  }
}
