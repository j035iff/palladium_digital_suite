import type { CharacterAttributes, PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { isDiceNotation } from './diceNotationBounds'
import { normalizeDiceDisplay } from './ledgerStatBonuses'
import { getRacePpeNotation } from './raceEngine'

const UNASSIGNED = '—'

const FORMULA_ATTR_TO_FORGE: Record<string, ForgeAttrKey> = {
  IQ: 'iq',
  ME: 'me',
  MA: 'ma',
  PS: 'ps',
  PP: 'pp',
  PE: 'pe',
  PB: 'pb',
  SPD: 'spd',
}

const FORGE_ATTR_LEDGER_LABEL: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

const FORGE_ATTR_FORMULA_ABBREV: Record<ForgeAttrKey, string> = {
  iq: 'IQ',
  me: 'ME',
  ma: 'MA',
  ps: 'PS',
  pp: 'PP',
  pe: 'PE',
  pb: 'PB',
  spd: 'Spd',
}

export type VitalAttrFlatTerm = {
  attr: ForgeAttrKey
  label: string
  score: number
  multiplier: number
  amount: number
}

export type VitalAttrFlatBundle = {
  flatTotal: number
  terms: VitalAttrFlatTerm[]
}

export function splitFormulaTerms(formula: string): string[] {
  return formula
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
}

function forgeKeyFromFormulaToken(token: string): ForgeAttrKey | null {
  const key = FORMULA_ATTR_TO_FORGE[token.toUpperCase()]
  return key ?? null
}

/** Parse one attribute term (e.g. `PE`, `MEx3`, `ME * 4`). */
export function parseVitalFormulaAttrTerm(
  term: string,
): { attr: ForgeAttrKey; multiplier: number } | null {
  const compact = term.trim().toUpperCase().replace(/\s+/g, '')
  const multiplied = /^(IQ|ME|MA|PS|PP|PE|PB|SPD)[X×*](\d+)$/.exec(compact)
  if (multiplied) {
    const attr = forgeKeyFromFormulaToken(multiplied[1]!)
    const multiplier = Number(multiplied[2])
    if (attr && Number.isFinite(multiplier) && multiplier > 0) {
      return { attr, multiplier }
    }
    return null
  }
  const simple = /^(IQ|ME|MA|PS|PP|PE|PB|SPD)$/.exec(compact)
  if (simple) {
    const attr = forgeKeyFromFormulaToken(simple[1]!)
    return attr ? { attr, multiplier: 1 } : null
  }
  return null
}

function readAssignedAttrScore(
  attr: ForgeAttrKey,
  assignments: Partial<Record<ForgeAttrKey, number>>,
): number | null {
  const assigned = assignments[attr]
  return assigned != null && Number.isFinite(assigned) ? assigned : null
}

/** Sum attribute contributions from a vital formula when pool rolls are assigned. */
export function buildVitalAttrFlatBundle(
  formula: string | undefined,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  _attrs?: CharacterAttributes,
): VitalAttrFlatBundle {
  const terms: VitalAttrFlatTerm[] = []
  if (!formula?.trim()) {
    return { flatTotal: 0, terms }
  }

  for (const part of splitFormulaTerms(formula)) {
    const parsed = parseVitalFormulaAttrTerm(part)
    if (!parsed) continue
    const score = readAssignedAttrScore(parsed.attr, assignments)
    if (score == null) continue
    const amount = score * parsed.multiplier
    terms.push({
      attr: parsed.attr,
      label: FORGE_ATTR_LEDGER_LABEL[parsed.attr],
      score,
      multiplier: parsed.multiplier,
      amount,
    })
  }

  return {
    flatTotal: terms.reduce((sum, term) => sum + term.amount, 0),
    terms,
  }
}

export function formatVitalAttrFlatTooltip(
  terms: readonly VitalAttrFlatTerm[],
): string | undefined {
  if (terms.length === 0) return undefined
  return `(${terms
    .map((term) =>
      term.multiplier > 1
        ? `${term.label}(${term.score}) × ${term.multiplier}`
        : `${term.label} +${term.amount}`,
    )
    .join(', ')})`
}

/** Ledger hint row — compact attr notation for multipliers (e.g. `MEx3 + 5D6`). */
export function formatVitalFormulaLedgerHint(
  formula: string,
  perLevelFormula?: string,
): string {
  const parts = splitFormulaTerms(formula).map((term) => {
    const parsed = parseVitalFormulaAttrTerm(term)
    if (parsed) {
      const abbr = FORGE_ATTR_FORMULA_ABBREV[parsed.attr]
      return parsed.multiplier > 1
        ? `${abbr}x${parsed.multiplier}`
        : FORGE_ATTR_LEDGER_LABEL[parsed.attr]
    }
    return normalizeDiceDisplay(term)
  })

  let hint = parts.join(' + ')
  const per = perLevelFormula?.trim()
  if (per) {
    const perDisplay = isDiceNotation(per) ? normalizeDiceDisplay(per) : per
    hint = `${hint} (+${perDisplay}/level)`
  }
  return hint
}

export function resolveIspCreationFormula(
  occ: PalladiumOcc | undefined,
  psychicTier: string,
  showIsp: boolean,
): { base: string; perLevel?: string } | null {
  if (!showIsp) return null
  const engineBase = occ?.ispEngine?.baseFormula?.trim()
  if (engineBase) {
    return {
      base: engineBase,
      perLevel: occ?.ispEngine?.perLevelFormula?.trim(),
    }
  }
  if (psychicTier === 'minor') {
    return { base: 'ME + 2D6', perLevel: '1D6' }
  }
  if (psychicTier === 'major') {
    return { base: 'ME + 4D6', perLevel: '1D6+1' }
  }
  if (psychicTier === 'master') {
    return { base: 'ME + 1D6' }
  }
  return null
}

export function vitalLedgerValueFromFlat(flatTotal: number): string {
  return flatTotal > 0 ? String(flatTotal) : UNASSIGNED
}

export type AttrFormulaLedgerFields = {
  value: string
  valueModified: boolean
  valueTooltip?: string
  hint?: string
}

/**
 * Universal ledger rule: attribute terms in a formula contribute to the green flat
 * value column; dice and other terms stay in the hint row underneath.
 */
export function buildAttrFormulaLedgerFields(
  formula: string | null | undefined,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  opts?: {
    perLevelFormula?: string
    hintOverride?: string
    unassignedValue?: string
  },
): AttrFormulaLedgerFields {
  const unassigned = opts?.unassignedValue ?? UNASSIGNED
  if (!formula?.trim()) {
    return {
      value: unassigned,
      valueModified: false,
      hint: opts?.hintOverride,
    }
  }

  const flat = buildVitalAttrFlatBundle(formula, assignments)
  const hint =
    opts?.hintOverride ??
    formatVitalFormulaLedgerHint(formula, opts?.perLevelFormula)

  return {
    value: vitalLedgerValueFromFlat(flat.flatTotal),
    valueModified: flat.flatTotal > 0,
    valueTooltip: formatVitalAttrFlatTooltip(flat.terms),
    hint,
  }
}

/** Race + O.C.C. P.P.E. formula (e.g. `2D6 + PEx10 + 2D6`). */
/** Non-attribute dice terms from a vital formula (e.g. `2D6`, `1D4*10`). */
export function diceTermsFromAttrFormula(
  formula: string,
): Array<{ notation: string; label: string }> {
  const out: Array<{ notation: string; label: string }> = []
  for (const term of splitFormulaTerms(formula)) {
    if (parseVitalFormulaAttrTerm(term)) continue
    const norm = term.trim()
    if (!norm || !isDiceNotation(norm)) continue
    out.push({
      notation: norm,
      label: normalizeDiceDisplay(norm),
    })
  }
  return out
}

export function resolvePpeCreationFormula(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string | null {
  const parts: string[] = []
  const racePpe = race ? getRacePpeNotation(race) : undefined
  if (racePpe != null && String(racePpe).trim() !== '') {
    parts.push(String(racePpe).trim())
  }
  const occPpe = occ?.ppeEngine?.baseFormula?.trim()
  if (occPpe) parts.push(occPpe)
  return parts.length > 0 ? parts.join(' + ') : null
}
