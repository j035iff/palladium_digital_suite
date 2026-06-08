import type { ForgeAttrKey } from './attributeKeys'
import type { PalladiumOcc, Race } from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { calculateBaseSdc } from '../utils/vitalsCalculator'
import { occFlatVitalBonus, occStaticDiceNotation } from './creationOccBonuses'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { isDiceNotation } from './diceNotationBounds'
import { raceAttrNotation } from './creationAttributeSync'
export type LedgerDiceContribution = {
  notation: string
  label: string
}

export type LedgerStatDiceGroup = {
  kind: 'race' | 'occ' | 'skills'
  display: string
  tooltip: string
}

export type LedgerFlatContribution = {
  label: string
  amount: number
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
}

export function ledgerDiceGroupRowLabel(kind: LedgerStatDiceGroup['kind']): string {
  return GROUP_LABEL[kind]
}

/** Display form: `1D4*10` → `1D4x10`. */
export function normalizeDiceDisplay(notation: string): string {
  return notation.trim().toUpperCase().replace(/\*(\d+)/g, 'x$1')
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

function buildDiceGroup(
  kind: LedgerStatDiceGroup['kind'],
  contributions: readonly LedgerDiceContribution[],
): LedgerStatDiceGroup | null {
  if (contributions.length === 0) return null
  const forDisplay = kind === 'occ' ? [...contributions] : sortContributionsForTooltip(contributions)
  const forTooltip =
    kind === 'skills' ? sortContributionsForTooltip(contributions) : [...contributions]
  const display =
    kind === 'occ'
      ? forDisplay.map((c) => normalizeDiceDisplay(c.notation)).join('+')
      : aggregateDiceNotations(forDisplay.map((c) => c.notation))
  const tooltip = `(${forTooltip.map((c) => `${c.label}: ${normalizeDiceDisplay(c.notation)}`).join(', ')})`
  return { kind, display, tooltip }
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
  const occGroup = buildDiceGroup('occ', occDice)
  if (occGroup) {
    diceGroups.push({ ...occGroup, contributions: [...occDice] })
  }
  const skillGroup = buildDiceGroup('skills', skill.dice)
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

export function formatFlatValueTooltip(
  breakdown: readonly LedgerFlatContribution[],
): string | undefined {
  if (breakdown.length === 0) return undefined
  return `(${breakdown.map((f) => `${f.label} ${f.amount >= 0 ? '+' : ''}${f.amount}`).join(', ')})`
}

export function formatAttributeValueTooltip(
  poolRoll: number | null,
  flatBreakdown: readonly LedgerFlatContribution[],
  variableBonus = 0,
): string | undefined {
  const parts: string[] = []
  if (poolRoll != null) parts.push(`Roll ${poolRoll}`)
  for (const item of flatBreakdown) {
    parts.push(`${item.label} ${item.amount >= 0 ? '+' : ''}${item.amount}`)
  }
  if (variableBonus > 0) parts.push(`O.C.C. dice +${variableBonus}`)
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
  diceGroups: LedgerStatDiceGroupDetail[]
} {
  const skill = collectSkillBonuses('sdc', skillIds)
  const occDice: LedgerDiceContribution[] = []
  const occFlat: LedgerFlatContribution[] = []

  if (race && occ?.id?.trim()) {
    occDice.push({
      notation: calculateBaseSdc(race, occ),
      label: 'Base OCC',
    })
    const bonusDice = occStaticDiceNotation(occ, specializationId, 'vitals', 'sdc')
    if (bonusDice) {
      occDice.push({ notation: bonusDice, label: 'OCC bonus' })
    }
    const flat = occFlatVitalBonus(occ, specializationId, 'sdc', resolutions)
    if (flat > 0) {
      occFlat.push({ label: 'O.C.C.', amount: flat })
    }
  } else if (occ?.id?.trim()) {
    const bonusDice = occStaticDiceNotation(occ, specializationId, 'vitals', 'sdc')
    if (bonusDice) occDice.push({ notation: bonusDice, label: 'OCC bonus' })
  }

  const diceGroups: LedgerStatDiceGroupDetail[] = []
  const occGroup = buildDiceGroup('occ', occDice)
  if (occGroup) {
    diceGroups.push({ ...occGroup, contributions: [...occDice] })
  }
  const skillGroup = buildDiceGroup('skills', skill.dice)
  if (skillGroup) {
    diceGroups.push({ ...skillGroup, contributions: [...skill.dice] })
  }

  const flatBreakdown = [...occFlat, ...skill.flat]
  return {
    flatTotal: flatBreakdown.reduce((sum, item) => sum + item.amount, 0),
    flatBreakdown,
    diceGroups,
  }
}

