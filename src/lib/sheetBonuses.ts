import type { ActiveForm, Character, FeatureModifiers, PalladiumOcc } from '../types'
import { getFormState } from '../types'
import type { AccumulatedHandToHandBonuses } from '../types'
import { resolveLivePpMeleeNatural } from './liveStatEngine'
import { getPpBonuses } from './attributeBonuses'
import {
  buildLiveCombatContext,
  resolveLiveCombatStatDetails,
  resolveLiveRollWithImpactDetails,
  type SheetBonusLine,
  type SheetCombatStatDetails,
} from './liveStatEngine'

export type { SheetBonusLine, SheetCombatStatDetails }

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

/** P.P. → Strike/Parry melee natural; display P.P. includes passive bumps (sheet-first). */
export function meleeNaturalBonusFromDisplayedPp(pp: number): number {
  return getPpBonuses(pp).strike
}

export function getPpMeleeNaturalForActiveForm(
  character: Character,
  activeForm: ActiveForm,
): number {
  return resolveLivePpMeleeNatural(character, activeForm)
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
  handToHand?: {
    skillName: string | null
    accumulated: AccumulatedHandToHandBonuses
  },
  opts?: {
    extraSkillIds?: readonly string[]
    occ?: PalladiumOcc
    supportsDualForm?: boolean
  },
): SheetCombatDerived {
  const ctx = buildLiveCombatContext(character, activeForm, {
    ...opts,
    handToHand,
  })
  return {
    strike: resolveLiveCombatStatDetails(ctx, 'strike'),
    parry: resolveLiveCombatStatDetails(ctx, 'parry'),
    dodge: resolveLiveCombatStatDetails(ctx, 'dodge'),
    rollWithImpact: resolveLiveRollWithImpactDetails(ctx),
    initiative: resolveLiveCombatStatDetails(ctx, 'initiative'),
  }
}
