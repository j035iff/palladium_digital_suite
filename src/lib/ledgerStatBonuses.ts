import type { ForgeAttrKey } from './attributeKeys'
import type { PalladiumOcc, Race } from '../types'
import type { VitalAttrFlatTerm } from './ledgerVitalFormula'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { calculateBaseSdc } from '../utils/vitalsCalculator'
import { resolveSdcFlatDerivedStat } from './creationStatEngine'
import { occFlatVitalBonus, occStaticDiceNotation } from './creationOccBonuses'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { isDiceNotation } from './diceNotationBounds'
import { normalizeDiceDisplay } from './diceNotation'
import { physicalDiceContributions } from './creationPhysicalDice'
import { raceAttrNotation } from './creationAttributeSync'

export { normalizeDiceDisplay } from './diceNotation'
export type LedgerDiceContribution = {
  notation: string
  label: string
}

export type LedgerStatDiceGroup = {
  kind: 'race' | 'occ' | 'skills' | 'traits'
  display: string
  tooltip: string
}

export type LedgerFlatContribution = {
  label: string
  amount: number
  /** Spawn dice notation when this term came from a rolled die (e.g. `1D6`). */
  notation?: string
}

export type LedgerStatBonusBundle = {
  inlineRaceRoll?: string
  diceGroups: LedgerStatDiceGroup[]
  flatTotal: number
  flatBreakdown: LedgerFlatContribution[]
}

const GROUP_LABEL: Record<LedgerStatDiceGroup['kind'], string> = {
  race: 'Race',
  occ: 'OCC',
  skills: 'Skills',
  traits: 'Traits',
}

export function ledgerDiceGroupRowLabel(kind: LedgerStatDiceGroup['kind']): string {
  return GROUP_LABEL[kind]
}

function dieFacesSortKey(notation: string): number {
  const norm = notation.trim().toUpperCase()
  const m = /^(\d+)D(\d+)/.exec(norm)
  if (m) return Number(m[2])
  return 0
}

function sortContributionsForTooltip(
  items: readonly LedgerDiceContribution[],
): LedgerDiceContribution[] {
  return [...items].sort((a, b) => {
    const faceDiff = dieFacesSortKey(b.notation) - dieFacesSortKey(a.notation)
    if (faceDiff !== 0) return faceDiff
    return a.label.localeCompare(b.label)
  })
}

/** Combine plain NdM notations (e.g. 1D6 + 4D6 → 5D6); keep multiplied/modified strings separate. */
export function aggregateDiceNotations(notations: readonly string[]): string {
  const counts = new Map<number, number>()
  const specials: string[] = []

  for (const raw of notations) {
    const norm = raw.trim().toUpperCase()
    const simple = /^(\d+)D(\d+)$/i.exec(norm)
    if (simple) {
      const dice = Number(simple[1])
      const faces = Number(simple[2])
      counts.set(faces, (counts.get(faces) ?? 0) + dice)
      continue
    }
    specials.push(normalizeDiceDisplay(raw))
  }

  const parts: string[] = []
  for (const faces of [...counts.keys()].sort((a, b) => b - a)) {
    const count = counts.get(faces)!
    parts.push(`${count}D${faces}`)
  }
  for (const special of specials.sort((a, b) => dieFacesSortKey(b) - dieFacesSortKey(a))) {
    parts.push(special)
  }
  return parts.join(' + ')
}

/** Plain integer vital bases (e.g. Nightbane R.C.C. S.D.C. 30) — not dice notation. */
export function parsePlainIntegerFormula(notation: string): number | null {
  const t = notation.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function buildLedgerDiceGroup(
  kind: LedgerStatDiceGroup['kind'],
  contributions: readonly LedgerDiceContribution[],
): LedgerStatDiceGroup | null {
  if (contributions.length === 0) return null
  const diceOnly = physicalDiceContributions(contributions)
  const forDisplay = kind === 'occ' ? [...diceOnly] : sortContributionsForTooltip(diceOnly)
  const forTooltip =
    kind === 'skills' || kind === 'traits'
      ? sortContributionsForTooltip(diceOnly)
      : [...diceOnly]
  const display =
    kind === 'occ'
      ? forDisplay.map((c) => normalizeDiceDisplay(c.notation)).join('+')
      : aggregateDiceNotations(forDisplay.map((c) => c.notation))
  const tooltip = ledgerDiceGroupTooltip(kind, forTooltip)
  return { kind, display, tooltip }
}

/** Tooltip only when it adds detail beyond the sub-row (`Race: 2D6`, etc.). Skills/traits always break down source. */
export function ledgerDiceGroupTooltip(
  kind: LedgerStatDiceGroup['kind'],
  contributions: readonly LedgerDiceContribution[],
): string {
  if (contributions.length === 0) return ''
  const breakdown = contributions
    .map((c) => `${c.label}: ${normalizeDiceDisplay(c.notation)}`)
    .join(', ')
  const wrapped = `(${breakdown})`

  if (kind === 'skills' || kind === 'traits') {
    return wrapped
  }

  if (contributions.length > 1) {
    return wrapped
  }

  const contribution = contributions[0]!
  const notation = normalizeDiceDisplay(contribution.notation)
  const label = contribution.label.trim()
  const bucketLabel = ledgerDiceGroupRowLabel(kind)

  if (label.toLowerCase() === notation.toLowerCase()) return ''
  if (label.toLowerCase() === bucketLabel.toLowerCase()) return ''
  if (kind === 'occ' && /^occ(\s+bonus)?$/i.test(label)) return ''
  if (kind === 'race' && /^race$/i.test(label)) return ''

  return wrapped
}

export function buildLedgerTraitDiceGroup(
  contributions: readonly LedgerDiceContribution[],
): LedgerStatDiceGroup | null {
  return buildLedgerDiceGroup('traits', contributions)
}

/** Sum numeric physical skill bonuses for one attribute (e.g. Acrobatics +1 P.P.). */
export function skillAttributeFlatBonusTotal(
  attr: ForgeAttrKey,
  skillIds: readonly string[],
): number {
  const key = attr === 'ps' ? 'ps' : attr
  return collectSkillBonuses(key, skillIds).flat.reduce((sum, item) => sum + item.amount, 0)
}

function collectSkillBonuses(
  statKey: string,
  skillIds: readonly string[],
): { dice: LedgerDiceContribution[]; flat: LedgerFlatContribution[] } {
  const dice: LedgerDiceContribution[] = []
  const flat: LedgerFlatContribution[] = []

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const raw = (
      entry as { physicalSkillBonuses?: Record<string, number | string> }
    )?.physicalSkillBonuses?.[statKey]
    if (raw == null) continue
    if (typeof raw === 'number' && raw !== 0) {
      flat.push({ label: name, amount: raw })
    } else if (typeof raw === 'string' && isDiceNotation(raw)) {
      dice.push({ notation: raw, label: name })
    }
  }

  return { dice, flat }
}

function collectOccAttributeDice(
  occ: PalladiumOcc,
  attr: ForgeAttrKey,
  specializationId?: string | null,
): LedgerDiceContribution[] {
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const key = attr === 'ps' ? 'ps' : attr
  const raw = effective.staticBonuses?.attributes?.[key]
  if (typeof raw === 'string' && isDiceNotation(raw)) {
    return [{ notation: raw, label: 'OCC bonus' }]
  }
  return []
}

function collectOccAttributeFlat(
  occ: PalladiumOcc,
  attr: ForgeAttrKey,
  specializationId?: string | null,
): LedgerFlatContribution[] {
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const key = attr === 'ps' ? 'ps' : attr
  const raw = effective.staticBonuses?.attributes?.[key]
  if (typeof raw === 'number' && raw !== 0) {
    return [{ label: 'O.C.C.', amount: raw }]
  }
  return []
}

export function buildForgeAttributeStatBonusDetails(
  attr: ForgeAttrKey,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillIds: readonly string[],
): {
  flatTotal: number
  flatBreakdown: LedgerFlatContribution[]
  diceGroups: LedgerStatDiceGroupDetail[]
} {
  const key = attr === 'ps' ? 'ps' : attr
  const skill = collectSkillBonuses(key, skillIds)
  const occDice = occ?.id?.trim() ? collectOccAttributeDice(occ, attr, specializationId) : []
  const occFlat = occ?.id?.trim() ? collectOccAttributeFlat(occ, attr, specializationId) : []

  const diceGroups: LedgerStatDiceGroupDetail[] = []
  const occGroup = buildLedgerDiceGroup('occ', occDice)
  if (occGroup) {
    diceGroups.push({ ...occGroup, contributions: [...occDice] })
  }
  const skillGroup = buildLedgerDiceGroup('skills', skill.dice)
  if (skillGroup) {
    diceGroups.push({ ...skillGroup, contributions: [...skill.dice] })
  }

  const flatBreakdown = [...occFlat, ...skill.flat]
  const flatTotal = flatBreakdown.reduce((s, f) => s + f.amount, 0)

  return { flatTotal, flatBreakdown, diceGroups }
}

export function buildForgeAttributeStatBonuses(
  attr: ForgeAttrKey,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillIds: readonly string[],
): LedgerStatBonusBundle {
  const details = buildForgeAttributeStatBonusDetails(
    attr,
    occ,
    specializationId,
    skillIds,
  )

  return {
    inlineRaceRoll: race ? raceAttrNotation(race.attributes, attr) : undefined,
    diceGroups: details.diceGroups.map(({ kind, display, tooltip }) => ({
      kind,
      display,
      tooltip,
    })),
    flatTotal: details.flatTotal,
    flatBreakdown: details.flatBreakdown,
  }
}

export function buildSdcStatBonuses(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillIds: readonly string[],
  resolutions: Readonly<Record<string, number>>,
): LedgerStatBonusBundle {
  const details = buildSdcStatBonusDetails(
    race,
    occ,
    specializationId,
    skillIds,
    resolutions,
  )
  return {
    diceGroups: details.diceGroups,
    flatTotal: details.flatTotal,
    flatBreakdown: details.flatBreakdown,
  }
}

function formatLedgerTooltipTerm(term: LedgerFlatContribution): string {
  const label = term.notation
    ? `${term.label} (${normalizeDiceDisplay(term.notation)})`
    : term.label
  return `${label} ${term.amount >= 0 ? '+' : ''}${term.amount}`
}

export function formatFlatValueTooltip(
  breakdown: readonly LedgerFlatContribution[],
): string | undefined {
  if (breakdown.length === 0) return undefined
  return `(${breakdown.map((f) => formatLedgerTooltipTerm(f)).join(', ')})`
}

/** Append entered spawn dice (with source labels) to an existing flat tooltip. */
export function appendEnteredRollsToFlatTooltip(
  flatTooltip: string | undefined,
  enteredRolls: readonly LedgerFlatContribution[],
): string | undefined {
  if (enteredRolls.length === 0) return flatTooltip
  const rollText = enteredRolls.map((r) => formatLedgerTooltipTerm(r)).join(', ')
  if (!flatTooltip?.trim()) return `(${rollText})`
  return flatTooltip.replace(/\)\s*$/, `, ${rollText})`)
}

export function formatAttributeValueTooltip(
  poolRoll: number | null,
  flatBreakdown: readonly LedgerFlatContribution[],
  variableBonus = 0,
  enteredDice: readonly LedgerFlatContribution[] = [],
): string | undefined {
  const parts: string[] = []
  if (poolRoll != null) parts.push(`Roll ${poolRoll}`)
  for (const item of flatBreakdown) {
    parts.push(formatLedgerTooltipTerm(item))
  }
  if (variableBonus > 0) parts.push(`O.C.C. dice +${variableBonus}`)
  for (const roll of enteredDice) {
    parts.push(formatLedgerTooltipTerm(roll))
  }
  if (parts.length === 0) return undefined
  return `(${parts.join(', ')})`
}

export type LedgerStatDiceGroupDetail = LedgerStatDiceGroup & {
  contributions: LedgerDiceContribution[]
}

export function buildSdcStatBonusDetails(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillIds: readonly string[],
  resolutions: Readonly<Record<string, number>>,
): {
  flatTotal: number
  flatBreakdown: LedgerFlatContribution[]
  flatVitalTerms: VitalAttrFlatTerm[]
  skillFlats: LedgerFlatContribution[]
  diceGroups: LedgerStatDiceGroupDetail[]
} {
  const skill = collectSkillBonuses('sdc', skillIds)
  const raceDice: LedgerDiceContribution[] = []
  const occDice: LedgerDiceContribution[] = []
  const flatVitalTerms: VitalAttrFlatTerm[] = []

  if (race) {
    const baseSdc = calculateBaseSdc(race, occ)
    const flatBase = parsePlainIntegerFormula(baseSdc)
    const raceDefinesSdc = race.vitals?.sdc != null
    if (flatBase != null) {
      if (raceDefinesSdc) {
        flatVitalTerms.push({
          kind: 'flat',
          source: 'race',
          label: 'RaceFlat',
          amount: flatBase,
        })
      } else {
        flatVitalTerms.push({
          kind: 'flat',
          source: 'occ',
          label: 'OCCFlat',
          amount: flatBase,
        })
      }
    } else if (isDiceNotation(baseSdc)) {
      if (raceDefinesSdc) {
        raceDice.push({ notation: baseSdc, label: 'Race' })
      } else {
        occDice.push({ notation: baseSdc, label: 'OCC' })
      }
    }
  }

  if (race && occ?.id?.trim()) {
    const bonusDice = occStaticDiceNotation(occ, specializationId, 'vitals', 'sdc')
    if (bonusDice) {
      occDice.push({ notation: bonusDice, label: 'OCC bonus' })
    }
    const flat = occFlatVitalBonus(occ, specializationId, 'sdc', resolutions)
    if (flat > 0) {
      flatVitalTerms.push({
        kind: 'flat',
        source: 'occ',
        label: 'OCCFlat',
        amount: flat,
      })
    }
  } else if (occ?.id?.trim()) {
    const bonusDice = occStaticDiceNotation(occ, specializationId, 'vitals', 'sdc')
    if (bonusDice) occDice.push({ notation: bonusDice, label: 'OCC bonus' })
  }

  const diceGroups: LedgerStatDiceGroupDetail[] = []
  const raceGroup = buildLedgerDiceGroup('race', raceDice)
  if (raceGroup) {
    diceGroups.push({ ...raceGroup, contributions: [...raceDice] })
  }
  const occGroup = buildLedgerDiceGroup('occ', occDice)
  if (occGroup) {
    diceGroups.push({ ...occGroup, contributions: [...occDice] })
  }
  const skillGroup = buildLedgerDiceGroup('skills', skill.dice)
  if (skillGroup) {
    diceGroups.push({ ...skillGroup, contributions: [...skill.dice] })
  }

  const flatBreakdown: LedgerFlatContribution[] = [
    ...flatVitalTerms.map((term) => ({
      label: term.label,
      amount: term.amount,
    })),
    ...skill.flat,
  ]
  return {
    flatTotal: resolveSdcFlatDerivedStat({
      flatVitalTerms,
      skillFlats: skill.flat,
    }).total,
    flatBreakdown,
    flatVitalTerms,
    skillFlats: [...skill.flat],
    diceGroups,
  }
}

