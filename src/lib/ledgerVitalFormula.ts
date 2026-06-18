import type { CharacterAttributes, PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { isDiceNotation } from './diceNotationBounds'
import { normalizeDiceDisplay } from './ledgerStatBonuses'
import { getRacePpeNotation } from './raceEngine'
import { dualFormPeHintLabel, FACADE_LABEL } from './creationFormLabels'

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

export type VitalFlatSource = 'race' | 'occ'

export type VitalAttrFlatTerm =
  | {
      kind: 'attr'
      attr: ForgeAttrKey
      label: string
      score: number
      multiplier: number
      amount: number
      formLabel?: string
    }
  | {
      kind: 'flat'
      source: VitalFlatSource
      label: string
      amount: number
    }

export type VitalDiceTooltipTerm =
  | { kind: 'perLevel'; notation: string; amount: number }
  | { kind: 'raceRoll'; notation: string; amount: number }
  | { kind: 'occRoll'; notation: string; amount: number }
  | { kind: 'skillRoll'; label: string; notation: string; amount: number }

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

/** Parse a plain integer flat bonus (e.g. `20`, `+20`) — not dice or attributes. */
export function parseVitalFormulaFlatIntegerTerm(term: string): number | null {
  const compact = term.trim()
  if (parseVitalFormulaAttrTerm(term)) return null
  if (isDiceNotation(compact)) return null
  const matched = /^\+?(\d+)$/.exec(compact)
  if (!matched) return null
  const amount = Number(matched[1])
  return Number.isFinite(amount) && amount > 0 ? amount : null
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
  attrScores?: Partial<Record<ForgeAttrKey, number>>,
): VitalAttrFlatBundle {
  const terms: VitalAttrFlatTerm[] = []
  if (!formula?.trim()) {
    return { flatTotal: 0, terms }
  }

  for (const part of splitFormulaTerms(formula)) {
    const parsed = parseVitalFormulaAttrTerm(part)
    if (parsed) {
      const score =
        attrScores?.[parsed.attr] ?? readAssignedAttrScore(parsed.attr, assignments)
      if (score == null) continue
      const amount = score * parsed.multiplier
      terms.push({
        kind: 'attr',
        attr: parsed.attr,
        label: FORGE_ATTR_LEDGER_LABEL[parsed.attr],
        score,
        multiplier: parsed.multiplier,
        amount,
      })
      continue
    }
    const flatAmount = parseVitalFormulaFlatIntegerTerm(part)
    if (flatAmount != null) {
      terms.push({
        kind: 'flat',
        source: 'race',
        label: 'RaceFlat',
        amount: flatAmount,
      })
    }
  }

  return {
    flatTotal: terms.reduce((sum, term) => sum + term.amount, 0),
    terms,
  }
}

/** Attribute and integer-flat terms from one or more race / O.C.C. formula strings. */
export function buildSourcedVitalFlatTerms(
  sources: ReadonlyArray<{ source: VitalFlatSource; formula: string }>,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  attrScores?: Partial<Record<ForgeAttrKey, number>>,
  attrFormLabels?: Partial<Record<ForgeAttrKey, string>>,
): VitalAttrFlatTerm[] {
  const terms: VitalAttrFlatTerm[] = []
  const seenAttrs = new Set<ForgeAttrKey>()

  for (const { source, formula } of sources) {
    if (!formula.trim()) continue
    const flatLabel = source === 'race' ? 'RaceFlat' : 'OCCFlat'
    for (const part of splitFormulaTerms(formula)) {
      const parsed = parseVitalFormulaAttrTerm(part)
      if (parsed) {
        if (seenAttrs.has(parsed.attr)) continue
        const score =
          attrScores?.[parsed.attr] ?? readAssignedAttrScore(parsed.attr, assignments)
        if (score == null) continue
        seenAttrs.add(parsed.attr)
        const amount = score * parsed.multiplier
        terms.push({
          kind: 'attr',
          attr: parsed.attr,
          label: FORGE_ATTR_LEDGER_LABEL[parsed.attr],
          score,
          multiplier: parsed.multiplier,
          amount,
          formLabel: attrFormLabels?.[parsed.attr],
        })
        continue
      }
      const flatAmount = parseVitalFormulaFlatIntegerTerm(part)
      if (flatAmount != null) {
        terms.push({
          kind: 'flat',
          source,
          label: flatLabel,
          amount: flatAmount,
        })
      }
    }
  }

  return terms
}

function formatVitalFlatTooltipTerm(term: VitalAttrFlatTerm): string {
  if (term.kind === 'flat') {
    return `${term.label} +${term.amount}`
  }
  const abbr = FORGE_ATTR_FORMULA_ABBREV[term.attr]
  if (term.formLabel) {
    return `${abbr}(${term.formLabel}) ${term.score}`
  }
  if (term.multiplier > 1) {
    return `${abbr}(${term.score}) × ${term.multiplier}`
  }
  return `${abbr} ${term.score}`
}

export function formatVitalDiceTooltipTerm(term: VitalDiceTooltipTerm): string {
  const notation = normalizeDiceDisplay(term.notation)
  switch (term.kind) {
    case 'perLevel':
      return `perLevel(${notation}) ${term.amount}`
    case 'raceRoll':
      return `RaceRoll(${notation}) +${term.amount}`
    case 'occRoll':
      return `OCCRoll(${notation}) +${term.amount}`
    case 'skillRoll':
      return `${term.label}(${notation}) +${term.amount}`
  }
}

export function formatVitalLedgerTooltip(
  flatTerms: readonly VitalAttrFlatTerm[],
  diceTerms: readonly VitalDiceTooltipTerm[] = [],
  skillFlats: readonly { label: string; amount: number }[] = [],
): string | undefined {
  const attrParts = flatTerms
    .filter((term): term is Extract<VitalAttrFlatTerm, { kind: 'attr' }> => term.kind === 'attr')
    .map((term) => formatVitalFlatTooltipTerm(term))
  const raceFlatParts = flatTerms
    .filter(
      (term): term is Extract<VitalAttrFlatTerm, { kind: 'flat' }> =>
        term.kind === 'flat' && term.source === 'race',
    )
    .map((term) => formatVitalFlatTooltipTerm(term))
  const occFlatParts = flatTerms
    .filter(
      (term): term is Extract<VitalAttrFlatTerm, { kind: 'flat' }> =>
        term.kind === 'flat' && term.source === 'occ',
    )
    .map((term) => formatVitalFlatTooltipTerm(term))
  const raceRollParts = diceTerms
    .filter((term) => term.kind === 'raceRoll')
    .map((term) => formatVitalDiceTooltipTerm(term))
  const occRollParts = diceTerms
    .filter((term) => term.kind === 'occRoll')
    .map((term) => formatVitalDiceTooltipTerm(term))
  const skillRollParts = diceTerms
    .filter((term) => term.kind === 'skillRoll')
    .map((term) => formatVitalDiceTooltipTerm(term))
  const perLevelParts = diceTerms
    .filter((term) => term.kind === 'perLevel')
    .map((term) => formatVitalDiceTooltipTerm(term))
  const skillFlatParts = skillFlats.map((term) => `${term.label} +${term.amount}`)

  const parts = [
    ...attrParts,
    ...raceRollParts,
    ...raceFlatParts,
    ...occRollParts,
    ...occFlatParts,
    ...skillRollParts,
    ...skillFlatParts,
    ...perLevelParts,
  ]
  if (parts.length === 0) return undefined
  return `(${parts.join(', ')})`
}

/** Morphus S.D.C. = Facade total + Morphus race roll + trait flats/dice. */
export function formatMorphusSdcValueTooltip(
  facadeSdc: number,
  diceTerms: readonly VitalDiceTooltipTerm[],
  traitFlats: readonly { label: string; amount: number }[] = [],
): string | undefined {
  const parts: string[] = []
  if (facadeSdc > 0) parts.push(`${FACADE_LABEL} ${facadeSdc}`)
  for (const term of diceTerms) {
    if (term.kind === 'raceRoll' || term.kind === 'skillRoll') {
      parts.push(formatVitalDiceTooltipTerm(term))
    }
  }
  for (const flat of traitFlats) {
    if (flat.amount !== 0) {
      parts.push(flat.amount > 0 ? `+${flat.amount}` : String(flat.amount))
    }
  }
  if (parts.length === 0) return undefined
  return `(${parts.join(', ')})`
}

export function formatVitalAttrFlatTooltip(
  terms: readonly VitalAttrFlatTerm[],
): string | undefined {
  return formatVitalLedgerTooltip(terms)
}

/** Ledger hint row — compact attr notation for multipliers (e.g. `MEx3 + 5D6`). */
export function formatVitalFormulaLedgerHint(
  formula: string,
  perLevelFormula?: string,
  attrFormLabels?: Partial<Record<ForgeAttrKey, string>>,
): string {
  const parts = splitFormulaTerms(formula).map((term) => {
    const parsed = parseVitalFormulaAttrTerm(term)
    if (parsed) {
      const abbr = FORGE_ATTR_FORMULA_ABBREV[parsed.attr]
      const formLabel = attrFormLabels?.[parsed.attr]
      if (formLabel) {
        return parsed.multiplier > 1
          ? `${abbr} (${formLabel})x${parsed.multiplier}`
          : `${abbr} (${formLabel})`
      }
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
  flatTerms?: VitalAttrFlatTerm[]
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
    attrScores?: Partial<Record<ForgeAttrKey, number>>
    /** Dual-form: label attribute terms in the hint (e.g. PE → `PE (Facade)`). */
    attrFormLabels?: Partial<Record<ForgeAttrKey, string>>
    /** Split race / O.C.C. formulas for flat-term attribution in tooltips. */
    formulaSources?: Partial<Record<VitalFlatSource, string | null | undefined>>
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

  const sourcedTerms = opts?.formulaSources
    ? buildSourcedVitalFlatTerms(
        (
          [
            opts.formulaSources.race
              ? { source: 'race' as const, formula: opts.formulaSources.race }
              : null,
            opts.formulaSources.occ
              ? { source: 'occ' as const, formula: opts.formulaSources.occ }
              : null,
          ] as const
        ).filter(
          (entry): entry is { source: VitalFlatSource; formula: string } =>
            entry != null && entry.formula.trim().length > 0,
        ),
        assignments,
        opts.attrScores,
        opts.attrFormLabels,
      )
    : buildVitalAttrFlatBundle(formula, assignments, opts?.attrScores).terms.map(
        (term) =>
          term.kind === 'attr'
            ? { ...term, formLabel: opts?.attrFormLabels?.[term.attr] }
            : term,
      )
  const flatTotal = sourcedTerms.reduce((sum, term) => sum + term.amount, 0)
  const hint =
    opts?.hintOverride ??
    formatVitalFormulaLedgerHint(
      formula,
      opts?.perLevelFormula,
      opts?.attrFormLabels,
    )

  return {
    value: vitalLedgerValueFromFlat(flatTotal),
    valueModified: flatTotal > 0,
    valueTooltip: formatVitalAttrFlatTooltip(sourcedTerms),
    flatTerms: sourcedTerms,
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

/**
 * Race H.P. formulas (e.g. `PE + 1D6`) treat dice as per-level rolls at creation —
 * level 1's die is entered on Tab 5 (Roll Pending), not as a one-shot race roll.
 */
export function hitPointsPerLevelDiceFormula(hpFormula: string | null | undefined): string | null {
  if (!hpFormula?.trim()) return null
  const dice = diceTermsFromAttrFormula(hpFormula)
  if (dice.length === 0) return null
  if (dice.length === 1) return dice[0]!.notation
  return dice.map((term) => normalizeDiceDisplay(term.notation)).join(' + ')
}

export function resolvePpeCreationFormula(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string | null {
  const parts = resolvePpeFormulaParts(race, occ)
  const merged: string[] = []
  if (parts.race?.trim()) merged.push(parts.race.trim())
  if (parts.occ?.trim()) merged.push(parts.occ.trim())
  return merged.length > 0 ? merged.join(' + ') : null
}

export function resolvePpeFormulaParts(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): { race?: string; occ?: string } {
  const raw = race ? getRacePpeNotation(race) : undefined
  let racePart: string | undefined
  if (raw != null) {
    const text = typeof raw === 'number' ? String(raw) : String(raw).trim()
    if (text.length > 0) racePart = text
  }
  const occPart = occ?.ppeEngine?.baseFormula?.trim() || undefined
  return { race: racePart, occ: occPart }
}

/** Dual-form P.P.E. always derives from Facade P.E. — label and score overrides for the ledger. */
export function dualFormPpeLedgerFormulaOpts(primaryPe: number | null | undefined): {
  attrFormLabels: Partial<Record<ForgeAttrKey, string>>
  attrScores?: Partial<Record<ForgeAttrKey, number>>
} {
  const opts: {
    attrFormLabels: Partial<Record<ForgeAttrKey, string>>
    attrScores?: Partial<Record<ForgeAttrKey, number>>
  } = { attrFormLabels: { pe: dualFormPeHintLabel() } }
  if (primaryPe != null && Number.isFinite(primaryPe)) {
    opts.attrScores = { pe: primaryPe }
  }
  return opts
}
