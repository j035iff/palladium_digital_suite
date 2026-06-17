import type { ActiveForm, Character, Feature, FeatureModifiers, PalladiumOcc } from '../types'
import { getFormState } from '../types'
import {
  aggregateAllPassiveModifiers,
  listApplyingFeatures,
} from './featureEngine'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import { getPpBonuses } from './attributeBonuses'
import { aggregatePhysicalSkillCombatBonuses } from './skillPhysicalBonuses'
import { occStaticNumericBonus } from './creationOccBonuses'
import {
  buildMorphusCreationBasePassiveModifiers,
  MORPHUS_LEDGER_RACE_LABEL,
} from './morphusCreationLedger'
import type { AccumulatedHandToHandBonuses } from '../types'

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

function appendHandToHandLines(
  hth: AccumulatedHandToHandBonuses | undefined,
  skillName: string | null,
  strikeLines: SheetBonusLine[],
  parryLines: SheetBonusLine[],
  dodgeLines: SheetBonusLine[],
  initiativeLines: SheetBonusLine[],
): void {
  if (!hth || !skillName) return
  const label = `HtH (${skillName})`
  if (hth.strike) strikeLines.push({ label, amount: hth.strike })
  if (hth.parry) parryLines.push({ label, amount: hth.parry })
  if (hth.dodge) dodgeLines.push({ label, amount: hth.dodge })
  if (hth.initiative) initiativeLines.push({ label, amount: hth.initiative })
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
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const morphusBase =
    opts?.supportsDualForm && activeForm === 'morphus'
      ? buildMorphusCreationBasePassiveModifiers()
      : {}
  const occResolutions = character.creationOccVariableResolutions ?? {}
  const specId = character.occSpecializationId
  const occ = opts?.occ
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  for (const id of opts?.extraSkillIds ?? []) unlocked.add(id)
  const displayed = computeDisplayScalars(character, activeForm, passive)
  const ppBonus = meleeNaturalBonusFromDisplayedPp(displayed.pp)

  const strikeLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]
  const parryLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]
  const dodgeLines: SheetBonusLine[] = [{ label: 'P.P. natural', amount: ppBonus }]

  const physical = aggregatePhysicalSkillCombatBonuses([...unlocked])
  for (const key of ['strike', 'parry', 'dodge'] as const) {
    const amt = physical.combat[key] ?? 0
    if (!amt) continue
    const names = physical.sources.get(key)?.join(', ') ?? 'Physical skill'
    const line = { label: `Skill (${names})`, amount: amt }
    if (key === 'strike') strikeLines.push(line)
    if (key === 'parry') parryLines.push(line)
    if (key === 'dodge') dodgeLines.push(line)
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

  const appendOccAndBase = (
    lines: SheetBonusLine[],
    occStatKey: string,
    baseAmt: number,
  ) => {
    const occAmt = occ
      ? occStaticNumericBonus(occ, specId, 'combat', occStatKey, occResolutions)
      : 0
    if (occAmt) lines.push({ label: 'O.C.C.', amount: occAmt })
    if (baseAmt) lines.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseAmt })
  }

  appendOccAndBase(strikeLines, 'strike', morphusBase.strike ?? 0)
  appendOccAndBase(parryLines, 'parry', morphusBase.parry ?? 0)
  appendOccAndBase(dodgeLines, 'dodge', morphusBase.dodge ?? 0)

  const peDiv = Math.floor(displayed.pe / 10)
  const spdDiv = Math.floor(displayed.spd / 10)
  const initExtra = passive.initiative ?? 0
  const initiativeLines: SheetBonusLine[] = [
    { label: 'Spd (÷10)', amount: spdDiv },
    { label: 'P.E. (÷10)', amount: peDiv },
  ]
  if (initExtra) initiativeLines.push({ label: 'Passive initiative', amount: initExtra })
  const ppInit = getPpBonuses(displayed.pp).initiative
  if (ppInit) initiativeLines.push({ label: 'P.P. (31+)', amount: ppInit })
  const occInit = occ
    ? occStaticNumericBonus(occ, specId, 'combat', 'initiative', occResolutions)
    : 0
  if (occInit) initiativeLines.push({ label: 'O.C.C.', amount: occInit })
  const baseInit = morphusBase.initiative ?? 0
  if (baseInit) initiativeLines.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseInit })

  appendHandToHandLines(
    handToHand?.accumulated,
    handToHand?.skillName ?? null,
    strikeLines,
    parryLines,
    dodgeLines,
    initiativeLines,
  )

  const strikeTotal = sumLines(strikeLines)
  const parryTotal = sumLines(parryLines)
  const dodgeTotal = sumLines(dodgeLines)

  const rollLines: SheetBonusLine[] = [
    ...dodgeLines.map((l) => ({ ...l, label: `Dodge ← ${l.label}` })),
    { label: 'P.E. (÷10)', amount: peDiv },
  ]
  if (physical.combat.rollWithImpact) {
    const names = physical.sources.get('rollWithImpact')?.join(', ') ?? 'Physical skill'
    rollLines.push({
      label: `Skill (${names})`,
      amount: physical.combat.rollWithImpact,
    })
  }

  const hth = handToHand?.accumulated
  const rollHth = (hth?.rollWithPunch ?? 0) + (hth?.pullPunch ?? 0)
  if (rollHth && handToHand?.skillName) {
    rollLines.push({
      label: `HtH (${handToHand.skillName}) pull / roll`,
      amount: rollHth,
    })
  }
  const occRoll = occ
    ? occStaticNumericBonus(occ, specId, 'combat', 'rollWithPunch', occResolutions)
    : 0
  if (occRoll) rollLines.push({ label: 'O.C.C.', amount: occRoll })
  const baseRoll = morphusBase.rollWithPunch ?? 0
  if (baseRoll) rollLines.push({ label: MORPHUS_LEDGER_RACE_LABEL, amount: baseRoll })

  const initiativeTotal = sumLines(initiativeLines)
  const rollTotal = sumLines(rollLines)

  return {
    strike: { total: strikeTotal, lines: strikeLines },
    parry: { total: parryTotal, lines: parryLines },
    dodge: { total: dodgeTotal, lines: dodgeLines },
    rollWithImpact: { total: rollTotal, lines: rollLines },
    initiative: { total: initiativeTotal, lines: initiativeLines },
  }
}
